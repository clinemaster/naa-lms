"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, LayoutGrid, Signal } from "lucide-react";
import { CourseGrid } from "@/components/course/CourseGrid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { courseApi } from "@/lib/api/courses";
import { LEVELS, LevelOption } from "@/components/course/course-options";
import { IconInput, Page, PageHeader } from "@/components/shared";


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
      <Page width="full">
        <PageHeader title="Browse Courses" />

        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <IconInput
              icon={Search}
              placeholder="Search courses (e.g. Financial Audit, IT Audit, Procurement)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Select
            items={{ all: "All categories", ...Object.fromEntries((categories || []).map((c) => [c.slug, c.title])) }}
            value={category}
            onValueChange={(value) => setCategory(value ?? "all")}
          >
            <SelectTrigger className="w-full sm:w-56">
              <LayoutGrid className="text-muted-foreground" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.slug} label={c.title}>
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
            <SelectTrigger className="w-full sm:w-48">
              <Signal className="text-muted-foreground" />
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent className="min-w-60">
              <SelectItem value="all">All levels</SelectItem>
              {LEVELS.map((l) => (
                <SelectItem key={l} value={l} label={l}>
                  <LevelOption level={l} />
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
      </Page>
    </>
  );
}
