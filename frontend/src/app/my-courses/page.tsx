"use client";

import { useQuery } from "@tanstack/react-query";
import { CardGrid, EmptyState, Page, PageHeader, RequireRole } from "@/components/shared";
import { EnrolledCourseCard } from "@/components/course/EnrolledCourseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { enrollmentApi } from "@/lib/api/enrollment";
import { useAuth } from "@/context/AuthContext";

function MyCoursesContent() {
  const { user } = useAuth();

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ["my-courses", user?.id],
    queryFn: () => enrollmentApi.myCourses(user!.id),
    enabled: !!user,
  });

  return (
    <>
      <Page width="full">
        <PageHeader title="My Courses" />

        {isLoading ? (
          <CardGrid>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-80 w-full rounded-xl" />
            ))}
          </CardGrid>
        ) : !enrollments || enrollments.length === 0 ? (
          <EmptyState
            title="You have not enrolled in any courses yet."
            actionLabel="Explore Courses"
            actionHref="/courses"
          />
        ) : (
          <CardGrid>
            {enrollments.map((enrollment) => (
              <EnrolledCourseCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </CardGrid>
        )}
      </Page>
    </>
  );
}

export default function MyCoursesPage() {
  return (
    <RequireRole roles={["Student", "Teacher", "Admin", "Academy Admin"]}>
      <MyCoursesContent />
    </RequireRole>
  );
}
