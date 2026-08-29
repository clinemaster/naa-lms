import { LearningClient } from "./LearningClient";

export default async function LearningPage({ params }: PageProps<"/learning/[enrollmentId]/[lessonId]">) {
  const { enrollmentId, lessonId } = await params;
  return <LearningClient enrollmentId={enrollmentId} lessonId={lessonId} />;
}
