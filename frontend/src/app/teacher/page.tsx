"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { ChartCard, DataTable, EmptyState, Page, PageHeader, PageSection, RequireRole, StatCard } from "@/components/shared";
import { CourseStatusBadge } from "@/components/course/CourseStatusBadge";
import { CourseStatusDonut } from "@/components/teacher/CourseStatusDonut";
import { Button } from "@/components/ui/button";
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
      <Page width="full">
        <PageHeader
          title="Teacher Dashboard"
          actions={<Button render={<Link href="/teacher/courses/new">Create Course</Link>} />}
        />

        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
          <ChartCard>
            <CourseStatusDonut
              total={totalCourses}
              segments={[
                { label: "Published", count: published, color: "#10b981" },
                { label: "Drafts", count: drafts, color: "#94a3b8" },
                { label: "Disabled", count: disabled, color: "#f59e0b" },
              ]}
            />
          </ChartCard>
          <StatCard value={summary?.total_students ?? "—"} label="Total Students" />
        </div>

        <PageSection title="My Courses">
        <DataTable
          numbered
          data={courses}
          isLoading={isLoading}
          getRowKey={(c) => c.id}
          emptyState={
            <EmptyState
              title="You have not created any courses."
              actionLabel="Create Your First Course"
              actionHref="/teacher/courses/new"
            />
          }
          columns={[
            { key: "title", header: "Course", primary: true, cell: (c) => c.title },
            { key: "students", header: "Students", cell: (c) => c.students.enrolled },
            {
              key: "status",
              header: "Status",
              cell: (c) => <CourseStatusBadge status={c.teacher_course_status as PlatformStatus} />,
            },
            { key: "updated", header: "Updated", cell: (c) => formatDate(c.date) },
            {
              key: "actions",
              header: "Actions",
              actions: true,
              cell: (c) => (
                <>
                  <Button variant="outline" size="sm" render={<Link href={`/teacher/courses/${c.id}/edit`}>Edit</Link>} />
                  <Button
                    variant="destructive"
                    size="icon"
                    aria-label={`Delete ${c.title}`}
                    disabled={deleteMutation.isPending}
                    onClick={() => handleDelete(c.id, c.title)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ),
            },
          ]}
        />
        </PageSection>
      </Page>
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
