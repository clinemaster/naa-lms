import { CourseReviewClient } from "./CourseReviewClient";

export default async function CourseReviewPage({ params }: PageProps<"/admin/courses/[courseId]/review">) {
  const { courseId } = await params;
  return <CourseReviewClient courseId={Number(courseId)} />;
}
