"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Paperclip } from "lucide-react";
import { RequireRole } from "@/components/shared/RequireRole";
import { VideoPlayer } from "@/components/learning/VideoPlayer";
import { LessonSidebar } from "@/components/learning/LessonSidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { enrollmentApi } from "@/lib/api/enrollment";
import { progressApi } from "@/lib/api/progress";
import { flattenLessons } from "@/lib/lesson-helpers";
import { mediaUrl } from "@/lib/utils";
import type { ProgressHeartbeatResponse } from "@/lib/types";

function LearningContent({ enrollmentId, lessonId }: { enrollmentId: string; lessonId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [liveProgress, setLiveProgress] = useState<ProgressHeartbeatResponse | null>(null);

  const enrollmentQuery = useQuery({
    queryKey: ["enrollment", user?.id, enrollmentId],
    queryFn: () => enrollmentApi.courseDetail(user!.id, Number(enrollmentId)),
    enabled: !!user,
  });

  const accessQuery = useQuery({
    queryKey: ["lesson-access", lessonId],
    queryFn: () => progressApi.getLessonAccess(lessonId),
    enabled: !!user,
  });

  const enrollment = enrollmentQuery.data;
  const lessons = useMemo(() => (enrollment ? flattenLessons(enrollment) : []), [enrollment]);
  const currentLesson = lessons.find((l) => l.variant_item_id === lessonId);
  const currentIndex = lessons.findIndex((l) => l.variant_item_id === lessonId);
  const nextLesson = currentIndex >= 0 ? lessons[currentIndex + 1] : undefined;

  const completedIds = new Set(enrollment?.completed_lesson?.map((p) => p.variant_item) || []);
  if (liveProgress?.completed && currentLesson) completedIds.add(currentLesson.id);

  const progressPercentage = liveProgress?.course_progress_percentage ?? enrollment?.progress_percentage ?? 0;

  const handleProgress = (result: ProgressHeartbeatResponse) => {
    setLiveProgress(result);
    if (result.lesson_newly_completed) {
      toast.success("Lesson completed!");
      queryClient.invalidateQueries({ queryKey: ["enrollment", user?.id, enrollmentId] });
    }
    if (result.course_completed_now) {
      toast.success("Congratulations! You've completed the course. Your certificate is ready.", {
        duration: 8000,
      });
      queryClient.invalidateQueries({ queryKey: ["my-courses"] });
    }
  };

  if (enrollmentQuery.isLoading || accessQuery.isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">Loading lesson…</div>;
  }

  if (!enrollment || !currentLesson) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
        <p>This lesson could not be found.</p>
        <Button variant="outline" render={<Link href="/my-courses">Back to My Courses</Link>} />
      </div>
    );
  }

  if (accessQuery.data && !accessQuery.data.unlocked) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
        <p>Complete the previous lesson before you can access this one.</p>
        <Button
          variant="outline"
          render={
            <Link href={`/learning/${enrollmentId}/${lessons[Math.max(currentIndex - 1, 0)]?.variant_item_id}`}>
              Go to previous lesson
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/my-courses")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <p className="font-semibold">{enrollment.course.title}</p>
          <p className="text-xs text-muted-foreground">National Audit Academy</p>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4 p-4">
          <VideoPlayer
            lessonId={lessonId}
            startPosition={accessQuery.data?.current_position || 0}
            maxWatchedPosition={accessQuery.data?.max_watched_position || 0}
            onProgress={handleProgress}
          />
          <div>
            <h1 className="text-xl font-semibold">{currentLesson.title}</h1>
            {currentLesson.description && (
              <p className="mt-2 text-sm text-muted-foreground">{currentLesson.description}</p>
            )}
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
          {(liveProgress?.completed || completedIds.has(currentLesson.id)) && nextLesson && (
            <Button
              className="w-fit"
              render={<Link href={`/learning/${enrollmentId}/${nextLesson.variant_item_id}`}>Next Lesson</Link>}
            />
          )}
        </div>

        <LessonSidebar
          enrollmentId={enrollmentId}
          lessons={lessons}
          currentLessonId={lessonId}
          completedIds={completedIds}
          progressPercentage={progressPercentage}
        />
      </div>
    </div>
  );
}

export function LearningClient({ enrollmentId, lessonId }: { enrollmentId: string; lessonId: string }) {
  return (
    <RequireRole roles={["Student", "Teacher", "Admin"]}>
      <LearningContent enrollmentId={enrollmentId} lessonId={lessonId} />
    </RequireRole>
  );
}
