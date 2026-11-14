import { LearningShell } from "./LearningShell";

// Keeps the course header and lesson sidebar mounted across lesson changes.
export default async function LearningLayout({ children, params }: LayoutProps<"/learning/[enrollmentId]">) {
  const { enrollmentId } = await params;
  return <LearningShell enrollmentId={enrollmentId}>{children}</LearningShell>;
}
