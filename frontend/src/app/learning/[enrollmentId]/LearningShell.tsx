"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { RequireRole } from "@/components/shared/RequireRole";
import { LessonSkeleton } from "@/components/shared/PageSkeleton";
import { LessonSidebar } from "@/components/learning/LessonSidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { enrollmentApi } from "@/lib/api/enrollment";
import { flattenLessons } from "@/lib/lesson-helpers";
import type { EnrolledCourse, ProgressHeartbeatResponse, VariantItem } from "@/lib/types";

interface LearningContextValue {
  enrollmentId: string;
  enrollment: EnrolledCourse;
  lessons: VariantItem[];
  completedIds: Set<number>;
  /** Lets the lesson page push live progress up to the header/sidebar. */
  reportProgress: (lessonId: number, result: ProgressHeartbeatResponse) => void;
}

const LearningContext = createContext<LearningContextValue | null>(null);

export function useLearning() {
  const value = useContext(LearningContext);
  if (!value) throw new Error("useLearning must be used inside LearningShell");
  return value;
}

/**
 * Persistent chrome for the lesson player. It lives in the enrollment's
 * layout, so the course header and lesson sidebar stay mounted (and keep their
 * scroll position) while moving between lessons; only the lesson column changes.
 */
function ShellContent({ enrollmentId, children }: { enrollmentId: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ lessonId?: string }>();
  const [liveCompleted, setLiveCompleted] = useState<Set<number>>(() => new Set());
  const [livePercentage, setLivePercentage] = useState<number | null>(null);

  // Enrollment ids are numeric; a malformed URL (e.g. /learning/undefined/...)
  // should show "not found" rather than request /course-detail/<id>/NaN/.
  const isValidEnrollmentId = /^\d+$/.test(enrollmentId);

  const enrollmentQuery = useQuery({
    queryKey: ["enrollment", user?.id, enrollmentId],
    queryFn: () => enrollmentApi.courseDetail(user!.id, enrollmentId),
    enabled: !!user && isValidEnrollmentId,
  });

  const enrollment = enrollmentQuery.data;
  const lessons = useMemo(() => (enrollment ? flattenLessons(enrollment) : []), [enrollment]);
  const completedIds = useMemo(() => {
    const ids = new Set(enrollment?.completed_lesson?.map((p) => p.variant_item) || []);
    liveCompleted.forEach((id) => ids.add(id));
    return ids;
  }, [enrollment, liveCompleted]);

  const reportProgress = useCallback((lessonId: number, result: ProgressHeartbeatResponse) => {
    setLivePercentage(result.course_progress_percentage);
    if (result.completed) {
      setLiveCompleted((prev) => (prev.has(lessonId) ? prev : new Set(prev).add(lessonId)));
    }
  }, []);

  const contextValue = useMemo(
    () => (enrollment ? { enrollmentId, enrollment, lessons, completedIds, reportProgress } : null),
    [enrollmentId, enrollment, lessons, completedIds, reportProgress]
  );

  if (enrollmentQuery.isLoading) return <LessonSkeleton />;

  if (!enrollment || !contextValue) {
    return (
      <div className="ui-route-enter flex min-h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
        <p>This course could not be found.</p>
        <Button variant="outline" render={<Link href="/my-courses">Back to My Courses</Link>} />
      </div>
    );
  }

  return (
    <LearningContext.Provider value={contextValue}>
      <div className="flex min-h-screen flex-col">
        <header className="ui-lesson-header">
          <Button variant="ghost" size="icon" aria-label="Back to My Courses" onClick={() => router.push("/my-courses")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate font-semibold">{enrollment.course.title}</p>
            <p className="text-xs text-muted-foreground">National Audit Academy</p>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">{children}</div>
          <div className="ui-lesson-sidebar">
            <LessonSidebar
              enrollmentId={enrollmentId}
              lessons={lessons}
              currentLessonId={params.lessonId ?? ""}
              completedIds={completedIds}
              progressPercentage={livePercentage ?? enrollment.progress_percentage ?? 0}
            />
          </div>
        </div>
      </div>
    </LearningContext.Provider>
  );
}

export function LearningShell({ enrollmentId, children }: { enrollmentId: string; children: React.ReactNode }) {
  return (
    <RequireRole roles={["Student", "Teacher", "Admin", "Academy Admin"]} fallback={<LessonSkeleton />}>
      <ShellContent enrollmentId={enrollmentId}>{children}</ShellContent>
    </RequireRole>
  );
}
