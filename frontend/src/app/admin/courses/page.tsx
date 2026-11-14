"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Ban, CheckCircle2, Clock, FilePen, LayoutGrid, XCircle, type LucideIcon } from "lucide-react";
import { CourseStatusBadge } from "@/components/course/CourseStatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApi } from "@/lib/api/admin";
import { formatDate } from "@/lib/utils";
import type { PlatformStatus } from "@/lib/types";
import { DataTable, Page, PageHeader, PageSkeleton, RequireRole } from "@/components/shared";

const STATUS_TABS: { value: string; label: string; icon: LucideIcon; activeClassName: string }[] = [
  { value: "all", icon: LayoutGrid, label: "All", activeClassName: "data-active:bg-primary data-active:text-primary-foreground" },
  {
    value: "Review",
    icon: Clock,
    label: "Pending Review",
    activeClassName: "data-active:bg-amber-500 data-active:text-white dark:data-active:bg-amber-600",
  },
  {
    value: "Published",
    icon: CheckCircle2,
    label: "Published",
    activeClassName: "data-active:bg-emerald-600 data-active:text-white dark:data-active:bg-emerald-700",
  },
  {
    value: "Draft",
    icon: FilePen,
    label: "Draft",
    activeClassName: "data-active:bg-slate-500 data-active:text-white dark:data-active:bg-slate-600",
  },
  {
    value: "Rejected",
    icon: XCircle,
    label: "Rejected",
    activeClassName: "data-active:bg-red-600 data-active:text-white dark:data-active:bg-red-700",
  },
  {
    value: "Disabled",
    icon: Ban,
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
      <Page width="xl">
        <PageHeader title="Manage Courses" />

        <Tabs value={status} onValueChange={(v) => setStatus(v ?? "all")} className="mb-6">
          <TabsList className="ui-tab-list">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={`ui-tab ${tab.activeClassName}`}
              >
                <tab.icon />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <DataTable
          numbered
          data={courses}
          isLoading={isLoading}
          getRowKey={(c) => c.id}
          emptyMessage="No courses in this category."
          columns={[
            { key: "title", header: "Course Title", primary: true, cell: (c) => c.title },
            { key: "teacher", header: "Teacher", cell: (c) => c.teacher_name },
            {
              key: "status",
              header: "Status",
              cell: (c) => <CourseStatusBadge status={c.platform_status as PlatformStatus} />,
            },
            { key: "updated", header: "Updated", cell: (c) => formatDate(c.date) },
            {
              key: "actions",
              header: "Actions",
              actions: true,
              cell: (c) => (
                <Button variant="outline" size="sm" render={<Link href={`/admin/courses/${c.id}/review`}>Review</Link>} />
              ),
            },
          ]}
        />
      </Page>
    </>
  );
}

export default function AdminCoursesPage() {
  return (
    <RequireRole roles={["Admin", "Academy Admin"]}>
      <Suspense fallback={<PageSkeleton />}>
        <AdminCoursesContent />
      </Suspense>
    </RequireRole>
  );
}
