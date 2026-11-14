"use client";

import { CourseBuilder } from "@/components/teacher/CourseBuilder";
import { Page, PageHeader, RequireRole } from "@/components/shared";

function NewCourseContent() {
  return (
    <>
      <Page width="md">
        <PageHeader title="Create Course" />
        <CourseBuilder />
      </Page>
    </>
  );
}

export default function NewCoursePage() {
  return (
    <RequireRole roles={["Teacher"]}>
      <NewCourseContent />
    </RequireRole>
  );
}
