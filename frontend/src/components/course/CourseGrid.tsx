import { CourseCard } from "./CourseCard";
import { Skeleton } from "@/components/ui/skeleton";
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-80 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}
