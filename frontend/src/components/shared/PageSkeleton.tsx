import { Skeleton } from "@/components/ui/skeleton";
import { CardGrid, Page } from "./page";

// All skeletons use `.ui-loading-delay`: they reserve their space immediately
// but only fade in after a short delay, so quick loads never flash them.

/**
 * Placeholder for a standard page body. It uses the same container and
 * spacing as the real pages so content swaps in without moving anything.
 */
export function PageSkeleton() {
  return (
    <Page aria-busy="true" aria-label="Loading" className="ui-loading-delay">
      <Skeleton className="mb-6 h-9 w-64" />
      <CardGrid>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </CardGrid>
    </Page>
  );
}

/** Placeholder for the lesson player column (video, title, description). */
export function LessonContentSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading lesson" className="ui-loading-delay flex flex-col gap-4 p-4">
      <Skeleton className="aspect-video w-full rounded-lg" />
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

/** Placeholder matching the full-screen lesson player layout. */
export function LessonSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading lesson" className="ui-loading-delay flex min-h-screen flex-col">
      <div className="ui-lesson-header">
        <Skeleton className="size-(--control-h) rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_320px]">
        <LessonContentSkeleton />
        <div className="ui-lesson-sidebar hidden space-y-3 border-l p-4 lg:block">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-2 w-full" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Placeholder for a section inside an already-rendered page. */
export function SectionSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="ui-section-skeleton ui-loading-delay">
      <Skeleton className="h-6 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={i % 2 ? "h-4 w-2/3" : "h-4 w-full"} />
      ))}
    </div>
  );
}
