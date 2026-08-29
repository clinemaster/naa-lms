import { apiClient } from "./client";
import type { Category, Course } from "../types";

export const courseApi = {
  listCategories: () => apiClient.get<Category[]>("/course/category/", { auth: false }),

  listCourses: (params?: { category?: string; level?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set("category", params.category);
    if (params?.level) query.set("level", params.level);
    const qs = query.toString();
    return apiClient.get<Course[]>(`/course/course-list/${qs ? `?${qs}` : ""}`, { auth: false });
  },

  searchCourses: (q: string, params?: { category?: string; level?: string }) => {
    const query = new URLSearchParams({ q });
    if (params?.category) query.set("category", params.category);
    if (params?.level) query.set("level", params.level);
    return apiClient.get<Course[]>(`/course/search/?${query.toString()}`, { auth: false });
  },

  getCourseDetail: (slug: string) => apiClient.get<Course>(`/course/course-detail/${slug}/`, { auth: false }),
};
