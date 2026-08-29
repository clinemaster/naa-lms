import { EditCourseClient } from "./EditCourseClient";

export default async function EditCoursePage({ params }: PageProps<"/teacher/courses/[courseId]/edit">) {
  const { courseId } = await params;
  return <EditCourseClient courseId={Number(courseId)} />;
}
