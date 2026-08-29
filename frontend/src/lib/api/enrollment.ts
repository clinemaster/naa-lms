import { apiClient } from "./client";
import type { EnrolledCourse } from "../types";

export const enrollmentApi = {
  enroll: (courseId: number) =>
    apiClient.post<{ message: string; enrolled_course_id: string }>("/course/enroll/", { course_id: courseId }),

  myCourses: (userId: number) => apiClient.get<EnrolledCourse[]>(`/student/course-list/${userId}/`),

  courseDetail: (userId: number, enrollmentId: number) =>
    apiClient.get<EnrolledCourse>(`/student/course-detail/${userId}/${enrollmentId}/`),

  summary: (userId: number) =>
    apiClient.get<{ total_courses: number; completed_lessons: number; achieved_certificates: number }>(
      `/student/summary/${userId}/`
    ),
};
