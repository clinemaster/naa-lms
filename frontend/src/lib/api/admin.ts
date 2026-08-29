import { apiClient } from "./client";
import type { AdminSummary, AdminUser, Course, EnrolledCourse, Role } from "../types";

export const adminApi = {
  summary: () => apiClient.get<AdminSummary>("/admin/summary/"),

  listUsers: (params?: { role?: Role; q?: string }) => {
    const query = new URLSearchParams();
    if (params?.role) query.set("role", params.role);
    if (params?.q) query.set("q", params.q);
    const qs = query.toString();
    return apiClient.get<AdminUser[]>(`/admin/users/${qs ? `?${qs}` : ""}`);
  },

  createUser: (payload: { email: string; full_name: string; role: Role; password?: string }) =>
    apiClient.post<AdminUser>("/admin/users/", payload),

  updateUser: (userId: number, payload: Partial<Pick<AdminUser, "role" | "is_active" | "full_name">>) =>
    apiClient.patch<AdminUser>(`/admin/users/${userId}/`, payload),

  listCourses: (status?: string) =>
    apiClient.get<Course[]>(`/admin/courses/${status ? `?status=${status}` : ""}`),

  courseDetail: (courseId: number) => apiClient.get<Course>(`/admin/courses/${courseId}/`),

  approveCourse: (courseId: number) =>
    apiClient.post<{ message: string; platform_status: string }>(`/admin/courses/${courseId}/approve/`),

  rejectCourse: (courseId: number, reason: string) =>
    apiClient.post<{ message: string; platform_status: string }>(`/admin/courses/${courseId}/reject/`, { reason }),

  publishCourse: (courseId: number) =>
    apiClient.post<{ message: string; platform_status: string }>(`/admin/courses/${courseId}/publish/`),

  unpublishCourse: (courseId: number) =>
    apiClient.post<{ message: string; platform_status: string }>(`/admin/courses/${courseId}/unpublish/`),

  listEnrollments: () => apiClient.get<EnrolledCourse[]>("/admin/enrollments/"),

  getSiteConfiguration: () =>
    apiClient.get<{ sequential_learning_enabled: boolean; lesson_completion_threshold: number }>(
      "/admin/site-configuration/"
    ),

  updateSiteConfiguration: (payload: { sequential_learning_enabled?: boolean; lesson_completion_threshold?: number }) =>
    apiClient.patch("/admin/site-configuration/", payload),
};
