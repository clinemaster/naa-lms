"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Paperclip } from "lucide-react";
import { VideoPlayer } from "@/components/learning/VideoPlayer";
import { Button } from "@/components/ui/button";
import { LessonContentSkeleton } from "@/components/shared/PageSkeleton";
import { useAuth } from "@/context/AuthContext";
import { progressApi } from "@/lib/api/progress";
import { mediaUrl } from "@/lib/utils";
import type { ProgressHeartbeatResponse } from "@/lib/types";
import { useLearning } from "../LearningShell";

/**
 * The lesson column only. The course header and lesson sidebar come from the
 * enrollment layout (LearningShell) and stay put while this swaps per lesson.
 */
export function LearningClient({ lessonId }: { lessonId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { enrollmentId, lessons, completedIds, reportProgress } = useLearning();

  const accessQuery = useQuery({
    queryKey: ["lesson-access", lessonId],
    queryFn: () => progressApi.getLessonAccess(lessonId),
    enabled: !!user,
  });

  const currentIndex = lessons.findIndex((l) => l.variant_item_id === lessonId);
  const currentLesson = currentIndex >= 0 ? lessons[currentIndex] : undefined;
  const nextLesson = currentIndex >= 0 ? lessons[currentIndex + 1] : undefined;
  const previousLesson = lessons[Math.max(currentIndex - 1, 0)];

  const handleProgress = (result: ProgressHeartbeatResponse) => {
    if (currentLesson) reportProgress(currentLesson.id, result);
    if (result.lesson_newly_completed) {
      toast.success("Lesson completed!");
      queryClient.invalidateQueries({ queryKey: ["enrollment", user?.id, enrollmentId] });
    }
    if (result.course_completed_now) {
      toast.success(
        result.certificate_issued
          ? "Congratulations! You've completed the course. Your certificate is ready."
          : "Congratulations! You've completed the course.",
        { duration: 8000 }
      );
      queryClient.invalidateQueries({ queryKey: ["my-courses"] });
    }
  };

  if (!currentLesson) {
    return (
      <div className="ui-route-enter flex min-h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
        <p>This lesson could not be found.</p>
        <Button variant="outline" render={<Link href="/my-courses">Back to My Courses</Link>} />
      </div>
    );
  }

  if (accessQuery.isLoading) return <LessonContentSkeleton />;

  if (accessQuery.data && !accessQuery.data.unlocked) {
    return (
      <div className="ui-route-enter p-4">
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-lg border bg-muted/30 p-6 text-center text-muted-foreground">
          <p>Complete the previous lesson before you can access this one.</p>
          <Button
            variant="outline"
            render={<Link href={`/learning/${enrollmentId}/${previousLesson?.variant_item_id}`}>Go to previous lesson</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="ui-route-enter flex flex-col gap-4 p-4">
      <VideoPlayer
        lessonId={lessonId}
        startPosition={accessQuery.data?.current_position || 0}
        maxWatchedPosition={accessQuery.data?.max_watched_position || 0}
        onProgress={handleProgress}
      />
      <div>
        <h1 className="text-xl font-semibold">{currentLesson.title}</h1>
        {currentLesson.description && <p className="mt-2 text-sm text-muted-foreground">{currentLesson.description}</p>}
        {currentLesson.materials?.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-sm font-medium">Learning Materials</p>
            {currentLesson.materials.map((material) => (
              <a
                key={material.id}
                href={mediaUrl(material.file)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-primary underline-offset-2 hover:underline"
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                {material.original_filename || "Download material"}
              </a>
            ))}
          </div>
        )}
      </div>
      {completedIds.has(currentLesson.id) && nextLesson && (
        <Button
          className="w-fit"
          render={<Link href={`/learning/${enrollmentId}/${nextLesson.variant_item_id}`}>Next Lesson</Link>}
        />
      )}
    </div>
  );
}
