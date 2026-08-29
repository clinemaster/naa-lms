import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <p className="font-medium text-foreground">National Audit Academy</p>
        <p>Advancing professional audit skills for the modern auditor.</p>
        <div className="mt-2 flex gap-4">
          <Link href="/courses" className="hover:text-foreground">
            Courses
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Login
          </Link>
        </div>
      </div>
      <div className="w-full bg-[#0d6b0d] py-3 text-center text-sm text-white">
        © {new Date().getFullYear()} National Audit Academy. All rights reserved.
      </div>
    </footer>
  );
}
