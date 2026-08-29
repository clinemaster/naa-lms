import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const MEDIA_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1").replace(/\/api\/v1\/?$/, "")

/** Resolves a Django FileField path (or full URL) to an absolute media URL. */
export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  return `${MEDIA_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`
}

/** Course.category comes back nested (an object) on GET and as a plain id
 * on write; this normalizes either shape down to just the id. */
export function categoryIdOf(category: { id: number } | number | null | undefined): string {
  if (category === null || category === undefined) return "";
  return String(typeof category === "object" ? category.id : category);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return ""
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
}
