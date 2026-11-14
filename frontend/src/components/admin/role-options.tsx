import { Building2, GraduationCap, Presentation, ShieldCheck, type LucideIcon } from "lucide-react";
import { IconChip, IconOption, type Tone } from "@/components/shared/icon-chip";
import { ROLE_LABELS, type Role } from "@/lib/types";

export const ROLES: Role[] = ["Student", "Teacher", "Admin", "Academy Admin"];
export const ROLE_ITEMS = Object.fromEntries(ROLES.map((r) => [r, ROLE_LABELS[r]]));

const ROLE_META: Record<Role, { icon: LucideIcon; description: string; tone: Tone }> = {
  Student: { icon: GraduationCap, description: "Enrolls in and takes courses", tone: "sky" },
  Teacher: { icon: Presentation, description: "Creates and manages courses", tone: "emerald" },
  Admin: { icon: ShieldCheck, description: "Full system access", tone: "rose" },
  "Academy Admin": { icon: Building2, description: "Reviews and approves courses", tone: "amber" },
};

/** Small coloured icon chip identifying a role. */
export function RoleIcon({ role }: { role: Role }) {
  return <IconChip icon={ROLE_META[role].icon} tone={ROLE_META[role].tone} />;
}

/** Dropdown row for a role: icon chip, name and a one-line description. */
export function RoleOption({ role }: { role: Role }) {
  const meta = ROLE_META[role];
  return <IconOption icon={meta.icon} tone={meta.tone} title={ROLE_LABELS[role]} description={meta.description} />;
}
