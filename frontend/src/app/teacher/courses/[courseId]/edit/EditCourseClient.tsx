"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RequireRole } from "@/components/shared/RequireRole";
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
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/teacher")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-semibold">Edit Course</h1>
          {course && <CourseStatusBadge status={course.platform_status as PlatformStatus} />}
        </div>
        {course?.platform_status === "Rejected" && course.rejection_reason && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>Rejected: {course.rejection_reason}</AlertDescription>
          </Alert>
        )}
        {isLoading ? <p className="text-muted-foreground">Loading…</p> : course ? <CourseBuilder course={course} /> : null}
      </main>
      <Footer />
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
