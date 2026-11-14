import { PageSkeleton } from "@/components/shared/PageSkeleton";

// Instant fallback shown inside the persistent shell while a route loads.
export default function Loading() {
  return <PageSkeleton />;
}
