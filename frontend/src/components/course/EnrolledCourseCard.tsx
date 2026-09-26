import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { mediaUrl } from "@/lib/utils";
import { nextLessonFor } from "@/lib/lesson-helpers";
import type { EnrolledCourse } from "@/lib/types";

export function EnrolledCourseCard({ enrollment }: { enrollment: EnrolledCourse }) {
  const course = enrollment.course;
  const image = mediaUrl(course.image);
  const totalLessons = course.total_lessons || 0;
  const completedCount = enrollment.completed_lesson?.length || 0;
  const nextLesson = nextLessonFor(enrollment);

  return (
    <Card className="flex h-full flex-col overflow-hidden pt-0">
      <div className="relative aspect-video w-full bg-muted">
        {image && <Image src={image} alt={course.title} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />}
      </div>
      <CardContent className="flex flex-1 flex-col gap-3">
        <h3 className="line-clamp-2 font-semibold leading-snug">{course.title}</h3>
        <p className="text-xs text-muted-foreground">Teacher: {course.teacher_name || "—"}</p>
        <div className="space-y-1">
          <Progress value={enrollment.progress_percentage} />
          <p className="text-xs text-muted-foreground">
            {completedCount} / {totalLessons} lessons completed ({enrollment.progress_percentage}%)
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {enrollment.is_course_completed ? (
          <>
            <p className="text-sm font-medium text-emerald-600">Course completed</p>
            <Button
              variant={enrollment.certificate ? "outline" : "secondary"}
              className="w-full"
              render={
                <Link href={`/learning/${enrollment.enrolled_course_id}/${nextLesson?.variant_item_id || ""}`}>
                  Review Course
                </Link>
              }
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
          <Button
            className="w-full"
            render={
              <Link href={`/learning/${enrollment.enrolled_course_id}/${nextLesson?.variant_item_id || ""}`}>
                Continue Learning
              </Link>
            }
          />
        )}
      </CardFooter>
    </Card>
  );
}
