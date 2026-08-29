"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RequireRole } from "@/components/shared/RequireRole";
import { CourseStatusBadge } from "@/components/course/CourseStatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApi } from "@/lib/api/admin";
import { formatDate } from "@/lib/utils";
import type { PlatformStatus } from "@/lib/types";

const STATUS_TABS: { value: string; label: string; activeClassName: string }[] = [
  { value: "all", label: "All", activeClassName: "data-active:bg-primary data-active:text-primary-foreground" },
  {
    value: "Review",
    label: "Pending Review",
    activeClassName: "data-active:bg-amber-500 data-active:text-white dark:data-active:bg-amber-600",
  },
  {
    value: "Published",
    label: "Published",
    activeClassName: "data-active:bg-emerald-600 data-active:text-white dark:data-active:bg-emerald-700",
  },
  {
    value: "Draft",
    label: "Draft",
    activeClassName: "data-active:bg-slate-500 data-active:text-white dark:data-active:bg-slate-600",
  },
  {
    value: "Rejected",
    label: "Rejected",
    activeClassName: "data-active:bg-red-600 data-active:text-white dark:data-active:bg-red-700",
  },
  {
    value: "Disabled",
    label: "Disabled",
    activeClassName: "data-active:bg-zinc-500 data-active:text-white dark:data-active:bg-zinc-600",
  },
];

function AdminCoursesContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(searchParams.get("status") || "all");

  const { data: courses, isLoading } = useQuery({
    queryKey: ["admin-courses", status],
    queryFn: () => adminApi.listCourses(status === "all" ? undefined : status),
  });

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-3xl font-semibold">Manage Courses</h1>

        <Tabs value={status} onValueChange={(v) => setStatus(v ?? "all")} className="mb-6">
          <TabsList className="h-12 gap-1 p-1.5">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={`px-4 py-2 text-base font-semibold ${tab.activeClassName}`}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : !courses || courses.length === 0 ? (
          <p className="text-muted-foreground">No courses in this category.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S/No</TableHead>
                  <TableHead>Course Title</TableHead>
                  <TableHead>Teacher</TableHead>
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
                    <TableCell>{c.teacher_name}</TableCell>
                    <TableCell>
                      <CourseStatusBadge status={c.platform_status as PlatformStatus} />
                    </TableCell>
                    <TableCell>{formatDate(c.date)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        render={<Link href={`/admin/courses/${c.id}/review`}>Review</Link>}
                      />
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

export default function AdminCoursesPage() {
  return (
    <RequireRole roles={["Admin"]}>
      <Suspense fallback={null}>
        <AdminCoursesContent />
      </Suspense>
    </RequireRole>
  );
}
