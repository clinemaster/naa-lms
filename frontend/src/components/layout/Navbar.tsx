"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";

function dashboardPath(role: string | undefined) {
  if (role === "Admin") return "/admin";
  if (role === "Teacher") return "/teacher";
  return "/dashboard";
}

export function Navbar() {
  const { user, logout, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="h-[5px] w-full bg-[#7cb342] shadow-[0_1px_3px_rgba(0,0,0,0.25)]" />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="group relative">
            <Image src="/logo.png" alt="National Audit Academy" width={40} height={40} className="rounded-full object-cover" />
            <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 scale-95 rounded-md border bg-background p-2 opacity-0 shadow-lg transition-all duration-150 group-hover:scale-100 group-hover:opacity-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="National Audit Academy" className="max-w-[min(80vw,320px)]" />
            </div>
          </div>
          <span className="hidden sm:inline">National Audit Academy</span>
          <span className="sm:hidden">NAA LMS</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/courses" className="text-muted-foreground hover:text-foreground">
            Courses
          </Link>
          {user && (
            <Link href="/my-courses" className="text-muted-foreground hover:text-foreground">
              My Courses
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isLoading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-muted-foreground text-xs">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href={dashboardPath(user.role)}>Dashboard</Link>} />
                <DropdownMenuItem render={<Link href="/my-courses">My Courses</Link>} />
                <DropdownMenuItem render={<Link href="/profile">Profile</Link>} />
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" render={<Link href="/login">Login</Link>} />
              <Button render={<Link href="/register">Register</Link>} />
            </>
          )}
        </div>

        <div className="group relative hidden md:block">
          <Image src="/iso-naot.jpg" alt="ISO certification" width={40} height={40} />
          <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 scale-95 rounded-md border bg-background p-2 opacity-0 shadow-lg transition-all duration-150 group-hover:scale-100 group-hover:opacity-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/iso-naot.jpg" alt="ISO certification" className="max-w-[min(80vw,320px)]" />
          </div>
        </div>

        <button
          className="md:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3 text-sm font-medium">
            <Link href="/courses" onClick={() => setMobileOpen(false)}>
              Courses
            </Link>
            {user ? (
              <>
                <Link href={dashboardPath(user.role)} onClick={() => setMobileOpen(false)}>
                  Dashboard
                </Link>
                <Link href="/my-courses" onClick={() => setMobileOpen(false)}>
                  My Courses
                </Link>
                <Link href="/profile" onClick={() => setMobileOpen(false)}>
                  Profile
                </Link>
                <button className="text-left text-destructive" onClick={logout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  Login
                </Link>
                <Link href="/register" onClick={() => setMobileOpen(false)}>
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
