import shutil
import tempfile

from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile

from userauths.models import User, ROLE_STUDENT, ROLE_TEACHER, ROLE_ADMIN
from api import models as api_models
from core.models import SiteConfiguration

TEST_MEDIA_ROOT = tempfile.mkdtemp(prefix='naa_lms_test_media_')


def tearDownModule():
    shutil.rmtree(TEST_MEDIA_ROOT, ignore_errors=True)


def make_user(email, role=ROLE_STUDENT, password='Str0ngPass!123'):
    user = User.objects.create_user(username=email.split('@')[0], email=email, password=password, full_name=email)
    user.role = role
    if role == ROLE_ADMIN:
        user.is_superuser = True
        user.is_staff = True
    user.save()
    return user


class RoleAndAuthTests(APITestCase):
    def test_register_creates_student_by_default(self):
        response = self.client.post('/api/v1/user/register/', {
            'email': 'newstudent@example.com',
            'password': 'Str0ngPass!123',
            'password2': 'Str0ngPass!123',
            'full_name': 'New Student',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        user = User.objects.get(email='newstudent@example.com')
        self.assertEqual(user.role, ROLE_STUDENT)

    def test_token_includes_role_claim(self):
        make_user('teacherlogin@example.com', role=ROLE_TEACHER)
        response = self.client.post('/api/v1/user/token/', {
            'email': 'teacherlogin@example.com',
            'password': 'Str0ngPass!123',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIn('access', response.data)


class IDORProtectionTests(APITestCase):
    def setUp(self):
        self.alice = make_user('alice@example.com')
        self.bob = make_user('bob@example.com')

    def test_student_cannot_read_another_students_summary(self):
        self.client.force_authenticate(self.alice)
        response = self.client.get(f'/api/v1/student/summary/{self.bob.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_can_read_own_summary(self):
        self.client.force_authenticate(self.alice)
        response = self.client.get(f'/api/v1/student/summary/{self.alice.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_anonymous_cannot_read_summary(self):
        response = self.client.get(f'/api/v1/student/summary/{self.alice.id}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_change_password_uses_authenticated_user_not_body_id(self):
        self.client.force_authenticate(self.alice)
        response = self.client.post('/api/v1/user/change-password/', {
            'user_id': self.bob.id,  # attempted spoof, must be ignored
            'old_password': 'Str0ngPass!123',
            'new_password': 'NewPass!456',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.bob.refresh_from_db()
        self.assertTrue(self.bob.check_password('Str0ngPass!123'))  # untouched
        self.alice.refresh_from_db()
        self.assertTrue(self.alice.check_password('NewPass!456'))


def build_course_with_lessons(teacher_user, lesson_count=3):
    teacher = api_models.Teacher.objects.create(user=teacher_user, full_name=teacher_user.full_name)
    category, _ = api_models.Category.objects.get_or_create(title='Financial Audit')
    course = api_models.Course.objects.create(
        teacher=teacher,
        category=category,
        title='Audit Fundamentals',
        description='Learn the fundamentals of financial auditing.',
        image=SimpleUploadedFile('course.jpg', b'fake-image-bytes', content_type='image/jpeg'),
    )
    variant = api_models.Variant.objects.create(course=course, title='Module 1', order=1)
    items = []
    for i in range(1, lesson_count + 1):
        item = api_models.VariantItem.objects.create(
            variant=variant,
            title=f'Lesson {i}',
            order=i,
            duration_seconds=100,
        )
        items.append(item)
    return teacher, course, items


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class CourseWorkflowTests(APITestCase):
    def setUp(self):
        self.teacher_user = make_user('teacher@example.com', role=ROLE_TEACHER)
        self.admin_user = make_user('admin@example.com', role=ROLE_ADMIN)
        self.teacher, self.course, self.items = build_course_with_lessons(self.teacher_user)
        self.course.platform_status = 'Draft'
        self.course.teacher_course_status = 'Draft'
        self.course.save()

    def test_submission_fails_without_video(self):
        self.client.force_authenticate(self.teacher_user)
        response = self.client.post(f'/api/v1/teacher/course-submit/{self.teacher.id}/{self.course.id}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('errors', response.data)

    def test_full_review_workflow_approve_and_publish(self):
        for item in self.items:
            item.file = SimpleUploadedFile(f'{item.id}.mp4', b'fake-video-bytes')
            item.save()

        self.client.force_authenticate(self.teacher_user)
        submit_response = self.client.post(f'/api/v1/teacher/course-submit/{self.teacher.id}/{self.course.id}/')
        self.assertEqual(submit_response.status_code, status.HTTP_200_OK, submit_response.data)

        self.course.refresh_from_db()
        self.assertEqual(self.course.platform_status, 'Review')

        # A non-admin cannot approve.
        approve_denied = self.client.post(f'/api/v1/admin/courses/{self.course.id}/approve/')
        self.assertEqual(approve_denied.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.admin_user)
        approve_response = self.client.post(f'/api/v1/admin/courses/{self.course.id}/approve/')
        self.assertEqual(approve_response.status_code, status.HTTP_200_OK)

        self.course.refresh_from_db()
        self.assertEqual(self.course.platform_status, 'Published')
        self.assertEqual(self.course.teacher_course_status, 'Published')

    def test_reject_requires_reason(self):
        self.course.platform_status = 'Review'
        self.course.save()
        self.client.force_authenticate(self.admin_user)
        response = self.client.post(f'/api/v1/admin/courses/{self.course.id}/reject/', {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post(f'/api/v1/admin/courses/{self.course.id}/reject/', {'reason': 'Needs more detail.'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.course.refresh_from_db()
        self.assertEqual(self.course.platform_status, 'Rejected')
        self.assertEqual(self.course.rejection_reason, 'Needs more detail.')


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class EnrollmentTests(APITestCase):
    def setUp(self):
        self.teacher_user = make_user('teacher2@example.com', role=ROLE_TEACHER)
        self.student = make_user('student@example.com')
        self.teacher, self.course, self.items = build_course_with_lessons(self.teacher_user)
        self.course.platform_status = 'Published'
        self.course.teacher_course_status = 'Published'
        self.course.save()

    def test_student_can_enroll(self):
        self.client.force_authenticate(self.student)
        response = self.client.post('/api/v1/course/enroll/', {'course_id': self.course.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(api_models.EnrolledCourse.objects.filter(course=self.course, user=self.student).exists())

    def test_duplicate_enrollment_rejected(self):
        api_models.EnrolledCourse.objects.create(course=self.course, user=self.student, teacher=self.teacher)
        self.client.force_authenticate(self.student)
        response = self.client.post('/api/v1/course/enroll/', {'course_id': self.course.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_teacher_cannot_enroll_in_own_course(self):
        self.client.force_authenticate(self.teacher_user)
        response = self.client.post('/api/v1/course/enroll/', {'course_id': self.course.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unpublished_course_cannot_be_enrolled(self):
        self.course.platform_status = 'Draft'
        self.course.save()
        self.client.force_authenticate(self.student)
        response = self.client.post('/api/v1/course/enroll/', {'course_id': self.course.id})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class LessonProgressTests(APITestCase):
    def setUp(self):
        self.teacher_user = make_user('teacher3@example.com', role=ROLE_TEACHER)
        self.student = make_user('student3@example.com')
        self.teacher, self.course, self.items = build_course_with_lessons(self.teacher_user, lesson_count=3)
        self.course.platform_status = 'Published'
        self.course.teacher_course_status = 'Published'
        self.course.save()
        self.enrollment = api_models.EnrolledCourse.objects.create(course=self.course, user=self.student, teacher=self.teacher)
        self.client.force_authenticate(self.student)

    def _progress_url(self, item):
        return f'/api/v1/lesson/{item.variant_item_id}/progress/'

    def test_cannot_report_progress_without_enrollment(self):
        outsider = make_user('outsider@example.com')
        self.client.force_authenticate(outsider)
        response = self.client.post(self._progress_url(self.items[0]), {'position': 10, 'duration': 100})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anti_skip_clamps_forward_jump(self):
        response = self.client.post(self._progress_url(self.items[0]), {'position': 95, 'duration': 100})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # SEEK_TOLERANCE_SECONDS = 15, so from a 0 baseline only 15s is allowed through.
        self.assertEqual(response.data['max_watched_position'], 15)
        self.assertFalse(response.data['completed'])

    def test_legitimate_progressive_watching_completes_lesson(self):
        # Heartbeats arrive roughly every 10s of real playback, well inside
        # the 15s anti-skip tolerance, so each report should stick as-is.
        newly_completed_seen = False
        for position in range(10, 101, 10):
            response = self.client.post(self._progress_url(self.items[0]), {'position': position, 'duration': 100})
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            newly_completed_seen = newly_completed_seen or response.data['lesson_newly_completed']
        self.assertTrue(response.data['completed'])
        self.assertTrue(newly_completed_seen)

    def test_second_lesson_locked_until_first_completed(self):
        response = self.client.get(self._progress_url(self.items[1]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['unlocked'])

        response = self.client.post(self._progress_url(self.items[1]), {'position': 10, 'duration': 100})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_sequential_lock_can_be_disabled_platform_wide(self):
        config = SiteConfiguration.get_solo()
        config.sequential_learning_enabled = False
        config.save()

        response = self.client.get(self._progress_url(self.items[1]))
        self.assertTrue(response.data['unlocked'])

    def test_completing_all_lessons_completes_course_and_issues_certificate(self):
        for item in self.items:
            for position in range(10, 101, 10):
                response = self.client.post(self._progress_url(item), {'position': position, 'duration': 100})
                self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        self.enrollment.refresh_from_db()
        self.assertIsNotNone(self.enrollment.completed_at)
        self.assertTrue(api_models.Certificate.objects.filter(course=self.course, user=self.student).exists())


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class VideoAccessTests(APITestCase):
    def setUp(self):
        self.teacher_user = make_user('teacher4@example.com', role=ROLE_TEACHER)
        self.student = make_user('student4@example.com')
        self.outsider = make_user('outsider2@example.com')
        self.teacher, self.course, self.items = build_course_with_lessons(self.teacher_user, lesson_count=1)
        self.items[0].file = SimpleUploadedFile('lesson.mp4', b'fake-video-bytes')
        self.items[0].save()
        self.course.platform_status = 'Published'
        self.course.teacher_course_status = 'Published'
        self.course.save()
        api_models.EnrolledCourse.objects.create(course=self.course, user=self.student, teacher=self.teacher)

    def test_enrolled_student_gets_signed_url(self):
        self.client.force_authenticate(self.student)
        response = self.client.get(f'/api/v1/lesson/{self.items[0].variant_item_id}/video-access/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token=', response.data['url'])

    def test_non_enrolled_user_denied_access(self):
        self.client.force_authenticate(self.outsider)
        response = self.client.get(f'/api/v1/lesson/{self.items[0].variant_item_id}/video-access/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AdminUserManagementTests(APITestCase):
    def setUp(self):
        self.admin_user = make_user('admin2@example.com', role=ROLE_ADMIN)
        self.student = make_user('student5@example.com')

    def test_non_admin_cannot_list_users(self):
        self.client.force_authenticate(self.student)
        response = self.client.get('/api/v1/admin/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_creates_teacher_and_teacher_profile_is_provisioned(self):
        self.client.force_authenticate(self.admin_user)
        response = self.client.post('/api/v1/admin/users/', {
            'email': 'newteacher@example.com',
            'full_name': 'New Teacher',
            'role': ROLE_TEACHER,
            'password': 'Str0ngPass!123',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        new_user = User.objects.get(email='newteacher@example.com')
        self.assertTrue(api_models.Teacher.objects.filter(user=new_user).exists())

    def test_admin_can_promote_student_to_teacher(self):
        self.client.force_authenticate(self.admin_user)
        response = self.client.patch(f'/api/v1/admin/users/{self.student.id}/', {'role': ROLE_TEACHER})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(api_models.Teacher.objects.filter(user_id=self.student.id).exists())


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class SensitiveDataLeakTests(APITestCase):
    """Guards against Meta.depth-style serializers dumping raw related-model
    fields (password hash, otp, refresh_token, ...) onto API responses.
    Regression test for a real vulnerability found in course-list/enrollment
    responses -- see serializer.py's CourseSerializer/EnrolledCourseSerializer/
    CertificateSerializer history."""

    FORBIDDEN_SNIPPETS = ['"password"', '"otp"', '"refresh_token"', '"is_superuser"', '"user_permissions"']

    def setUp(self):
        self.teacher_user = make_user('leaktest_teacher@example.com', role=ROLE_TEACHER)
        self.student = make_user('leaktest_student@example.com')
        self.teacher, self.course, self.items = build_course_with_lessons(self.teacher_user)
        self.course.platform_status = 'Published'
        self.course.teacher_course_status = 'Published'
        self.course.save()
        self.enrollment = api_models.EnrolledCourse.objects.create(course=self.course, user=self.student, teacher=self.teacher)

    def _assert_clean(self, response):
        body = response.content.decode('utf-8')
        for snippet in self.FORBIDDEN_SNIPPETS:
            self.assertNotIn(snippet, body, f"{snippet} leaked in response body")

    def test_public_course_list_does_not_leak_user_fields(self):
        response = self.client.get('/api/v1/course/course-list/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self._assert_clean(response)

    def test_public_course_detail_does_not_leak_user_fields(self):
        response = self.client.get(f'/api/v1/course/course-detail/{self.course.slug}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self._assert_clean(response)

    def test_student_course_list_does_not_leak_user_fields(self):
        self.client.force_authenticate(self.student)
        response = self.client.get(f'/api/v1/student/course-list/{self.student.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self._assert_clean(response)

    def test_certificate_serializer_does_not_leak_user_fields(self):
        certificate = api_models.Certificate.objects.create(course=self.course, user=self.student)
        self.client.force_authenticate(self.student)
        response = self.client.get(f'/api/v1/certificates/verify/{certificate.certificate_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self._assert_clean(response)
        self.assertIn('student_name', response.data)
