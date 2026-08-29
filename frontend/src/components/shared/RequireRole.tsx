"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/lib/types";

/**
 * Client-side route gate only. It exists to redirect people to the right
 * screen quickly; every protected endpoint enforces the real authorization
 * check server-side regardless of what this component does.
 */
export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!roles.includes(user.role)) {
      router.replace("/");
    }
  }, [user, isLoading, roles, router]);

  if (isLoading || !user || !roles.includes(user.role)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading…</div>
    );
  }

  return <>{children}</>;
}
