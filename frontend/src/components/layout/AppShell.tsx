"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

// Routes that render their own full-screen chrome instead of the site header/footer.
const BARE_ROUTES = ["/learning", "/certificates/verify"];

/**
 * Persistent site chrome. Lives in the root layout so the header and footer
 * stay mounted across navigations instead of being torn down and rebuilt by
 * every page (which caused the header to flash and the footer to jump).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = BARE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (bare) {
    return <div className="flex flex-1 flex-col">{children}</div>;
  }

  return (
    <>
      <Navbar />
      {/* flex-1 keeps the footer pinned to the bottom while page content loads. */}
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer />
    </>
  );
}
