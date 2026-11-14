"use client";

import { useQuery } from "@tanstack/react-query";
import { CardGrid, EmptyState, Page, PageHeader, PageSection, RequireRole, StatCard } from "@/components/shared";
import { EnrolledCourseCard } from "@/components/course/EnrolledCourseCard";
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
      <Page width="full">
        <PageHeader title={`Welcome, ${user?.full_name ?? ""}`} description="Here's where you left off." className="mb-8" />

        {summary && (
          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard value={summary.total_courses} label="Enrolled courses" />
            <StatCard value={summary.completed_lessons} label="Lessons completed" />
            <StatCard value={summary.achieved_certificates} label="Certificates earned" />
          </div>
        )}

        <PageSection title="Continue Learning">
          {isLoading ? (
            <Skeleton className="h-80 w-full max-w-sm rounded-xl" />
          ) : inProgress.length === 0 ? (
            <EmptyState title="No courses in progress." actionLabel="Explore Courses" actionHref="/courses" />
          ) : (
            <CardGrid>
              {inProgress.map((enrollment) => (
                <EnrolledCourseCard key={enrollment.id} enrollment={enrollment} />
              ))}
            </CardGrid>
          )}
        </PageSection>

        {completed.length > 0 && (
          <PageSection title="Completed Courses">
            <CardGrid>
              {completed.map((enrollment) => (
                <EnrolledCourseCard key={enrollment.id} enrollment={enrollment} />
              ))}
            </CardGrid>
          </PageSection>
        )}
      </Page>
    </>
  );
}

export default function DashboardPage() {
  return (
    <RequireRole roles={["Student", "Teacher", "Admin", "Academy Admin"]}>
      <DashboardContent />
    </RequireRole>
  );
}
