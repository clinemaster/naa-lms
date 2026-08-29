"use client";

import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RequireRole } from "@/components/shared/RequireRole";
import { EmptyState } from "@/components/shared/EmptyState";
import { EnrolledCourseCard } from "@/components/course/EnrolledCourseCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { enrollmentApi } from "@/lib/api/enrollment";
import { useAuth } from "@/context/AuthContext";

function DashboardContent() {
  const { user } = useAuth();

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ["my-courses", user?.id],
    queryFn: () => enrollmentApi.myCourses(user!.id),
    enabled: !!user,
  });

  const { data: summary } = useQuery({
    queryKey: ["student-summary", user?.id],
    queryFn: () => enrollmentApi.summary(user!.id),
    enabled: !!user,
  });

  const inProgress = enrollments?.filter((e) => !e.is_course_completed) || [];
  const completed = enrollments?.filter((e) => e.is_course_completed) || [];

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-1 text-3xl font-semibold">Welcome back, {user?.full_name}</h1>
        <p className="mb-8 text-muted-foreground">Here&apos;s where you left off.</p>

        {summary && (
          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-3xl font-bold">{summary.total_courses}</p>
                <p className="text-sm text-muted-foreground">Enrolled courses</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-3xl font-bold">{summary.completed_lessons}</p>
                <p className="text-sm text-muted-foreground">Lessons completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-3xl font-bold">{summary.achieved_certificates}</p>
                <p className="text-sm text-muted-foreground">Certificates earned</p>
              </CardContent>
            </Card>
          </div>
        )}

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Continue Learning</h2>
          {isLoading ? (
            <Skeleton className="h-80 w-full max-w-sm rounded-xl" />
          ) : inProgress.length === 0 ? (
            <EmptyState title="No courses in progress." actionLabel="Explore Courses" actionHref="/courses" />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {inProgress.map((enrollment) => (
                <EnrolledCourseCard key={enrollment.id} enrollment={enrollment} />
              ))}
            </div>
          )}
        </section>

        {completed.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-semibold">Completed Courses</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {completed.map((enrollment) => (
                <EnrolledCourseCard key={enrollment.id} enrollment={enrollment} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

export default function DashboardPage() {
  return (
    <RequireRole roles={["Student", "Teacher", "Admin"]}>
      <DashboardContent />
    </RequireRole>
  );
}
