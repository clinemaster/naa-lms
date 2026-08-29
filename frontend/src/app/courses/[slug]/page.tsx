import { CourseDetailClient } from "./CourseDetailClient";

export default async function CourseDetailPage({ params }: PageProps<"/courses/[slug]">) {
  const { slug } = await params;
  return <CourseDetailClient slug={slug} />;
}
