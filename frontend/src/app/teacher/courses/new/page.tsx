"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RequireRole } from "@/components/shared/RequireRole";
import { CourseBuilder } from "@/components/teacher/CourseBuilder";

function NewCourseContent() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-3xl font-semibold">Create Course</h1>
        <CourseBuilder />
      </main>
      <Footer />
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
