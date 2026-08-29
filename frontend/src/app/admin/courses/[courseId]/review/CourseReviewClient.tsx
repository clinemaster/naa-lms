"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RequireRole } from "@/components/shared/RequireRole";
import { CourseStatusBadge } from "@/components/course/CourseStatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { adminApi } from "@/lib/api/admin";
import { ApiRequestError } from "@/lib/api/client";
import { mediaUrl } from "@/lib/utils";
import type { PlatformStatus } from "@/lib/types";

function RejectDialog({ courseId }: { courseId: number }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const rejectMutation = useMutation({
    mutationFn: () => adminApi.rejectCourse(courseId, reason),
    onSuccess: () => {
      toast.success("Course rejected.");
      queryClient.invalidateQueries({ queryKey: ["admin-course-detail", courseId] });
      setOpen(false);
    },
    onError: (error: unknown) => toast.error(error instanceof ApiRequestError ? error.message : "Could not reject course."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Reject</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reason for rejection</DialogTitle>
        </DialogHeader>
        <Textarea
          rows={4}
          placeholder="Course content requires revision..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button
          variant="destructive"
          disabled={!reason.trim() || rejectMutation.isPending}
          onClick={() => rejectMutation.mutate()}
        >
          Reject Course
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function CourseReviewContent({ courseId }: { courseId: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: course, isLoading } = useQuery({
    queryKey: ["admin-course-detail", courseId],
    queryFn: () => adminApi.courseDetail(courseId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-course-detail", courseId] });

  const approveMutation = useMutation({
    mutationFn: () => adminApi.approveCourse(courseId),
    onSuccess: () => {
      toast.success("Course approved and published.");
      invalidate();
    },
    onError: (error: unknown) => toast.error(error instanceof ApiRequestError ? error.message : "Could not approve course."),
  });

  const publishMutation = useMutation({
    mutationFn: () => adminApi.publishCourse(courseId),
    onSuccess: () => {
      toast.success("Course published.");
      invalidate();
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => adminApi.unpublishCourse(courseId),
    onSuccess: () => {
      toast.success("Course unpublished.");
      invalidate();
    },
  });

  if (isLoading || !course) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-muted-foreground">Loading…</p>
        </main>
        <Footer />
      </>
    );
  }

  const image = mediaUrl(course.image);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/courses")}>
            ← Back to courses
          </Button>
          <CourseStatusBadge status={course.platform_status as PlatformStatus} />
        </div>

        {image && (
          <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-lg bg-muted">
            <Image src={image} alt={course.title} fill className="object-cover" />
          </div>
        )}

        <h1 className="mb-1 text-2xl font-bold">{course.title}</h1>
        <p className="mb-4 text-sm text-muted-foreground">Teacher: {course.teacher_name}</p>
        <p className="mb-6 leading-relaxed">{course.description}</p>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="mb-3 font-semibold">Curriculum</h2>
            <div className="divide-y">
              {course.curriculum?.map((variant) => (
                <div key={variant.id} className="py-2">
                  <p className="mb-1 text-sm font-medium">{variant.title}</p>
                  {(variant.items || variant.variant_items)?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-1 pl-4 text-sm">
                      <span>{item.title}</span>
                      <span className={item.file ? "text-emerald-600" : "text-destructive"}>
                        {item.file ? "Video uploaded" : "No video"}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {course.rejection_reason && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="font-medium text-destructive">Previous rejection reason:</p>
              <p className="text-sm">{course.rejection_reason}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-3">
          {course.platform_status === "Review" && (
            <>
              <Button disabled={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
                Approve
              </Button>
              <RejectDialog courseId={courseId} />
            </>
          )}
          {course.platform_status === "Disabled" && (
            <Button disabled={publishMutation.isPending} onClick={() => publishMutation.mutate()}>
              Publish
            </Button>
          )}
          {course.platform_status === "Published" && (
            <Button variant="outline" disabled={unpublishMutation.isPending} onClick={() => unpublishMutation.mutate()}>
              Unpublish
            </Button>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export function CourseReviewClient({ courseId }: { courseId: number }) {
  return (
    <RequireRole roles={["Admin"]}>
      <CourseReviewContent courseId={courseId} />
    </RequireRole>
  );
}
