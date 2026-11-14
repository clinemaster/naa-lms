import Link from "next/link";
import { MediaCard } from "@/components/shared/cards";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { mediaUrl } from "@/lib/utils";
import { nextLessonFor } from "@/lib/lesson-helpers";
import type { EnrolledCourse } from "@/lib/types";

/** Enrollment card: extends MediaCard with progress and continue/review/certificate actions. */
export function EnrolledCourseCard({ enrollment }: { enrollment: EnrolledCourse }) {
  const course = enrollment.course;
  const totalLessons = course.total_lessons || 0;
  const completedCount = enrollment.completed_lesson?.length || 0;
  const nextLesson = nextLessonFor(enrollment);
  const lessonHref = `/learning/${enrollment.enrolled_course_id}/${nextLesson?.variant_item_id || ""}`;

  return (
    <MediaCard
      image={mediaUrl(course.image)}
      imageAlt={course.title}
      title={course.title}
      contentClassName="gap-3"
      footerClassName="flex flex-col gap-2"
      footer={
        enrollment.is_course_completed ? (
          <>
            <p className="text-sm font-medium text-emerald-600">Course completed</p>
            <Button
              variant={enrollment.certificate ? "outline" : "secondary"}
              className="w-full"
              render={<Link href={lessonHref}>Review Course</Link>}
            />
            {enrollment.certificate && (
              <Button
                variant="secondary"
                className="w-full"
                render={<Link href="/certificates">View/Download Certificate</Link>}
              />
            )}
          </>
        ) : (
          <Button className="w-full" render={<Link href={lessonHref}>Continue Learning</Link>} />
        )
      }
    >
      <p className="ui-card-meta">Teacher: {course.teacher_name || "—"}</p>
      <div className="space-y-1">
        <Progress value={enrollment.progress_percentage} />
        <p className="ui-card-meta">
          {completedCount} / {totalLessons} lessons completed ({enrollment.progress_percentage}%)
        </p>
      </div>
    </MediaCard>
  );
}
