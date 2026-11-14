import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  /** Shortcut for a single link button. */
  actionLabel?: string;
  actionHref?: string;
  /** Custom actions; extensions use this for buttons that aren't links. */
  children?: React.ReactNode;
  className?: string;
}

/** Dashed placeholder shown when a list has nothing in it yet. */
export function EmptyState({ title, description, icon: Icon, actionLabel, actionHref, children, className }: EmptyStateProps) {
  return (
    <div className={cn("ui-empty-state", className)}>
      {Icon && <Icon aria-hidden className="ui-empty-state-icon" />}
      <div className="space-y-1">
        <p className="ui-empty-state-title">{title}</p>
        {description && <p className="ui-empty-state-description">{description}</p>}
      </div>
      {actionLabel && actionHref && <Button render={<Link href={actionHref}>{actionLabel}</Link>} />}
      {children}
    </div>
  );
}
