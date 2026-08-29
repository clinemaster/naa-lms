"use client";

import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RequireRole } from "@/components/shared/RequireRole";
import { EmptyState } from "@/components/shared/EmptyState";
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
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-3xl font-semibold">My Courses</h1>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-80 w-full rounded-xl" />
            ))}
          </div>
        ) : !enrollments || enrollments.length === 0 ? (
          <EmptyState
            title="You have not enrolled in any courses yet."
            actionLabel="Explore Courses"
            actionHref="/courses"
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((enrollment) => (
              <EnrolledCourseCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default function MyCoursesPage() {
  return (
    <RequireRole roles={["Student", "Teacher", "Admin"]}>
      <MyCoursesContent />
    </RequireRole>
  );
}
