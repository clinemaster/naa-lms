"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Users } from "lucide-react";
import { ChartCard, Donut, Page, PageHeader, RequireRole } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { adminApi } from "@/lib/api/admin";

function AdminDashboardContent() {
  const { data: summary } = useQuery({ queryKey: ["admin-summary"], queryFn: () => adminApi.summary() });

  const totalUsers = summary?.total_users ?? 0;
  const students = summary?.students ?? 0;
  const teachers = summary?.teachers ?? 0;
  const academyAdmins = summary?.academy_admins ?? 0;
  const admins = Math.max(totalUsers - students - teachers - academyAdmins, 0);

  const totalCourses = summary?.courses ?? 0;
  const published = summary?.published_courses ?? 0;
  const pendingReview = summary?.pending_review ?? 0;
  const otherCourses = Math.max(totalCourses - published - pendingReview, 0);

  const totalEnrollments = summary?.enrollments ?? 0;
  const completedCourses = summary?.completed_courses ?? 0;
  const inProgressEnrollments = Math.max(totalEnrollments - completedCourses, 0);

  return (
    <>
      <Page width="full">
        <PageHeader
          title="SysAdmin Dashboard"
          actions={
            <>
              <Button
                variant="outline"
                render={
                  <Link href="/admin/users">
                    <Users className="size-4" />
                    Manage Users
                  </Link>
                }
              />
              <Button
                render={
                  <Link href="/admin/courses">
                    <BookOpen className="size-4" />
                    Manage Courses
                  </Link>
                }
              />
            </>
          }
        />

        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <ChartCard>
            <Donut
              total={totalUsers}
              centerValue={totalUsers}
              centerLabel="Total Users"
              showDirectLabels
              segments={[
                { label: "Students", count: students, color: "#2a78d6" },
                { label: "Teachers", count: teachers, color: "#eb6834" },
                { label: "SysAdmins", count: admins, color: "#1baf7a" },
                { label: "Academy Admins", count: academyAdmins, color: "#8a63d2" },
              ]}
            />
          </ChartCard>
          <ChartCard>
            <Donut
              total={totalCourses}
              centerValue={totalCourses}
              centerLabel="Courses"
              showDirectLabels
              segments={[
                { label: "Published", count: published, color: "#1baf7a" },
                { label: "Pending Review", count: pendingReview, color: "#eda100" },
                { label: "Other", count: otherCourses, color: "#898781" },
              ]}
            />
          </ChartCard>
          <ChartCard>
            <Donut
              total={totalEnrollments}
              centerValue={totalEnrollments}
              centerLabel="Enrollments"
              showDirectLabels
              segments={[
                { label: "Completed", count: completedCourses, color: "#0ca30c" },
                { label: "In Progress", count: inProgressEnrollments, color: "#2a78d6" },
              ]}
            />
          </ChartCard>
        </div>
      </Page>
    </>
  );
}

export default function AdminDashboardPage() {
  return (
    <RequireRole roles={["Admin"]}>
      <AdminDashboardContent />
    </RequireRole>
  );
}
