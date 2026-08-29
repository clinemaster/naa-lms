import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  actionLabel,
  actionHref,
}: {
  title: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
      <p className="text-muted-foreground">{title}</p>
      {actionLabel && actionHref && <Button render={<Link href={actionHref}>{actionLabel}</Link>} />}
    </div>
  );
}
