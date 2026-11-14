import * as React from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { IconChip, type Tone } from "@/components/shared/icon-chip";
import { cn } from "@/lib/utils";

/**
 * Base card definitions. Feature cards (CourseCard, EnrolledCourseCard,
 * CertificateCard, …) extend these by filling their slots, so the frame,
 * image ratio, spacing and typography are defined once.
 */

// ------------------------------------------------------------- IconHeading

interface IconHeadingProps {
  icon: LucideIcon;
  tone?: Tone;
  /** Pass the container's own title element, e.g. <CardTitle> or <DialogTitle>. */
  title: React.ReactNode;
  description?: React.ReactNode;
}

/**
 * Large icon chip beside a title and description. Place it inside an element
 * with `ui-card-heading` (a CardHeader or DialogHeader).
 */
export function IconHeading({ icon, tone = "emerald", title, description }: IconHeadingProps) {
  return (
    <>
      <IconChip icon={icon} tone={tone} size="lg" />
      <div className="ui-card-heading-text">
        {title}
        {description}
      </div>
    </>
  );
}

// --------------------------------------------------------------- MediaCard

const MEDIA_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

interface MediaCardProps {
  /** Image URL; when missing the 16:9 area shows `placeholder`. */
  image?: string | null;
  imageAlt?: string;
  placeholder?: React.ReactNode;
  title: React.ReactNode;
  /** Body content under the title. */
  children?: React.ReactNode;
  /** Buttons pinned to the bottom of the card. */
  footer?: React.ReactNode;
  /** Lift the card on hover (for cards that act as links). */
  interactive?: boolean;
  className?: string;
  contentClassName?: string;
  footerClassName?: string;
}

/** Card with a 16:9 image, a title, body and footer actions. Used in card grids. */
export function MediaCard({
  image,
  imageAlt = "",
  placeholder,
  title,
  children,
  footer,
  interactive,
  className,
  contentClassName,
  footerClassName,
}: MediaCardProps) {
  return (
    <Card className={cn("ui-media-card", interactive && "ui-media-card-interactive", className)}>
      <div className="ui-media-card-image">
        {image ? (
          <Image src={image} alt={imageAlt} fill sizes={MEDIA_SIZES} className="object-cover" />
        ) : (
          placeholder && <div className="ui-media-card-placeholder">{placeholder}</div>
        )}
      </div>
      <CardContent className={cn("ui-media-card-body", contentClassName)}>
        <h3 className="ui-media-card-title">{title}</h3>
        {children}
      </CardContent>
      {footer && <CardFooter className={footerClassName}>{footer}</CardFooter>}
    </Card>
  );
}

// ---------------------------------------------------------------- StatCard

interface StatCardProps {
  value: React.ReactNode;
  label: React.ReactNode;
  className?: string;
}

/** Big number with a caption, for dashboard summaries. */
export function StatCard({ value, label, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="ui-stat-card-body">
        <p className="ui-stat-value">{value}</p>
        <p className="ui-stat-label">{label}</p>
      </CardContent>
    </Card>
  );
}

// --------------------------------------------------------------- ChartCard

/** Card that centres a chart (e.g. a Donut). */
export function ChartCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardContent className="ui-chart-card">{children}</CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------- IconCard

interface IconCardProps {
  icon: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Actions or extra content under the description. */
  children?: React.ReactNode;
  className?: string;
}

/** Card with a leading icon, a title and a description (e.g. a certificate). */
export function IconCard({ icon: Icon, title, description, children, className }: IconCardProps) {
  return (
    <Card className={className}>
      <CardContent className="ui-icon-card-body">
        <Icon aria-hidden className="ui-icon-card-icon" />
        <div className="ui-icon-card-text">
          <p className="ui-icon-card-title">{title}</p>
          {description && <p className="ui-icon-card-description">{description}</p>}
          {children && <div className="ui-icon-card-actions">{children}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
