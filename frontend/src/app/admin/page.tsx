"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RequireRole } from "@/components/shared/RequireRole";
import { CourseStatusBadge } from "@/components/course/CourseStatusBadge";
import { Donut } from "@/components/shared/Donut";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { adminApi } from "@/lib/api/admin";
import { formatDate } from "@/lib/utils";
import type { PlatformStatus } from "@/lib/types";

function AdminDashboardContent() {
  const { data: summary } = useQuery({ queryKey: ["admin-summary"], queryFn: () => adminApi.summary() });
  const { data: pendingCourses } = useQuery({
    queryKey: ["admin-courses", "Review"],
    queryFn: () => adminApi.listCourses("Review"),
  });

  const totalUsers = summary?.total_users ?? 0;
  const students = summary?.students ?? 0;
  const teachers = summary?.teachers ?? 0;
  const admins = Math.max(totalUsers - students - teachers, 0);

  const totalCourses = summary?.courses ?? 0;
  const published = summary?.published_courses ?? 0;
  const pendingReview = summary?.pending_review ?? 0;
  const otherCourses = Math.max(totalCourses - published - pendingReview, 0);

  const totalEnrollments = summary?.enrollments ?? 0;
  const completedCourses = summary?.completed_courses ?? 0;
  const inProgressEnrollments = Math.max(totalEnrollments - completedCourses, 0);

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href="/admin/users">Manage Users</Link>} />
            <Button render={<Link href="/admin/courses">Manage Courses</Link>} />
          </div>
        </div>

        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center justify-center pt-6">
              <Donut
                total={totalUsers}
                centerValue={totalUsers}
                centerLabel="Total Users"
                showDirectLabels
                segments={[
                  { label: "Students", count: students, color: "#2a78d6" },
                  { label: "Teachers", count: teachers, color: "#eb6834" },
                  { label: "Admins", count: admins, color: "#1baf7a" },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-center pt-6">
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
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-center pt-6">
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
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Pending Review</h2>
          <Link href="/admin/courses?status=Review" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {!pendingCourses || pendingCourses.length === 0 ? (
          <p className="text-muted-foreground">No courses are waiting for review.</p>
        ) : (
          <div className="space-y-3">
            {pendingCourses.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between pt-6">
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.teacher_name} · Submitted {formatDate(c.submitted_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <CourseStatusBadge status={c.platform_status as PlatformStatus} />
                    <Button size="sm" render={<Link href={`/admin/courses/${c.id}/review`}>Review</Link>} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
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
