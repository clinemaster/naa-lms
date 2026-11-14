import { Ban, CheckCircle2, Clock, FilePen, XCircle, type LucideIcon } from "lucide-react";
import { StatusPill, type Tone } from "@/components/shared/icon-chip";
import type { PlatformStatus } from "@/lib/types";

const STATUS_META: Record<PlatformStatus, { icon: LucideIcon; tone: Tone }> = {
  Draft: { icon: FilePen, tone: "slate" },
  Review: { icon: Clock, tone: "amber" },
  Published: { icon: CheckCircle2, tone: "emerald" },
  Disabled: { icon: Ban, tone: "slate" },
  Rejected: { icon: XCircle, tone: "rose" },
};

export function CourseStatusBadge({ status }: { status: PlatformStatus }) {
  const meta = STATUS_META[status] ?? { icon: FilePen, tone: "slate" };
  return <StatusPill icon={meta.icon} tone={meta.tone} label={status} />;
}
