import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { OptionRow } from "./option-row";

// Colour tones shared by role pickers, setting pickers and status labels.
// Each maps to a `.ui-tone-*` class in src/styles/ui.css.
export type Tone = "sky" | "emerald" | "rose" | "amber" | "slate";

const CHIP_SIZES = { sm: "", md: "ui-chip-md", lg: "ui-chip-lg" } as const;

/** Small coloured square holding an icon. */
export function IconChip({
  icon: Icon,
  tone,
  size = "sm",
  className,
}: {
  icon: LucideIcon;
  tone: Tone;
  /** sm: inside fields, md: inside option rows, lg: beside a card/dialog title. */
  size?: keyof typeof CHIP_SIZES;
  className?: string;
}) {
  return (
    <span aria-hidden className={cn("ui-chip", CHIP_SIZES[size], `ui-tone-${tone}`, className)}>
      <Icon className="size-(--icon-size)" />
    </span>
  );
}

/** Dropdown row: extends OptionRow with a coloured icon chip. */
export function IconOption({
  icon,
  tone,
  title,
  description,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  description: string;
}) {
  return <OptionRow leading={<IconChip icon={icon} tone={tone} size="md" />} title={title} description={description} />;
}

/** Read-only status label in the same style: tinted pill with an icon. */
export function StatusPill({ icon: Icon, tone, label }: { icon: LucideIcon; tone: Tone; label: string }) {
  return (
    <span className={`ui-pill ui-tone-${tone}`}>
      <Icon aria-hidden className="size-(--icon-size)" />
      {label}
    </span>
  );
}
