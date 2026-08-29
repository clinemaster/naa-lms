import { apiClient } from "./client";
import type { Course, LessonMaterial, TeacherCourseListItem } from "../types";

export interface TeacherSummary {
  total_courses: number;
  total_enrollments: number;
  montly_enrollments: number;
  total_students: number;
  students: { full_name: string; image: string | null; country: string | null; date: string }[];
}

export const teacherApi = {
  summary: (teacherId: number) => apiClient.get<TeacherSummary>(`/teacher/summary/${teacherId}/`),

  courseList: (teacherId: number) => apiClient.get<TeacherCourseListItem[]>(`/teacher/course-lists/${teacherId}/`),

  courseDetail: (courseId: number) => apiClient.get<Course>(`/teacher/course-detail/${courseId}/`),

  createCourse: (formData: FormData) =>
    apiClient.post<Course>("/teacher/course-create/", formData, { isForm: true }),

  updateCourse: (teacherId: number, courseId: number, formData: FormData) =>
    apiClient.patch<Course>(`/teacher/course-update/${teacherId}/${courseId}/`, formData, { isForm: true }),

  submitForReview: (teacherId: number, courseId: number) =>
    apiClient.post<{ message: string; platform_status: string }>(
      `/teacher/course-submit/${teacherId}/${courseId}/`
    ),

  deleteCourse: (courseId: number) => apiClient.delete(`/teacher/course-detail/${courseId}/`),

  deleteVariant: (variantId: number, teacherId: number, courseId: number) =>
    apiClient.delete(`/teacher/variant-delete/${variantId}/${teacherId}/${courseId}/`),

  deleteVariantItem: (variantId: number, variantItemId: number, teacherId: number) =>
    apiClient.delete(`/teacher/variant-item-delete/${variantId}/${variantItemId}/${teacherId}/`),

  // Resumable video upload
  initVideoUpload: (payload: { variant_item_id: string; filename: string; file_size: number; content_type: string }) =>
    apiClient.post<{ upload_id: string; received_bytes: number; chunk_size: number }>(
      "/teacher/video-upload/init/",
      payload
    ),

  uploadChunk: (uploadId: string, offset: number, chunk: Blob) => {
    const formData = new FormData();
    formData.append("offset", String(offset));
    formData.append("chunk", chunk);
    return apiClient.put<{ received_bytes: number; total_size: number; percent_complete: number }>(
      `/teacher/video-upload/${uploadId}/chunk/`,
      formData,
      { isForm: true }
    );
  },

  getUploadStatus: (uploadId: string) =>
    apiClient.get<{ received_bytes: number; total_size: number; percent_complete: number; status: string }>(
      `/teacher/video-upload/${uploadId}/chunk/`
    ),

  completeUpload: (uploadId: string) =>
    apiClient.post<{ message: string; variant_item_id: string; content_duration: string | null }>(
      `/teacher/video-upload/${uploadId}/complete/`
    ),

  // Lesson materials (slides, handouts, etc.) -- plain multipart, no size limit
  uploadMaterial: (lessonId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post<LessonMaterial>(`/teacher/lesson-material/${lessonId}/`, formData, { isForm: true });
  },

  deleteMaterial: (lessonId: string, materialId: number) =>
    apiClient.delete(`/teacher/lesson-material/${lessonId}/${materialId}/`),
};
