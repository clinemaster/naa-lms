import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Page layout building blocks. Every screen renders inside <Page> and starts
 * with <PageHeader>, so widths, padding, title spacing and the header row are
 * defined once (see the "Page" section of src/styles/ui.css).
 */

const PAGE_WIDTHS = {
  sm: "max-w-2xl", // single forms (profile)
  md: "max-w-4xl", // forms, detail/review screens
  lg: "max-w-5xl", // course detail
  xl: "max-w-6xl", // admin tables
  full: "max-w-7xl", // dashboards, card grids
} as const;

export type PageWidth = keyof typeof PAGE_WIDTHS;

export function Page({
  width = "full",
  className,
  ...props
}: React.ComponentProps<"main"> & { width?: PageWidth }) {
  return <main className={cn("ui-page", PAGE_WIDTHS[width], className)} {...props} />;
}

/** Full-height centred page for single-card screens (login, register). */
export function CenteredPage({ className, ...props }: React.ComponentProps<"main">) {
  return <main className={cn("ui-page-center", className)} {...props} />;
}

interface PageHeaderProps extends Omit<React.ComponentProps<"div">, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Shown before the title, e.g. a back button. */
  leading?: React.ReactNode;
  /** Shown right after the title, e.g. a status badge. */
  meta?: React.ReactNode;
  /** Buttons on the right; wraps under the title on small screens. */
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, leading, meta, actions, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn("ui-page-header", className)} {...props}>
      <div className="ui-page-header-main">
        {leading}
        <div className="ui-page-heading">
          {title && (
            <div className="ui-page-title-row">
              <h1 className="ui-page-title">{title}</h1>
              {meta}
            </div>
          )}
          {!title && meta}
          {description && <p className="ui-page-description">{description}</p>}
        </div>
      </div>
      {actions && <div className="ui-page-actions">{actions}</div>}
    </div>
  );
}

interface PageSectionProps extends Omit<React.ComponentProps<"section">, "title"> {
  title?: React.ReactNode;
}

/** A titled block within a page (e.g. "Continue Learning"). */
export function PageSection({ title, className, children, ...props }: PageSectionProps) {
  return (
    <section className={cn("ui-page-section", className)} {...props}>
      {title && <h2 className="ui-section-title">{title}</h2>}
      {children}
    </section>
  );
}

/** Responsive 1 / 2 / 3 column grid for course cards. */
export function CardGrid({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("ui-card-grid", className)} {...props} />;
}
