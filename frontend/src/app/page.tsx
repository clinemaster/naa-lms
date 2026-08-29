"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CourseGrid } from "@/components/course/CourseGrid";
import { Button } from "@/components/ui/button";
import { courseApi } from "@/lib/api/courses";

export default function HomePage() {
  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses", "landing"],
    queryFn: () => courseApi.listCourses(),
  });

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="border-b bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Advance Your Professional Audit Skills
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Learn from high-quality courses designed for modern professional auditors at the National Audit
              Academy.
            </p>
            <Button size="lg" render={<Link href="/courses">Explore Courses</Link>} />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="text-2xl font-semibold">Featured Courses</h2>
            <Link href="/courses" className="text-sm font-medium text-primary hover:underline">
              View all courses
            </Link>
          </div>
          <CourseGrid courses={courses?.slice(0, 6)} isLoading={isLoading} emptyMessage="No courses published yet." />
        </section>
      </main>
      <Footer />
    </>
  );
}
