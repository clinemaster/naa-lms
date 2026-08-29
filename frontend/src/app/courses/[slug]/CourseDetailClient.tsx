"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { courseApi } from "@/lib/api/courses";
import { enrollmentApi } from "@/lib/api/enrollment";
import { ApiRequestError } from "@/lib/api/client";
import { mediaUrl } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export function CourseDetailClient({ slug }: { slug: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course-detail", slug],
    queryFn: () => courseApi.getCourseDetail(slug),
  });

  const enrollMutation = useMutation({
    mutationFn: (courseId: number) => enrollmentApi.enroll(courseId),
    onSuccess: () => {
      toast.success("Enrolled successfully. Redirecting to My Courses…");
      queryClient.invalidateQueries({ queryKey: ["my-courses"] });
      router.push("/my-courses");
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiRequestError ? error.message : "Your enrollment could not be completed.";
      toast.error(message);
    },
  });

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
          <Skeleton className="mb-6 aspect-video w-full rounded-xl" />
          <Skeleton className="mb-2 h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </main>
        <Footer />
      </>
    );
  }

  if (!course) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-5xl flex-1 px-4 py-16 text-center sm:px-6 lg:px-8">
          <p className="text-muted-foreground">This course is not available.</p>
        </main>
        <Footer />
      </>
    );
  }

  const image = mediaUrl(course.image);
  const handleEnroll = () => {
    if (!user) {
      router.push(`/login?next=/courses/${slug}`);
      return;
    }
    enrollMutation.mutate(course.id);
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-xl bg-muted">
          {image && <Image src={image} alt={course.title} fill className="object-cover" />}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h1 className="mb-2 text-3xl font-bold">{course.title}</h1>
            <p className="mb-4 text-sm text-muted-foreground">
              Instructor: {course.teacher_name || "National Audit Academy"}
            </p>
            <p className="mb-8 leading-relaxed text-foreground/90">{course.description}</p>

            <h2 className="mb-4 text-xl font-semibold">Course Content</h2>
            <div className="divide-y rounded-lg border">
              {course.curriculum?.map((variant) => (
                <div key={variant.id}>
                  <div className="bg-muted/40 px-4 py-2 text-sm font-medium">{variant.title}</div>
                  {(variant.items || variant.variant_items)?.map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
                      <span>
                        {String(idx + 1).padStart(2, "0")} — {item.title}
                      </span>
                      <span className="text-muted-foreground">{item.content_duration || "—"}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="h-fit rounded-xl border p-6">
            <dl className="mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Lessons</dt>
                <dd>{course.total_lessons}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Level</dt>
                <dd>{course.level}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Language</dt>
                <dd>{course.language}</dd>
              </div>
            </dl>
            <Button className="w-full" size="lg" onClick={handleEnroll} disabled={enrollMutation.isPending}>
              {enrollMutation.isPending ? "Enrolling…" : "Enroll in Course"}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
