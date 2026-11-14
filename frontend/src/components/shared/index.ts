/**
 * The app's shared component library. Pages should build from these instead of
 * repeating markup and class names:
 *
 *   import { Page, PageHeader, FormField, DataTable } from "@/components/shared";
 *
 * Layout     Page, CenteredPage, PageHeader, PageSection, CardGrid
 * Forms      FormField, IconInput, PasswordInput
 * Cards      MediaCard, StatCard, ChartCard, IconCard, IconHeading, AuthCard, EmptyState
 * Options    OptionRow, IconOption
 * Data       DataTable, Donut
 * Status     IconChip, StatusPill
 * Loading    PageSkeleton, SectionSkeleton, LessonSkeleton, LessonContentSkeleton
 * Access     RequireRole
 *
 * Extending a base
 * ----------------
 * Feature components don't restyle a base; they wrap it and fill its slots
 * with their own data and behaviour. Examples in this codebase:
 *
 *   MediaCard   → CourseCard, EnrolledCourseCard
 *   IconCard    → CertificateCard
 *   IconHeading → AuthCard, the Create User dialog header
 *   OptionRow   → IconOption → RoleOption;  OptionRow → LevelOption, LanguageOption
 *   StatusPill  → CourseStatusBadge
 *   Donut       → CourseStatusDonut
 *
 * Each base takes `className` (and slot-specific *ClassName props) for small
 * one-off adjustments. If several extensions need the same change, add it to
 * the base or to src/styles/ui.css instead.
 *
 * Primitives (Button, Input, Select, Card, Dialog, …) stay in "@/components/ui".
 * Styles behind these components live in src/styles/ui.css.
 *
 * ImageCropDialog is deliberately not re-exported: it pulls in the cropper
 * library, so import it directly where it's needed.
 */

export * from "./page";
export * from "./form-field";
export * from "./auth-card";
export * from "./cards";
export * from "./option-row";
export * from "./EmptyState";
export * from "./DataTable";
export * from "./Donut";
export * from "./icon-chip";
export * from "./IconInput";
export * from "./PageSkeleton";
export * from "./RequireRole";
