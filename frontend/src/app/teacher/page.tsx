"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RequireRole } from "@/components/shared/RequireRole";
import { EmptyState } from "@/components/shared/EmptyState";
import { CourseStatusBadge } from "@/components/course/CourseStatusBadge";
import { CourseStatusDonut } from "@/components/teacher/CourseStatusDonut";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { teacherApi } from "@/lib/api/teacher";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import type { PlatformStatus } from "@/lib/types";

function TeacherDashboardContent() {
  const { user } = useAuth();
  const teacherId = user!.teacher_id!;

  const { data: summary } = useQuery({
    queryKey: ["teacher-summary", teacherId],
    queryFn: () => teacherApi.summary(teacherId),
  });

  const { data: courses, isLoading } = useQuery({
    queryKey: ["teacher-courses", teacherId],
    queryFn: () => teacherApi.courseList(teacherId),
  });

  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: (courseId: number) => teacherApi.deleteCourse(courseId),
    onSuccess: () => {
      toast.success("Course deleted.");
      queryClient.invalidateQueries({ queryKey: ["teacher-courses", teacherId] });
    },
    onError: () => toast.error("Could not delete the course."),
  });

  const handleDelete = (courseId: number, title: string) => {
    toast.warning(`Delete "${title}"? This cannot be undone.`, {
      action: {
        label: "Delete",
        onClick: () => deleteMutation.mutate(courseId),
      },
      cancel: {
        label: "Cancel",
        onClick: () => {},
      },
    });
  };

  const published = courses?.filter((c) => c.teacher_course_status === "Published").length || 0;
  const drafts = courses?.filter((c) => c.teacher_course_status === "Draft").length || 0;
  const disabled = courses?.filter((c) => c.teacher_course_status === "Disabled").length || 0;
  const totalCourses = courses?.length || 0;

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Teacher Dashboard</h1>
          <Button render={<Link href="/teacher/courses/new">Create Course</Link>} />
        </div>

        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
          <Card>
            <CardContent className="pt-6">
              <CourseStatusDonut
                total={totalCourses}
                segments={[
                  { label: "Published", count: published, color: "#10b981" },
                  { label: "Drafts", count: drafts, color: "#94a3b8" },
                  { label: "Disabled", count: disabled, color: "#f59e0b" },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex h-full flex-col justify-center pt-6">
              <p className="text-2xl font-bold">{summary?.total_students ?? "—"}</p>
              <p className="text-sm text-muted-foreground">Total Students</p>
            </CardContent>
          </Card>
        </div>

        <h2 className="mb-4 text-xl font-semibold">My Courses</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : !courses || courses.length === 0 ? (
          <EmptyState
            title="You have not created any courses."
            actionLabel="Create Your First Course"
            actionHref="/teacher/courses/new"
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S/No</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((c, index) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>{c.students.enrolled}</TableCell>
                    <TableCell>
                      <CourseStatusBadge status={c.teacher_course_status as PlatformStatus} />
                    </TableCell>
                    <TableCell>{formatDate(c.date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" render={<Link href={`/teacher/courses/${c.id}/edit`}>Edit</Link>} />
                        <Button
                          variant="destructive"
                          size="icon"
                          disabled={deleteMutation.isPending}
                          onClick={() => handleDelete(c.id, c.title)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default function TeacherDashboardPage() {
  return (
    <RequireRole roles={["Teacher"]}>
      <TeacherDashboardContent />
    </RequireRole>
  );
}
