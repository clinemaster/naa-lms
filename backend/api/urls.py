from api import views as api_views
from django.urls import path
from . import views

from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    #Endpoints for User Authentication

    path('user/token/', api_views.MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('user/token/refresh/', TokenRefreshView.as_view()),
    path('user/register/', api_views.RegisterView.as_view()),
    path('user/password-reset/<email>/', api_views.PasswordResetEmailVerifyAPIView.as_view()),
    path('user/password-change/', api_views.PasswordChangeAPIView.as_view()),
    path('user/profile/<user_id>/', api_views.ProfileAPIView.as_view()),
    path('user/change-password/', api_views.ChangePasswordAPIView.as_view()),

    #Core Endpoints
    path('course/category/', api_views.CategoryListAPIView.as_view()),
    path('course/course-list/', api_views.CourseListAPIView.as_view()),
    path('course/course-detail/<slug>/', api_views.CourseDetailAPIView.as_view()),
    path('course/search/', api_views.SearchCourseAPIView.as_view()),
    path('course/enroll/', api_views.EnrollCourseAPIView.as_view()),


    #Student API Endpoints
    path('student/summary/<int:user_id>/', api_views.StudentSummaryAPIView.as_view()),
    path('student/course-list/<int:user_id>/', api_views.StudentCourseListAPIView.as_view()),
    path('student/course-detail/<int:user_id>/<int:enrollment_id>/', api_views.StudentCourseDetailAPIView.as_view()),
    path('student/course-note/<int:user_id>/<int:enrolled_course_id>/', api_views.StudentNoteCreateAPIView.as_view()),
    path('student/course-note-details/<int:user_id>/<int:enrolled_course_id>/<int:note_id>/', api_views.StudentNoteDetailAPIView.as_view()),
    path('student/rate-course/', api_views.StudentRateCourseCreateAPIView.as_view()),
    path('student/review-detail/<int:user_id>/<int:review_id>/', api_views.StudentRateCourseUpdateAPIView.as_view()),
    path('student/wishlist/<int:user_id>/', api_views.StudentWishListListCreateAPIView.as_view()),
    path('student/question-answer-list-create/<int:course_id>/', api_views.QuestionAnswerListCreateAPIView.as_view()),
    path('student/question-answer-message-create/', api_views.QuestionAnswerMessageSendAPIView.as_view()),
    path('student/certificates/<int:user_id>/', api_views.StudentCertificateListAPIView.as_view()),
    path('teacher/question-answer-message-create/', api_views.QuestionAnswerMessageSendAPIView.as_view()),

    #Lesson progress + video access (student, sequential/anti-skip enforced server-side)
    path('lesson/<str:variant_item_id>/progress/', api_views.LessonProgressAPIView.as_view()),
    path('lesson/<str:variant_item_id>/video-access/', api_views.VideoAccessAPIView.as_view()),
    path('lesson/<str:variant_item_id>/video-stream/', api_views.VideoStreamAPIView.as_view()),

    #Certificate verification (public, via QR code)
    path('certificates/verify/<str:certificate_id>/', api_views.CertificateVerifyAPIView.as_view()),

    #Teacher API Endpoints
    path('teacher/summary/<int:teacher_id>/', api_views.TeacherSummaryAPIView.as_view()),
    path('teacher/course-lists/<int:teacher_id>/', api_views.TeacherCourseListAPIView.as_view()),
    path('teacher/review-lists/<int:teacher_id>/', api_views.TeacherReviewListAPIView.as_view()),
    path('teacher/review-detail/<int:teacher_id>/<int:review_id>/', api_views.TeacherReviewDetailAPIView.as_view()),
    path('teacher/student-lists/<int:teacher_id>/', api_views.TeacherStudentListAPIView.as_view({'get': 'list'})),

    path('teacher/all-months-enrollments/<int:teacher_id>/', api_views.TeacherStudentListAPIView.as_view({'get': 'TeacherAllMonthlyEnrollmentAPIView'})),
    path('teacher/best-selling-courses/<int:teacher_id>/', api_views.TeacherBestSellingCourseAPIView.as_view({'get': 'list'})),
    path('teacher/question-answer-list/<int:teacher_id>/', api_views.TeacherQuestionAnswerListAPIView.as_view()),
    path('teacher/notification-list/<int:teacher_id>/', api_views.TeacherNotificationListAPIView.as_view()),
    path('teacher/notification-detail/<int:teacher_id>/<int:notification_id>/', api_views.TeacherNotificationDetailAPIView.as_view()),
    path('teacher/course-create/', api_views.CourseCreateAPIView.as_view()),
    path('teacher/course-update/<int:teacher_id>/<int:course_id>/', api_views.CourseUpdateAPIView.as_view()),
    path('teacher/course-submit/<int:teacher_id>/<int:course_id>/', api_views.CourseSubmitForReviewAPIView.as_view()),

    path('teacher/course-detail/<int:course_id>/', api_views.CourseDetailsAPIView.as_view()),
    path('teacher/variant-delete/<int:variant_id>/<int:teacher_id>/<int:course_id>/', api_views.CourseVariantDeleteAPIView.as_view()),
    path('teacher/variant-item-delete/<int:variant_id>/<int:variant_item_id>/<int:teacher_id>/', api_views.CourseVariantItemDeleteAPIView.as_view()),

    #Teacher video upload (resumable, local-disk chunked upload)
    path('teacher/video-upload/init/', api_views.VideoUploadInitAPIView.as_view()),
    path('teacher/video-upload/<str:upload_id>/chunk/', api_views.VideoUploadChunkAPIView.as_view()),
    path('teacher/video-upload/<str:upload_id>/complete/', api_views.VideoUploadCompleteAPIView.as_view()),

    #Teacher lesson materials (plain multipart upload, no chunking)
    path('teacher/lesson-material/<str:lesson_id>/', api_views.LessonMaterialListCreateAPIView.as_view()),
    path('teacher/lesson-material/<str:lesson_id>/<int:material_id>/', api_views.LessonMaterialDeleteAPIView.as_view()),

    #Admin API Endpoints
    path('admin/summary/', api_views.AdminDashboardSummaryAPIView.as_view()),
    path('admin/users/', api_views.AdminUserListCreateAPIView.as_view()),
    path('admin/users/<int:user_id>/', api_views.AdminUserDetailAPIView.as_view()),
    path('admin/courses/', api_views.AdminCourseListAPIView.as_view()),
    path('admin/courses/<int:course_id>/', api_views.AdminCourseDetailAPIView.as_view()),
    path('admin/courses/<int:course_id>/approve/', api_views.AdminCourseApproveAPIView.as_view()),
    path('admin/courses/<int:course_id>/reject/', api_views.AdminCourseRejectAPIView.as_view()),
    path('admin/courses/<int:course_id>/publish/', api_views.AdminCoursePublishAPIView.as_view()),
    path('admin/courses/<int:course_id>/unpublish/', api_views.AdminCourseUnpublishAPIView.as_view()),
    path('admin/enrollments/', api_views.AdminEnrollmentListAPIView.as_view()),
    path('admin/site-configuration/', api_views.SiteConfigurationAPIView.as_view()),
]
