"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CourseGrid } from "@/components/course/CourseGrid";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { courseApi } from "@/lib/api/courses";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

export default function CoursesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [level, setLevel] = useState<string>("all");

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => courseApi.listCategories(),
  });

  const filters = {
    category: category === "all" ? undefined : category,
    level: level === "all" ? undefined : level,
  };

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses", "browse", debouncedSearch, filters.category, filters.level],
    queryFn: () =>
      debouncedSearch ? courseApi.searchCourses(debouncedSearch, filters) : courseApi.listCourses(filters),
  });

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-3xl font-semibold">Browse Courses</h1>

        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search courses (e.g. Financial Audit, IT Audit, Procurement)"
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Select
            items={{ all: "All categories", ...Object.fromEntries((categories || []).map((c) => [c.slug, c.title])) }}
            value={category}
            onValueChange={(value) => setCategory(value ?? "all")}
          >
            <SelectTrigger className="sm:w-52">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.slug}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            items={{ all: "All levels", ...Object.fromEntries(LEVELS.map((l) => [l, l])) }}
            value={level}
            onValueChange={(value) => setLevel(value ?? "all")}
          >
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              {LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <CourseGrid
          courses={courses}
          isLoading={isLoading}
          emptyMessage="No courses match your search. Try a different keyword or filter."
        />
      </main>
      <Footer />
    </>
  );
}
