"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Page, PageHeader, RequireRole, SectionSkeleton } from "@/components/shared";
import { CourseStatusBadge } from "@/components/course/CourseStatusBadge";
import { CourseBuilder } from "@/components/teacher/CourseBuilder";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { teacherApi } from "@/lib/api/teacher";
import type { PlatformStatus } from "@/lib/types";

function EditCourseContent({ courseId }: { courseId: number }) {
  const router = useRouter();
  const { data: course, isLoading } = useQuery({
    queryKey: ["teacher-course-detail", courseId],
    queryFn: () => teacherApi.courseDetail(courseId),
  });

  return (
    <>
      <Page width="md">
        <PageHeader
          title="Edit Course"
          leading={
            <Button variant="ghost" size="icon" aria-label="Back to dashboard" onClick={() => router.push("/teacher")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          }
          meta={course && <CourseStatusBadge status={course.platform_status as PlatformStatus} />}
        />
        {course?.platform_status === "Rejected" && course.rejection_reason && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>Rejected: {course.rejection_reason}</AlertDescription>
          </Alert>
        )}
        {isLoading ? <SectionSkeleton /> : course ? <CourseBuilder course={course} /> : null}
      </Page>
    </>
  );
}

export function EditCourseClient({ courseId }: { courseId: number }) {
  return (
    <RequireRole roles={["Teacher"]}>
      <EditCourseContent courseId={courseId} />
    </RequireRole>
  );
}
