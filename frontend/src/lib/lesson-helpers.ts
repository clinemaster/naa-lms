import type { EnrolledCourse, VariantItem } from "./types";

/** Flattens an enrollment's curriculum into an ordered lesson list. */
export function flattenLessons(enrollment: EnrolledCourse): VariantItem[] {
  const variants = enrollment.curriculum || enrollment.course?.curriculum || [];
  return variants
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((variant) => (variant.items || variant.variant_items || []).slice().sort((a, b) => a.order - b.order));
}

/** The first lesson the student hasn't completed yet, or the last lesson if all are done. */
export function nextLessonFor(enrollment: EnrolledCourse): VariantItem | undefined {
  const lessons = flattenLessons(enrollment);
  const completedIds = new Set(enrollment.completed_lesson?.map((p) => p.variant_item));
  return lessons.find((lesson) => !completedIds.has(lesson.id)) || lessons[lessons.length - 1];
}
