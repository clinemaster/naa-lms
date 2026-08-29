export type Role = "Student" | "Teacher" | "Admin";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: Role;
  teacher_id: number | null;
}

export interface Category {
  id: number;
  title: string;
  image: string | null;
  slug: string;
  course_count: number;
}

export type PlatformStatus = "Draft" | "Review" | "Published" | "Disabled" | "Rejected";

export interface LessonMaterial {
  id: number;
  file: string;
  original_filename: string;
  uploaded_at: string;
}

export interface VariantItem {
  id: number;
  variant_item_id: string;
  title: string;
  order: number;
  description: string | null;
  preview: boolean;
  content_duration: string | null;
  duration_seconds: number | null;
  file: string | null;
  materials: LessonMaterial[];
}

export interface Variant {
  id: number;
  variant_id: string;
  title: string;
  order: number;
  variant_items: VariantItem[];
  items: VariantItem[];
}

export interface Review {
  id: number;
  user: number;
  rating: number;
  review: string | null;
  date: string;
  profile?: { full_name: string; image: string | null };
}

export interface Course {
  id: number;
  course_id: string;
  // The API's Meta.depth setting nests this as a full Category object on
  // GET responses; extract the id with categoryIdOf() rather than reading
  // it directly.
  category: Category | number | null;
  teacher: number;
  teacher_name?: string;
  title: string;
  slug: string;
  image: string | null;
  description: string | null;
  language: string;
  level: string;
  platform_status: PlatformStatus;
  teacher_course_status: string;
  featured: boolean;
  date: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  curriculum: Variant[];
  total_lessons: number;
  average_rating: number | null;
  rating_count: number;
  reviews: Review[];
}

export interface LessonProgress {
  id: number;
  variant_item: number;
  variant_item_title?: string;
  current_position: number;
  max_watched_position: number;
  completion_percentage: number;
  completed: boolean;
}

export interface EnrolledCourse {
  id: number;
  enrolled_course_id: string;
  course: Course;
  date: string;
  completed_at: string | null;
  progress_percentage: number;
  is_course_completed: boolean;
  completed_lesson: LessonProgress[];
  curriculum: Variant[];
}

export interface Certificate {
  id: number;
  course: Course;
  student_name: string;
  certificate_id: string;
  certificate_number: string;
  pdf: string | null;
  date: string;
}

export interface ProgressHeartbeatResponse {
  current_position: number;
  max_watched_position: number;
  completion_percentage: number;
  completed: boolean;
  lesson_newly_completed: boolean;
  course_progress_percentage: number;
  course_completed: boolean;
  course_completed_now: boolean;
}

export interface LessonAccessResponse {
  unlocked: boolean;
  current_position: number;
  max_watched_position: number;
  completion_percentage: number;
  completed: boolean;
}

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  date_joined: string;
}

export interface AdminSummary {
  total_users: number;
  students: number;
  teachers: number;
  courses: number;
  published_courses: number;
  pending_review: number;
  enrollments: number;
  completed_courses: number;
}

export interface TeacherCourseListItem {
  id: number;
  course_id: string;
  title: string;
  image: string | null;
  level: string;
  teacher_course_status: string;
  date: string;
  students: { enrolled: number };
}

export interface ApiError {
  message?: string;
  detail?: string;
  errors?: string[];
  [key: string]: unknown;
}
