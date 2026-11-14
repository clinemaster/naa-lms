import Link from "next/link";
import { MediaCard } from "@/components/shared/cards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mediaUrl } from "@/lib/utils";
import type { Course } from "@/lib/types";

/** Catalogue card: extends MediaCard with teacher, lesson count, level and a "View Course" link. */
export function CourseCard({ course }: { course: Course }) {
  return (
    <MediaCard
      interactive
      image={mediaUrl(course.image)}
      imageAlt={course.title}
      placeholder="No image"
      title={course.title}
      footer={<Button className="w-full" render={<Link href={`/courses/${course.slug}`}>View Course</Link>} />}
    >
      <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
      <div className="ui-card-meta mt-auto flex flex-col gap-1 pt-2">
        {course.teacher_name && <span>Teacher: {course.teacher_name}</span>}
        <span>{course.total_lessons} Lessons</span>
        {course.level && (
          <Badge className="w-fit" variant="secondary">
            {course.level}
          </Badge>
        )}
      </div>
    </MediaCard>
  );
}
