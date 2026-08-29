import { Badge } from "@/components/ui/badge";
import type { PlatformStatus } from "@/lib/types";

const STATUS_STYLES: Record<PlatformStatus, string> = {
  Draft: "bg-muted text-muted-foreground",
  Review: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  Published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  Disabled: "bg-muted text-muted-foreground",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function CourseStatusBadge({ status }: { status: PlatformStatus }) {
  return <Badge className={STATUS_STYLES[status]}>{status}</Badge>;
}
