import { CourseCard } from "./CourseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { CardGrid } from "@/components/shared/page";
import type { Course } from "@/lib/types";

export function CourseGrid({
  courses,
  isLoading,
  emptyMessage = "No courses found.",
}: {
  courses: Course[] | undefined;
  isLoading?: boolean;
  emptyMessage?: string;
}) {
  if (isLoading) {
    return (
      <CardGrid>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-80 w-full rounded-xl" />
        ))}
      </CardGrid>
    );
  }

  if (!courses || courses.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <CardGrid>
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </CardGrid>
  );
}
