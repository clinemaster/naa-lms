from datetime import timedelta
import json
import os

from django.db.models.functions import ExtractMonth
from django.shortcuts import render, redirect
from django.utils import timezone
from django.db.models import Sum, Count
from django.core.files.uploadedfile import InMemoryUploadedFile
import rest_framework
from rest_framework.decorators import api_view
from rest_framework import generics, status, viewsets
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from api import serializer as api_serializer
from userauths.models import User, UserProfile, ROLE_STUDENT, ROLE_TEACHER, ROLE_ADMIN
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import NotFound, ValidationError, PermissionDenied
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from api import models as api_models
from api import permissions as api_permissions
from api.video_streaming import make_video_token, read_video_token, serve_ranged_file, VIDEO_TOKEN_MAX_AGE
from core.models import SiteConfiguration
from django.contrib.auth.hashers import check_password
from django.core.signing import BadSignature, SignatureExpired
import random
import logging

logger = logging.getLogger(__name__)


def parse_bool(value):
    if isinstance(value, bool):
        return value

    normalized = str(value).strip().lower()
    return normalized in ('1', 'true', 't', 'yes', 'y', 'on')


def extract_numeric_id(value):
    if isinstance(value, dict):
        value = value.get('id') or value.get('value') or value.get('pk')

    if isinstance(value, str):
        raw_value = value.strip()
        if raw_value in ('', 'null', 'undefined', 'NaN', '[object Object]'):
            return None

        if raw_value.startswith('{') and raw_value.endswith('}'):
            try:
                parsed_value = json.loads(raw_value)
                return extract_numeric_id(parsed_value)
            except Exception:
                return None

        if raw_value.isdigit():
            return int(raw_value)

        return None

    if isinstance(value, int):
        return value

    return None

def issue_certificate(enrollment):
    """Generate (or return the existing) certificate for a completed enrollment.

    Only ever called after EnrolledCourse.is_course_completed() has been
    verified server-side -- the frontend has no way to trigger this directly.
    """
    existing = api_models.Certificate.objects.filter(course=enrollment.course, user=enrollment.user).first()
    if existing:
        return existing

    certificate = api_models.Certificate.objects.create(course=enrollment.course, user=enrollment.user)

    try:
        _render_certificate_pdf(certificate, enrollment)
    except Exception:
        logger.exception("Failed to render certificate PDF for certificate_id=%s", certificate.certificate_id)

    return certificate


def _render_certificate_pdf(certificate, enrollment):
    import io
    import qrcode
    from reportlab.lib.pagesizes import landscape, A4
    from reportlab.lib.units import cm
    from reportlab.pdfgen import canvas
    from django.core.files.base import ContentFile

    verify_url = f"{settings.FRONTEND_URL}/certificates/verify/{certificate.certificate_id}/"

    qr_img = qrcode.make(verify_url)
    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)

    from reportlab.lib.utils import ImageReader
    qr_reader = ImageReader(qr_buffer)

    pdf_buffer = io.BytesIO()
    page_size = landscape(A4)
    c = canvas.Canvas(pdf_buffer, pagesize=page_size)
    width, height = page_size

    student_name = enrollment.user.full_name if enrollment.user else "Student"
    course_title = enrollment.course.title
    completion_date = certificate.date.strftime('%d %B %Y')

    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(width / 2, height - 4 * cm, "NATIONAL AUDIT ACADEMY")

    c.setFont("Helvetica", 16)
    c.drawCentredString(width / 2, height - 5.2 * cm, "Certificate of Completion")

    c.setFont("Helvetica", 12)
    c.drawCentredString(width / 2, height - 7 * cm, "This certifies that")

    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(width / 2, height - 8.2 * cm, student_name)

    c.setFont("Helvetica", 12)
    c.drawCentredString(width / 2, height - 9.4 * cm, "has successfully completed the course")

    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(width / 2, height - 10.6 * cm, course_title)

    c.setFont("Helvetica", 11)
    c.drawCentredString(width / 2, height - 12 * cm, f"Course code: {enrollment.course.course_id}")
    c.drawCentredString(width / 2, height - 12.7 * cm, f"Completion date: {completion_date}")
    c.drawCentredString(width / 2, height - 13.4 * cm, f"Certificate number: {certificate.certificate_number}")

    qr_size = 3 * cm
    c.drawImage(qr_reader, 2 * cm, 2 * cm, width=qr_size, height=qr_size)
    c.setFont("Helvetica", 8)
    c.drawString(2 * cm, 1.7 * cm, "Scan to verify")

    c.showPage()
    c.save()
    pdf_buffer.seek(0)

    certificate.pdf.save(f"certificate_{certificate.certificate_id}.pdf", ContentFile(pdf_buffer.read()), save=True)


# Create your views here.


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = api_serializer.CustomTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    serializer_class = api_serializer.RegisterSerializer
    queryset = api_serializer.User.objects.all()    
    permission_classes = [AllowAny]  # Allow any user (authenticated or not) to access this viewset
    serializer_class = api_serializer.RegisterSerializer

def generate_random_otp(length=6):
    try:
        length = int(length)
    except (TypeError, ValueError):
        length = 6

    if length <= 0:
        length = 6

    return ''.join(str(random.randint(0, 9)) for _ in range(length))

class PasswordResetEmailVerifyAPIView(generics.GenericAPIView):
    serializer_class = api_serializer.UserSerializer
    queryset = api_serializer.User.objects.all()
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        email = self.kwargs['email']

        user = User.objects.filter(email=email).first()
        if not user:
            raise NotFound("User with this email does not exist.")

        uuidb64 = user.pk
        refresh = RefreshToken.for_user(user)
        refresh_token = str(refresh.access_token)
        user.refresh_token = refresh_token
        user.otp = generate_random_otp(6)
        user.save(update_fields=['refresh_token', 'otp'])

        link = f"{settings.FRONTEND_URL}/reset-new-password/?otp={user.otp}&uuidb64={uuidb64}&refresh_token={refresh_token}"
        merge_data = {
            'link': link,
            'username': user.username,
        }

        try:
            text_body = render_to_string('email/password_reset_email.txt', merge_data)
            html_body = render_to_string('email/password_reset_email.html', merge_data)

            msg = EmailMultiAlternatives(
                subject='Password Reset Request',
                from_email=settings.FROM_EMAIL,
                to=[user.email],
                body=text_body,
            )
            msg.attach_alternative(html_body, "text/html")
            msg.send()
        except Exception:
            logger.exception("Failed to send password reset email for user_id=%s", user.id)
            if settings.DEBUG:
                return Response(
                    {
                        "message": "Password reset email could not be sent. Using debug fallback.",
                        "reset_link": link,
                        "otp": user.otp,
                        "uuidb64": uuidb64,
                        "refresh_token": refresh_token,
                    },
                    status=status.HTTP_200_OK,
                )

            return Response(
                {"message": "Password reset email could not be sent. Check email configuration."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({"message": "Password reset email sent successfully."}, status=status.HTTP_200_OK)
    
class PasswordChangeAPIView(generics.GenericAPIView):
    serializer_class = api_serializer.PasswordChangeSerializer
    queryset = api_serializer.User.objects.all()
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        otp = serializer.validated_data['otp']
        uuidb64 = serializer.validated_data['uuidb64']
        password = serializer.validated_data['password']
        serializer = self.get_serializer(data=request.data)

        user = User.objects.filter(pk=uuidb64, otp=otp).first()
        if user:
            user.set_password(password)
            user.save()

            return Response({"message": "Password changed successfully."}, status=status.HTTP_200_OK)
        else:
            return Response({"message": "User Does Not Exist."}, status=status.HTTP_400_BAD_REQUEST)

class ChangePasswordAPIView(generics.CreateAPIView):
    serializer_class = api_serializer.UserSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        user = request.user
        if check_password(old_password, user.password):
            user.set_password(new_password)
            user.save()
            return Response({"message": "Password changed successfully.", "icon":"success"}, status=status.HTTP_200_OK)
        else:
            return Response({"message": "Old password is incorrect.", "icon":"warning"}, status=status.HTTP_400_BAD_REQUEST)

class ProfileAPIView(generics.RetrieveUpdateAPIView):
    serializer_class = api_serializer.UserProfileSerializer
    queryset = api_models.UserProfile.objects.all()
    permission_classes = [api_permissions.IsSelfOrAdmin]

    def get_object(self):
        user_id = self.kwargs['user_id']
        user_profile = api_models.UserProfile.objects.filter(user__id=user_id).first()
        if not user_profile:
            raise NotFound("User profile with this id does not exist.")
        return user_profile
        
class CategoryListAPIView(generics.ListAPIView):
    serializer_class = api_serializer.CategorySerializer
    queryset = api_models.Category.objects.filter(active=True)
    permission_classes = [AllowAny] 

class CourseListAPIView(generics.ListAPIView):
    serializer_class = api_serializer.CourseSerializer
    queryset = api_models.Course.objects.filter(platform_status="Published", teacher_course_status="Published")
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = self.queryset.all()
        category = self.request.query_params.get('category')
        level = self.request.query_params.get('level')
        if category:
            queryset = queryset.filter(category__slug=category)
        if level:
            queryset = queryset.filter(level=level)
        return queryset

class CourseDetailAPIView(generics.RetrieveAPIView):
    serializer_class = api_serializer.CourseSerializer
    queryset = api_models.Course.objects.filter(platform_status = "Published", teacher_course_status = "Published")
    permission_classes = [AllowAny]

    def get_object(self):
        slug = self.kwargs['slug']
        course = api_models.Course.objects.filter(slug=slug, platform_status = "Published", teacher_course_status = "Published").first()
        if not course:
            raise NotFound("Course with this slug does not exist.")
        return course

class EnrollCourseAPIView(generics.CreateAPIView):
    serializer_class = api_serializer.EnrolledCourseSerializer
    queryset = api_models.EnrolledCourse.objects.all()
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        course_id = extract_numeric_id(
            request.data.get('course_id')
            or request.data.get('course')
            or request.data.get('id')
        )

        if not course_id:
            return Response({"message": "course_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        course = api_models.Course.objects.filter(
            id=course_id, platform_status="Published", teacher_course_status="Published"
        ).first()
        if not course:
            return Response({"message": "Course not found."}, status=status.HTTP_404_NOT_FOUND)

        if api_models.Teacher.objects.filter(id=course.teacher_id, user=request.user).exists():
            return Response({"message": "You cannot enroll in your own course."}, status=status.HTTP_400_BAD_REQUEST)

        if api_models.EnrolledCourse.objects.filter(course=course, user=request.user).exists():
            return Response({"message": "You are already enrolled in this course.", "icon": "warning"}, status=status.HTTP_400_BAD_REQUEST)

        enrollment = api_models.EnrolledCourse.objects.create(
            course=course,
            user=request.user,
            teacher=course.teacher,
        )

        api_models.Notification.objects.create(
            teacher=course.teacher,
            course=course,
            type="Course Enrollement Completed",
        )

        return Response(
            {
                "message": "Enrolled successfully.",
                "icon": "success",
                "enrolled_course_id": enrollment.enrolled_course_id,
            },
            status=status.HTTP_201_CREATED,
        )

class SearchCourseAPIView(generics.ListAPIView):
    serializer_class = api_serializer.CourseSerializer
    queryset = api_models.Course.objects.filter(platform_status = "Published", teacher_course_status = "Published")
    permission_classes = [AllowAny]

    def get_queryset(self):
        query = self.request.query_params.get('q', None)
        if not query:
            return self.queryset.none()

        queryset = self.queryset.filter(title__icontains=query)

        category = self.request.query_params.get('category')
        level = self.request.query_params.get('level')
        if category:
            queryset = queryset.filter(category__slug=category)
        if level:
            queryset = queryset.filter(level=level)
        return queryset

class StudentSummaryAPIView(generics.RetrieveAPIView):
    serializer_class = api_serializer.StudentSummarySerializer
    permission_classes = [api_permissions.IsSelfOrAdmin]

    def get_object(self):
        user_id = self.kwargs['user_id']
        user = User.objects.filter(id=user_id).first()
        if not user:
            raise NotFound("User with this id does not exist.")

        total_courses = api_models.EnrolledCourse.objects.filter(user=user).count()
        completed_lessons = api_models.LessonProgress.objects.filter(user=user, completed=True).count()
        achieved_certificates = api_models.Certificate.objects.filter(user=user).count()

        return {
            "total_courses": total_courses,
            "completed_lessons": completed_lessons,
            "achieved_certificates": achieved_certificates,
        }

class StudentCourseListAPIView(generics.ListAPIView):
    serializer_class = api_serializer.EnrolledCourseSerializer
    permission_classes = [api_permissions.IsSelfOrAdmin]

    def get_queryset(self):
        user_id = self.kwargs['user_id']

        user = User.objects.filter(id=user_id).first()
        if not user:
            raise NotFound("User with this id does not exist.")

        return api_models.EnrolledCourse.objects.filter(user=user)

class StudentCourseDetailAPIView(generics.RetrieveAPIView):
    serializer_class = api_serializer.EnrolledCourseSerializer
    permission_classes = [api_permissions.IsSelfOrAdmin]
    # lookup_field = 'enrollment_id'

    def get_object(self):
        user_id = self.kwargs['user_id']
        enrollment_id = self.kwargs['enrollment_id']

        user = User.objects.filter(id=user_id).first()
        if not user:
            raise NotFound("User with this id does not exist.")

        enrollment = api_models.EnrolledCourse.objects.filter(
            user=user,
            enrolled_course_id=enrollment_id,
        ).first()
        if not enrollment:
            raise NotFound("Enrollment with this id does not exist for this user.")

        return enrollment

class LessonProgressAPIView(generics.GenericAPIView):
    """Server-authoritative watch-progress heartbeat for a single lesson.

    The frontend posts here every few seconds while a video plays. The
    server -- never the client -- decides how far the student is allowed to
    have "reached" (max_watched_position), whether the lesson is complete,
    and therefore whether the next lesson unlocks.
    """
    serializer_class = api_serializer.LessonProgressSerializer
    permission_classes = [IsAuthenticated]

    # How far (in seconds) a client is allowed to report ahead of its
    # previously recorded max watched position in a single heartbeat. This
    # absorbs normal heartbeat cadence/network jitter without allowing a
    # scripted client to fast-forward through the video.
    SEEK_TOLERANCE_SECONDS = 15

    def _get_lesson_and_enrollment(self, request, variant_item_id):
        variant_item = api_models.VariantItem.objects.filter(variant_item_id=variant_item_id).first()
        if not variant_item:
            raise NotFound("Lesson with this id does not exist.")

        course = variant_item.variant.course
        enrollment = api_models.EnrolledCourse.objects.filter(course=course, user=request.user).first()
        if not enrollment:
            raise PermissionDenied("You are not enrolled in this course.")

        return variant_item, course, enrollment

    def _is_lesson_unlocked(self, course, user, variant_item):
        config = SiteConfiguration.get_solo()
        if not config.sequential_learning_enabled:
            return True

        ordered_items = list(
            api_models.VariantItem.objects.filter(variant__course=course).order_by('variant__order', 'order', 'date', 'id')
        )
        index = next((i for i, item in enumerate(ordered_items) if item.id == variant_item.id), None)
        if index is None or index == 0:
            return True

        previous_item = ordered_items[index - 1]
        return api_models.LessonProgress.objects.filter(user=user, variant_item=previous_item, completed=True).exists()

    def get(self, request, variant_item_id, *args, **kwargs):
        variant_item, course, enrollment = self._get_lesson_and_enrollment(request, variant_item_id)
        progress = api_models.LessonProgress.objects.filter(user=request.user, variant_item=variant_item).first()

        return Response({
            "unlocked": self._is_lesson_unlocked(course, request.user, variant_item),
            "current_position": progress.current_position if progress else 0,
            "max_watched_position": progress.max_watched_position if progress else 0,
            "completion_percentage": progress.completion_percentage if progress else 0,
            "completed": progress.completed if progress else False,
        })

    def post(self, request, variant_item_id, *args, **kwargs):
        variant_item, course, enrollment = self._get_lesson_and_enrollment(request, variant_item_id)

        if not self._is_lesson_unlocked(course, request.user, variant_item):
            raise PermissionDenied("Complete the previous lesson before starting this one.")

        try:
            reported_position = float(request.data.get('position', 0))
            reported_duration = float(request.data.get('duration') or 0)
        except (TypeError, ValueError):
            return Response({"message": "position and duration must be numeric."}, status=status.HTTP_400_BAD_REQUEST)

        reported_position = max(reported_position, 0)

        progress, _ = api_models.LessonProgress.objects.get_or_create(
            user=request.user,
            variant_item=variant_item,
            defaults={'course': course},
        )

        # Authoritative duration: prefer the value we already measured server-side
        # (via moviepy on upload) over whatever the client claims.
        duration = variant_item.duration_seconds or progress.duration or reported_duration
        duration = max(duration, 0)

        # Anti-skip: a client may never report a position more than a small
        # tolerance beyond the furthest point it has legitimately reached.
        allowed_ceiling = progress.max_watched_position + self.SEEK_TOLERANCE_SECONDS
        current_position = min(reported_position, allowed_ceiling)
        if duration:
            current_position = min(current_position, duration)

        progress.duration = duration
        progress.current_position = current_position
        progress.max_watched_position = max(progress.max_watched_position, current_position)

        if duration:
            progress.completion_percentage = min(round(progress.max_watched_position / duration * 100, 2), 100)
        else:
            progress.completion_percentage = 0

        config = SiteConfiguration.get_solo()
        newly_completed = False
        if not progress.completed and progress.completion_percentage >= config.lesson_completion_threshold:
            progress.completed = True
            newly_completed = True

        progress.save()

        course_completed_now = False
        if newly_completed and enrollment.is_course_completed() and not enrollment.completed_at:
            enrollment.completed_at = timezone.now()
            enrollment.save(update_fields=['completed_at'])
            course_completed_now = True
            issue_certificate(enrollment)
            api_models.Notification.objects.create(
                teacher=course.teacher,
                course=course,
                type="Course Enrollement Completed",
            )

        return Response({
            "current_position": progress.current_position,
            "max_watched_position": progress.max_watched_position,
            "completion_percentage": progress.completion_percentage,
            "completed": progress.completed,
            "lesson_newly_completed": newly_completed,
            "course_progress_percentage": enrollment.progress_percentage(),
            "course_completed": enrollment.is_course_completed(),
            "course_completed_now": course_completed_now,
        })

class StudentNoteCreateAPIView(generics.ListCreateAPIView):
    serializer_class = api_serializer.NoteSerializer
    permission_classes = [api_permissions.IsSelfOrAdmin]

    def _get_enrollment(self):
        user_id = self.kwargs['user_id']
        enrolled_course_id = self.kwargs['enrolled_course_id']

        user = User.objects.filter(id=user_id).first()
        if not user:
            raise NotFound("User with this id does not exist.")

        enrolled = api_models.EnrolledCourse.objects.filter(
            enrolled_course_id=enrolled_course_id,
            user=user,
        ).first()
        if not enrolled:
            raise NotFound("Enrollment with this id does not exist for this user.")

        return enrolled

    def get_queryset(self):
        enrolled = self._get_enrollment()
        return api_models.Note.objects.filter(user=enrolled.user, course=enrolled.course)

    def create(self, request, *args, **kwargs):
        enrolled = self._get_enrollment()
        title = request.data.get('title')
        note = request.data.get('note')

        if not title or not note:
            return Response(
                {"message": "title and note are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_models.Note.objects.create(
            user=enrolled.user,
            course=enrolled.course,
            title=title,
            note=note
        )

        return Response({"message": "Note created successfully."}, status=status.HTTP_201_CREATED)

class StudentNoteDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = api_serializer.NoteSerializer
    permission_classes = [api_permissions.IsSelfOrAdmin]

    def get_object(self):
        user_id = self.kwargs['user_id']
        enrolled_course_id = self.kwargs['enrolled_course_id']
        note_id = self.kwargs['note_id']

        user = User.objects.filter(id=user_id).first()
        if not user:
            raise NotFound("User with this id does not exist.")

        enrolled = api_models.EnrolledCourse.objects.filter(
            enrolled_course_id=enrolled_course_id,
            user=user,
        ).first()
        if not enrolled:
            raise NotFound("Enrollment with this id does not exist for this user.")

        note = api_models.Note.objects.filter(
            id=note_id,
            user=user,
            course=enrolled.course,
        ).first()
        if not note:
            raise NotFound("Note with this id does not exist for this course/user.")

        return note

class StudentRateCourseCreateAPIView(generics.CreateAPIView):
    serializer_class = api_serializer.ReviewSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        course_id = request.data.get('course_id')
        rating = request.data.get('rating')
        review = request.data.get('review')

        if not course_id or not rating:
            return Response(
                {"message": "course_id and rating are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user

        course = api_models.Course.objects.filter(id=course_id).first()
        if not course:
            raise NotFound("Course with this id does not exist.")

        if not api_models.EnrolledCourse.objects.filter(user=user, course=course).exists():
            return Response({"message": "You must be enrolled in this course to rate it."}, status=status.HTTP_400_BAD_REQUEST)

        existing_rating = api_models.Review.objects.filter(user=user, course=course).first()
        if existing_rating:
            return Response({"message": "You have already rated this course."}, status=status.HTTP_400_BAD_REQUEST)

        api_models.Review.objects.create(
            user=user,
            course=course,
            rating=rating,
            review=review
        )

        return Response({"message": "Rating submitted successfully."}, status=status.HTTP_201_CREATED)

class StudentRateCourseUpdateAPIView(generics.RetrieveUpdateAPIView):
    serializer_class = api_serializer.ReviewSerializer
    permission_classes = [api_permissions.IsSelfOrAdmin]

    def get_object(self):
        user_id = self.kwargs['user_id']
        review_id = self.kwargs['review_id']

        user = User.objects.filter(id=user_id).first()
        if not user:
            raise NotFound("User with this id does not exist.")

        review = api_models.Review.objects.filter(user=user, id=review_id).first()
        if not review:
            raise NotFound("Rating for this course/user does not exist.")

        return review

class StudentWishListListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = api_serializer.WishlistSerializer
    permission_classes = [api_permissions.IsSelfOrAdmin]

    @staticmethod
    def _normalize_id(value):
        if isinstance(value, dict):
            value = value.get('id')
        if value in (None, ''):
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    def get_queryset(self):
        user_id = self.kwargs.get('user_id')

        user = User.objects.filter(id=user_id).first()
        if not user:
            raise NotFound("User with this id does not exist.")

        return api_models.Wishlist.objects.filter(user=user)

    def create(self, request, *args, **kwargs):
        # The URL's user_id is authoritative (IsSelfOrAdmin already verified
        # it matches the caller, or that the caller is an Admin); any
        # user_id in the body is ignored.
        user_id = self._normalize_id(self.kwargs.get('user_id'))
        course_id = self._normalize_id(request.data.get('course_id'))

        if not user_id or not course_id:
            return Response(
                {"message": "course_id is required and must be a numeric ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(id=user_id).first()
        if not user:
            raise NotFound("User with this id does not exist.")

        course = api_models.Course.objects.filter(id=course_id).first()
        if not course:
            raise NotFound("Course with this id does not exist.")

        existing_wishlist_item = api_models.Wishlist.objects.filter(user=user, course=course).first()
        if existing_wishlist_item:
            existing_wishlist_item.delete()
            return Response({"message": "This course is deleted from wishlist."}, status=status.HTTP_200_OK)

        api_models.Wishlist.objects.create(user=user, course=course)
        return Response({"message": "Course added to wishlist successfully."}, status=status.HTTP_201_CREATED)

class QuestionAnswerListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = api_serializer.QuestionAnswerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        course_id = self.kwargs.get('course_id') or self.request.query_params.get('course_id')
        course = api_models.Course.objects.filter(id=course_id).first()
        if not course:
            raise NotFound("Course with this id does not exist.")
        return api_models.Question_Answer.objects.filter(course=course)

    def create(self, request, *args, **kwargs):
        course_id = request.data.get('course_id')
        title = request.data.get('title')
        message = request.data.get('message')

        if not course_id or not title or not message:
            return Response(
                {"message": "course_id, title, and message are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user

        course = api_models.Course.objects.filter(id=course_id).first()
        if not course:
            raise NotFound("Course with this id does not exist.")

        question_obj = api_models.Question_Answer.objects.create(
            user=user,
            course=course,
            title=title,
        )

        api_models.Question_Answer_Message.objects.create(
            user=user,
            course=course,
            question=question_obj,
            message=message
        )

        return Response({"message": "Group conversation started."}, status=status.HTTP_201_CREATED)

class QuestionAnswerMessageSendAPIView(generics.CreateAPIView):
    serializer_class = api_serializer.QuestionAnswerMessageSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        course_id = request.data.get('course_id')
        message = request.data.get('message')
        question_id = request.data.get('question_id')

        if not course_id or not question_id or not message:
            return Response(
                {"message": "course_id, question_id, and message are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user

        course = api_models.Course.objects.filter(id=course_id).first()
        if not course:
            raise NotFound("Course with this id does not exist.")

        question_obj = api_models.Question_Answer.objects.filter(
            id=question_id,
            course=course
        ).first()
        if not question_obj:
            raise NotFound("Question with this id does not exist for this course.")

        api_models.Question_Answer_Message.objects.create(
            user=user,
            course=course,
            question=question_obj,
            message=message
        )

        question_serializer = api_serializer.QuestionAnswerSerializer(question_obj)
        return Response(
            {"message": "Message sent successfully.", "question": question_serializer.data},
            status=status.HTTP_201_CREATED
        )

class TeacherSummaryAPIView(generics.ListAPIView):
    serializer_class = api_serializer.TeacherSummarySerializer
    permission_classes = [api_permissions.IsOwningTeacherOrAdmin]

    def get_queryset(self):
        teacher_id = self.kwargs['teacher_id']
        teacher = api_models.Teacher.objects.filter(id=teacher_id).first()
        if not teacher:
            raise NotFound("Teacher with this id does not exist.")

        one_month_ago = timezone.now() - timedelta(days=28)

        total_courses = api_models.Course.objects.filter(teacher=teacher).count()
        total_enrollments = api_models.EnrolledCourse.objects.filter(teacher=teacher).count()
        montly_enrollments = api_models.EnrolledCourse.objects.filter(teacher=teacher, date__gte=one_month_ago).count()

        enrolled_courses = api_models.EnrolledCourse.objects.filter(teacher=teacher).select_related('user__profile')
        unique_student_ids = set()
        students = []

        for enrolled_course in enrolled_courses:
            if enrolled_course.user_id in unique_student_ids:
                continue

            user = enrolled_course.user
            profile = getattr(user, 'profile', None)
            students.append(
                {
                    "full_name": profile.full_name if profile else user.full_name,
                    "image": profile.image.url if profile and profile.image else None,
                    "country": profile.country if profile else None,
                    "date": enrolled_course.date,
                }
            )
            unique_student_ids.add(enrolled_course.user_id)

        return {
            "total_courses": total_courses,
            "total_enrollments": total_enrollments,
            "montly_enrollments": montly_enrollments,
            "total_students": len(unique_student_ids),
            "students": students
        }

    def get(self, request, *args, **kwargs):
        return Response(self.get_queryset(), status=status.HTTP_200_OK)

class TeacherCourseListAPIView(generics.ListAPIView):
    serializer_class = api_serializer.TeacherCourseListSerializer
    permission_classes = [api_permissions.IsOwningTeacherOrAdmin]

    def get_queryset(self):
        teacher_id = self.kwargs['teacher_id']
        teacher = api_models.Teacher.objects.filter(id=teacher_id).first()
        if not teacher:
            raise NotFound("Teacher with this id does not exist.")

        return (
            api_models.Course.objects
            .filter(teacher=teacher)
            .select_related('teacher', 'category')
            .annotate(enrolled_count=Count('enrolledcourse'))
        )

class TeacherReviewListAPIView(generics.ListAPIView):
    serializer_class = api_serializer.ReviewSerializer
    permission_classes = [api_permissions.IsOwningTeacherOrAdmin]

    def get_queryset(self):
        teacher_id = self.kwargs['teacher_id']
        teacher = api_models.Teacher.objects.filter(id=teacher_id).first()
        if not teacher:
            raise NotFound("Teacher with this id does not exist.")

        return api_models.Review.objects.filter(course__teacher=teacher)

class TeacherReviewDetailAPIView(generics.RetrieveUpdateAPIView):
    serializer_class = api_serializer.ReviewSerializer
    permission_classes = [api_permissions.IsOwningTeacherOrAdmin]

    def get_object(self):
        teacher_id = self.kwargs['teacher_id']
        review_id = self.kwargs['review_id']

        teacher = api_models.Teacher.objects.filter(id=teacher_id).first()
        if not teacher:
            raise NotFound("Teacher with this id does not exist.")

        review = api_models.Review.objects.filter(course__teacher=teacher, id=review_id).first()
        if not review:
            raise NotFound("Review with this id does not exist for this teacher.")

        return review

class TeacherStudentListAPIView(viewsets.ViewSet):
    serializer_class = api_serializer.EnrolledCourseSerializer
    permission_classes = [api_permissions.IsOwningTeacherOrAdmin]

    def list(self, request, teacher_id=None):
        teacher = api_models.Teacher.objects.filter(id=teacher_id).first()
        if not teacher:
            raise NotFound("Teacher with this id does not exist.")

        enrolled_courses = api_models.EnrolledCourse.objects.filter(teacher=teacher).select_related('user__profile')
        unique_student_ids = set()
        students = []

        for enrolled_course in enrolled_courses:
            if enrolled_course.user_id in unique_student_ids:
                continue

            user = enrolled_course.user
            profile = getattr(user, 'profile', None)
            students.append(
                {
                    "full_name": profile.full_name if profile else user.full_name,
                    "image": profile.image.url if profile and profile.image else None,
                    "country": profile.country if profile else None,
                    "date": enrolled_course.date,
                }
            )
            unique_student_ids.add(enrolled_course.user_id)

        return Response({"total_students": len(unique_student_ids), "students": students}, status=status.HTTP_200_OK)

    def TeacherAllMonthlyEnrollmentAPIView(self, request, teacher_id=None):
        teacher = api_models.Teacher.objects.filter(id=teacher_id).first()
        if not teacher:
            raise NotFound("Teacher with this id does not exist.")

        monthly_enrollments_tracker = (
            api_models.EnrolledCourse.objects.filter(teacher=teacher)
                .annotate(month=ExtractMonth('date'))
                .values('month')
                .annotate(total_enrollments=Count('id'))
                .order_by('month')
        )

        return Response(monthly_enrollments_tracker, status=status.HTTP_200_OK)

class TeacherBestSellingCourseAPIView(viewsets.ViewSet):
    permission_classes = [api_permissions.IsOwningTeacherOrAdmin]

    def list(self, request, teacher_id=None):
        teacher = api_models.Teacher.objects.filter(id=teacher_id).first()
        if not teacher:
            raise NotFound("Teacher with this id does not exist.")

        courses_with_enrollment_count = []
        courses = api_models.Course.objects.filter(teacher=teacher)

        for course in courses:
            sales = api_models.EnrolledCourse.objects.filter(course=course).count()

            courses_with_enrollment_count.append({
                "course_image": course.image.url if course.image else None,
                "course_title": course.title,
                "sales": sales
            })
        return Response(courses_with_enrollment_count, status=status.HTTP_200_OK)

class TeacherQuestionAnswerListAPIView(generics.ListAPIView):
    serializer_class = api_serializer.QuestionAnswerSerializer
    permission_classes = [api_permissions.IsOwningTeacherOrAdmin]

    def get_queryset(self):
        teacher_id = self.kwargs['teacher_id']
        teacher = api_models.Teacher.objects.filter(id=teacher_id).first()
        if not teacher:
            raise NotFound("Teacher with this id does not exist.")
        return api_models.Question_Answer.objects.filter(course__teacher=teacher)

class TeacherNotificationListAPIView(generics.ListAPIView):
    serializer_class = api_serializer.NotificationSerializer
    permission_classes = [api_permissions.IsOwningTeacherOrAdmin]

    def get_queryset(self):
        teacher_id = self.kwargs['teacher_id']
        teacher = api_models.Teacher.objects.filter(id=teacher_id).first()
        if not teacher:
            raise NotFound("Teacher with this id does not exist.")
        return api_models.Notification.objects.filter(teacher=teacher, seen=False)

class TeacherNotificationDetailAPIView(generics.RetrieveUpdateAPIView):
    serializer_class = api_serializer.NotificationSerializer
    permission_classes = [api_permissions.IsOwningTeacherOrAdmin]

    def get_object(self):
        teacher_id = self.kwargs['teacher_id']
        notification_id = self.kwargs['notification_id']

        teacher = api_models.Teacher.objects.filter(id=teacher_id).first()
        if not teacher:
            raise NotFound("Teacher with this id does not exist.")

        notification = api_models.Notification.objects.filter(teacher=teacher, id=notification_id).first()
        if not notification:
            raise NotFound("Notification with this id does not exist for this teacher.")

        return notification

class CourseCreateAPIView(generics.CreateAPIView):
    serializer_class = api_serializer.CourseSerializer
    queryset = api_models.Course.objects.all()
    permission_classes = [api_permissions.IsTeacherRole]

    def perform_create(self, serializer):
        # The authenticated user's own Teacher profile is the only source of
        # truth for authorship -- a client-supplied "teacher" id would let
        # anyone create a course under someone else's name.
        teacher = api_models.Teacher.objects.filter(user=self.request.user).first()
        if teacher is None:
            raise NotFound('No teacher profile exists for this account.')

        course_instance = serializer.save(teacher=teacher)

        def is_non_empty(value):
            return value not in (None, '', 'null', 'undefined', 'NaN')

        variant_payload = []

        curriculum_data = self.request.data.get('curriculum')
        if isinstance(curriculum_data, str) and curriculum_data.strip().startswith('['):
            try:
                curriculum_data = json.loads(curriculum_data)
            except Exception:
                curriculum_data = None

        if isinstance(curriculum_data, list):
            for variant_entry in curriculum_data:
                if not isinstance(variant_entry, dict):
                    continue

                variant_payload.append(
                    {
                        'title': variant_entry.get('variant_title') or variant_entry.get('title'),
                        'items': variant_entry.get('variant_items') or variant_entry.get('items') or [],
                    }
                )

        if not variant_payload:
            processed_variant_indices = set()
            for key, value in self.request.data.items():
                if key.startswith('variant_') and '[variant_title]' in key:
                    index = key.split('[')[0].split('_')[-1]
                    if index in processed_variant_indices:
                        continue
                    item_data_map = {}
                    item_key_prefix = f'variant_{index}_item_'

                    for item_key, item_value in self.request.data.items():
                        if not item_key.startswith(item_key_prefix):
                            continue

                        key_suffix = item_key[len(item_key_prefix):]
                        item_index_str, separator, field_segment = key_suffix.partition('[')

                        if separator == '' or not item_index_str.isdigit():
                            continue

                        field_name = field_segment.split(']', 1)[0]
                        item_index = int(item_index_str)

                        if item_index not in item_data_map:
                            item_data_map[item_index] = {}

                        item_data_map[item_index][field_name] = item_value

                    item_data_list = [
                        item_data_map[item_index]
                        for item_index in sorted(item_data_map.keys())
                    ]

                    variant_payload.append(
                        {
                            'title': value,
                            'items': item_data_list,
                        }
                    )
                    processed_variant_indices.add(index)

                if key.startswith('variants[') and '][items][' not in key and (key.endswith('[variant_title]') or key.endswith('[title]')):
                    index = key.split('[', 2)[1].split(']', 1)[0]
                    if index in processed_variant_indices:
                        continue
                    item_data_map = {}
                    items_prefix = f'variants[{index}][items]['

                    for item_key, item_value in self.request.data.items():
                        if not item_key.startswith(items_prefix):
                            continue

                        remainder = item_key[len(items_prefix):]
                        item_index_str, separator, field_part = remainder.partition(']')

                        if separator == '' or not item_index_str.isdigit() or not field_part.startswith('['):
                            continue

                        field_name = field_part.lstrip('[').rstrip(']')
                        if not field_name:
                            continue

                        item_index = int(item_index_str)
                        if item_index not in item_data_map:
                            item_data_map[item_index] = {}

                        item_data_map[item_index][field_name] = item_value

                    item_data_list = [
                        item_data_map[item_index]
                        for item_index in sorted(item_data_map.keys())
                    ]

                    variant_payload.append(
                        {
                            'title': value,
                            'items': item_data_list,
                        }
                    )
                    processed_variant_indices.add(index)

        for variant_entry in variant_payload:
            variant_title = variant_entry.get('title')
            item_data_list = variant_entry.get('items', [])

            if not is_non_empty(variant_title):
                continue

            variant_instance = api_models.Variant.objects.create(title=variant_title, course=course_instance)

            for item_data in item_data_list:
                if not isinstance(item_data, dict):
                    continue

                item_title = (
                    item_data.get('title')
                    or item_data.get('variant_item_title')
                    or item_data.get('variantItemTitle')
                )
                description = (
                    item_data.get('description')
                    or item_data.get('variant_item_description')
                    or item_data.get('variantItemDescription')
                )
                file_value = item_data.get('file')
                preview = parse_bool(item_data.get('preview', False))

                if not is_non_empty(item_title):
                    continue

                create_kwargs = {
                    'variant': variant_instance,
                    'title': item_title,
                    'description': description,
                    'preview': preview,
                }

                if is_non_empty(file_value) and not str(file_value).startswith('http://') and not str(file_value).startswith('https://'):
                    create_kwargs['file'] = file_value

                api_models.VariantItem.objects.create(**create_kwargs)
    def save_nested_data(self, course_instance, variant_data):
        serializer = self.serializer_class(data=variant_data, many=True, context={'course_instance': course_instance})
        serializer.is_valid(raise_exception=True)
        serializer.save(course=course_instance)


class CourseUpdateAPIView(generics.RetrieveUpdateAPIView):
    serializer_class = api_serializer.CourseSerializer
    queryset = api_models.Course.objects.all()
    permission_classes = [api_permissions.IsOwningTeacherOrAdmin]

    @staticmethod
    def _get_course_by_identifier(course_identifier, teacher=None):
        course = api_models.Course.objects.filter(id=course_identifier).first()

        if not course:
            course = api_models.Course.objects.filter(course_id=str(course_identifier)).first()

        if course and teacher and course.teacher_id != teacher.id:
            return None

        return course

    def get_object(self):
        teacher_id = self.kwargs['teacher_id']
        course_id = self.kwargs['course_id']

        teacher = api_models.Teacher.objects.filter(id=teacher_id).first()
        course = self._get_course_by_identifier(course_id, teacher=teacher)

        if not course:
            raise NotFound("Course with this id does not exist.")
        return course

    def update(self, request, *args, **kwargs):
        course = self.get_object()

        payload_data = request.data.copy()

        category_id = None
        if 'category' in payload_data:
            category_id = extract_numeric_id(payload_data.get('category'))

            if category_id is None:
                payload_data.pop('category', None)
            else:
                payload_data['category'] = str(category_id)

        serializer = self.get_serializer(course, data=payload_data, partial=True)
        serializer.is_valid(raise_exception=True)

        if "image" in request.data and isinstance(request.data["image"], InMemoryUploadedFile):
            course.image = request.data["image"]

        elif "image" in request.data and str(request.data["image"]) == "No file":
            course.image = None

        if "file" in request.data and not str(request.data["file"]).startswith("http://"):
            course.file = request.data["file"]

        if category_id is not None:
            category = api_models.Category.objects.filter(id=category_id).first()
            if category:
                course.category = category

        self.perform_update(serializer)
        self.update_variant(course, request.data)

        refreshed_course = self.get_object()
        response_serializer = self.get_serializer(refreshed_course)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
    

    def update_variant(self, course, request_data):
        def is_non_empty(value):
            return value not in (None, '', 'null', 'undefined', 'NaN')

        def to_bool(value):
            return parse_bool(value)

        variant_payload = []

        curriculum_data = request_data.get('curriculum')
        if isinstance(curriculum_data, str) and curriculum_data.strip().startswith('['):
            try:
                curriculum_data = json.loads(curriculum_data)
            except Exception:
                curriculum_data = None

        if isinstance(curriculum_data, list):
            for variant_entry in curriculum_data:
                if not isinstance(variant_entry, dict):
                    continue

                variant_payload.append({
                    'variant_identifier': (
                        variant_entry.get('id')
                        or variant_entry.get('variant_id')
                        or variant_entry.get('variantId')
                    ),
                    'title': variant_entry.get('variant_title') or variant_entry.get('title'),
                    'items': variant_entry.get('variant_items') or variant_entry.get('items') or [],
                })

        if not variant_payload:
            for key, value in request_data.items():
                if key.startswith('variant_') and '[variant_title]' in key:
                    index = key.split('[')[0].split('_')[-1]
                    id_key = f'variant_{index}_id'
                    item_data_map = {}
                    item_key_prefix = f'variant_{index}_item_'

                    for item_key, item_value in request_data.items():
                        if not item_key.startswith(item_key_prefix):
                            continue

                        key_suffix = item_key[len(item_key_prefix):]
                        item_index_str, separator, field_segment = key_suffix.partition('[')

                        if separator == '' or not item_index_str.isdigit():
                            continue

                        field_name = field_segment.split(']', 1)[0]
                        item_index = int(item_index_str)

                        if item_index not in item_data_map:
                            item_data_map[item_index] = {}

                        item_data_map[item_index][field_name] = item_value

                    item_data_list = [
                        item_data_map[item_index]
                        for item_index in sorted(item_data_map.keys())
                    ]

                    variant_payload.append({
                        'variant_identifier': request_data.get(id_key),
                        'title': value,
                        'items': item_data_list,
                    })

        for variant_entry in variant_payload:
            variant_identifier = str(variant_entry.get('variant_identifier', '')).strip()
            variant_title = variant_entry.get('title')
            item_data_list = variant_entry.get('items', [])

            if not is_non_empty(variant_title):
                continue

            existing_variant = None
            if is_non_empty(variant_identifier):
                if variant_identifier.isdigit():
                    existing_variant = course.variant_set.filter(id=int(variant_identifier)).first()
                    if not existing_variant:
                        existing_variant = course.variant_set.filter(variant_id=variant_identifier).first()
                else:
                    existing_variant = course.variant_set.filter(variant_id=variant_identifier).first()

            if existing_variant:
                existing_variant.title = variant_title
                existing_variant.save(update_fields=['title'])
            else:
                existing_variant = api_models.Variant.objects.create(title=variant_title, course=course)

            for item_data in item_data_list:
                if not isinstance(item_data, dict):
                    continue

                preview_provided = 'preview' in item_data
                preview = to_bool(item_data.get('preview', False))
                file_value = item_data.get('file')
                has_uploaded_file = is_non_empty(file_value)
                is_remote_file = str(file_value).startswith('http://') or str(file_value).startswith('https://')
                item_title = (
                    item_data.get('title')
                    or item_data.get('variant_item_title')
                    or item_data.get('variantItemTitle')
                )
                description = (
                    item_data.get('description')
                    or item_data.get('variant_item_description')
                    or item_data.get('variantItemDescription')
                )

                title_provided = (
                    'title' in item_data
                    or 'variant_item_title' in item_data
                    or 'variantItemTitle' in item_data
                )
                description_provided = (
                    'description' in item_data
                    or 'variant_item_description' in item_data
                    or 'variantItemDescription' in item_data
                )

                raw_item_identifier = item_data.get('variant_item_id') or item_data.get('variantItemId') or item_data.get('id')
                item_identifier = str(raw_item_identifier or '').strip()
                variant_item = None
                if is_non_empty(item_identifier):
                    if item_identifier.isdigit():
                        variant_item = api_models.VariantItem.objects.filter(id=int(item_identifier), variant=existing_variant).first()
                        if not variant_item:
                            variant_item = api_models.VariantItem.objects.filter(variant_item_id=item_identifier, variant=existing_variant).first()
                    else:
                        variant_item = api_models.VariantItem.objects.filter(variant_item_id=item_identifier, variant=existing_variant).first()

                if variant_item:
                    if title_provided and is_non_empty(item_title):
                        variant_item.title = item_title

                    if description_provided:
                        variant_item.description = description

                    if preview_provided:
                        variant_item.preview = preview

                    if has_uploaded_file and not is_remote_file:
                        variant_item.file = file_value

                    variant_item.save()
                else:
                    if not is_non_empty(item_title):
                        continue

                    create_kwargs = {
                        'variant': existing_variant,
                        'title': item_title,
                        'description': description,
                        'preview': preview,
                    }

                    if has_uploaded_file and not is_remote_file:
                        create_kwargs['file'] = file_value

                    api_models.VariantItem.objects.create(**create_kwargs)


    def save_nested_data(self, course_instance, variant_data):
        serializer = self.serializer_class(data=variant_data, many=True, context={'course_instance': course_instance})
        serializer.is_valid(raise_exception=True)
        serializer.save(course=course_instance)

class CourseDetailsAPIView(generics.RetrieveDestroyAPIView):
    """Teacher's own view of a single course (edit/delete). Public browsing
    goes through CourseDetailAPIView above instead."""
    serializer_class = api_serializer.CourseSerializer
    queryset = api_models.Course.objects.all()
    permission_classes = [IsAuthenticated]

    def get_object(self):
        course_id = self.kwargs['course_id']
        course = api_models.Course.objects.filter(id=course_id).first()

        if not course:
            course = api_models.Course.objects.filter(course_id=str(course_id)).first()

        if not course:
            raise NotFound("Course with this id does not exist.")

        user = self.request.user
        if course.teacher.user_id != user.id and not user.is_admin_role:
            raise PermissionDenied("You do not own this course.")

        return course

class CourseVariantDeleteAPIView(generics.DestroyAPIView):
    serializer_class = api_serializer.VariantSerializer
    queryset = api_models.Variant.objects.all()
    permission_classes = [api_permissions.IsOwningTeacherOrAdmin]

    def get_object(self):
        variant_id = self.kwargs['variant_id']
        teacher_id = self.kwargs['teacher_id']
        course_id = self.kwargs['course_id']

        teacher = api_models.Teacher.objects.filter(id=teacher_id).first()
        course = api_models.Course.objects.filter(id=course_id, teacher=teacher).first()

        if not course:
            course = api_models.Course.objects.filter(course_id=str(course_id), teacher=teacher).first()

        return api_models.Variant.objects.filter(id=variant_id, course=course).first()

class CourseVariantItemDeleteAPIView(generics.DestroyAPIView):
    serializer_class = api_serializer.VariantItemSerializer
    queryset = api_models.VariantItem.objects.all()
    permission_classes = [api_permissions.IsOwningTeacherOrAdmin]

    def get_object(self):
        variant_item_id = self.kwargs['variant_item_id']
        variant_id = self.kwargs['variant_id']
        teacher_id = self.kwargs['teacher_id']
        course_id = self.kwargs['course_id']

        teacher = api_models.Teacher.objects.filter(id=teacher_id).first()
        course = api_models.Course.objects.filter(course_id=course_id, teacher=teacher).first()
        variant = api_models.Variant.objects.filter(variant_id=variant_id, course=course).first()

        return api_models.VariantItem.objects.filter(variant_item_id=variant_item_id, variant=variant).first()


# ---------------------------------------------------------------------------
# Video access & streaming
#
# Videos are never exposed via a permanent public MEDIA_URL. A student first
# calls VideoAccessAPIView (authenticated, enrollment-checked) to obtain a
# short-lived signed URL, then the <video> tag's plain GET requests hit
# VideoStreamAPIView, which validates that token and streams the file with
# HTTP Range support so seeking/scrubbing works.
# ---------------------------------------------------------------------------

class VideoAccessAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, variant_item_id, *args, **kwargs):
        variant_item = api_models.VariantItem.objects.filter(variant_item_id=variant_item_id).first()
        if not variant_item:
            raise NotFound("Lesson with this id does not exist.")

        course = variant_item.variant.course
        user = request.user

        is_enrolled = api_models.EnrolledCourse.objects.filter(course=course, user=user).exists()
        is_owning_teacher = api_models.Teacher.objects.filter(id=course.teacher_id, user=user).exists()

        if not (is_enrolled or is_owning_teacher or user.is_admin_role):
            raise PermissionDenied("You do not have access to this lesson's video.")

        if not variant_item.file:
            raise NotFound("This lesson has no video uploaded yet.")

        token = make_video_token(variant_item.id, user.id)
        stream_url = request.build_absolute_uri(
            f"/api/v1/lesson/{variant_item.variant_item_id}/video-stream/?token={token}"
        )
        return Response({"url": stream_url, "expires_in": VIDEO_TOKEN_MAX_AGE})


class VideoStreamAPIView(APIView):
    # Signed token replaces session/JWT auth here so a plain <video src="...">
    # GET (no Authorization header) can be validated.
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, variant_item_id, *args, **kwargs):
        token = request.query_params.get('token')
        if not token:
            return Response({"message": "Missing token."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            token_item_id, _user_id = read_video_token(token)
        except SignatureExpired:
            return Response({"message": "Video link expired."}, status=status.HTTP_401_UNAUTHORIZED)
        except BadSignature:
            return Response({"message": "Invalid video link."}, status=status.HTTP_401_UNAUTHORIZED)

        variant_item = api_models.VariantItem.objects.filter(variant_item_id=variant_item_id).first()
        if not variant_item or variant_item.id != token_item_id:
            return Response({"message": "Invalid video link."}, status=status.HTTP_401_UNAUTHORIZED)

        if not variant_item.file:
            raise NotFound("This lesson has no video uploaded yet.")

        return serve_ranged_file(request, variant_item.file.path, content_type='video/mp4')


# ---------------------------------------------------------------------------
# Resumable / chunked video upload (local disk)
#
# A lesson video may be 1GB+, so it is never sent as a single multipart
# request. The teacher's browser splits it into chunks; each chunk is PUT to
# VideoUploadChunkAPIView and appended to a temp file at the reported byte
# offset. If the connection drops, the frontend re-fetches received_bytes and
# resumes instead of restarting.
# ---------------------------------------------------------------------------

ALLOWED_VIDEO_EXTENSIONS = ('.mp4', '.mov', '.webm', '.mkv', '.avi')


def _get_owned_variant_item_or_404(request, lesson_identifier):
    variant_item = (
        api_models.VariantItem.objects.filter(variant_item_id=lesson_identifier).first()
        or api_models.VariantItem.objects.filter(id=lesson_identifier).first()
    )
    if not variant_item:
        raise NotFound("Lesson with this id does not exist.")

    course = variant_item.variant.course
    teacher = api_models.Teacher.objects.filter(user=request.user).first()
    if not (teacher and course.teacher_id == teacher.id) and not request.user.is_admin_role:
        raise PermissionDenied("You do not own this lesson.")

    return variant_item, (teacher or course.teacher)


class VideoUploadInitAPIView(generics.GenericAPIView):
    permission_classes = [api_permissions.IsTeacherRole]

    def post(self, request, *args, **kwargs):
        lesson_id = request.data.get('variant_item_id') or request.data.get('lesson_id')
        filename = request.data.get('filename')
        content_type = request.data.get('content_type', '')

        if not lesson_id or not filename:
            return Response({"message": "variant_item_id and filename are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            total_size = int(request.data.get('file_size'))
        except (TypeError, ValueError):
            return Response({"message": "file_size is required and must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        if total_size <= 0:
            return Response({"message": "Invalid file size."}, status=status.HTTP_400_BAD_REQUEST)

        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_VIDEO_EXTENSIONS:
            return Response(
                {"message": f"Unsupported video format '{ext}'. Allowed: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        variant_item, teacher = _get_owned_variant_item_or_404(request, lesson_id)

        upload_dir = os.path.join(settings.MEDIA_ROOT, 'tmp_uploads')
        os.makedirs(upload_dir, exist_ok=True)

        session = api_models.VideoUploadSession.objects.create(
            teacher=teacher,
            variant_item=variant_item,
            original_filename=filename,
            content_type=content_type,
            total_size=total_size,
            temp_path='',
        )
        temp_path = os.path.join(upload_dir, f"{session.upload_id}{ext}")
        open(temp_path, 'wb').close()  # pre-allocate so chunk offsets can be validated
        session.temp_path = temp_path
        session.save(update_fields=['temp_path'])

        return Response(
            {"upload_id": session.upload_id, "received_bytes": 0, "chunk_size": 8 * 1024 * 1024},
            status=status.HTTP_201_CREATED,
        )


class VideoUploadChunkAPIView(generics.GenericAPIView):
    permission_classes = [api_permissions.IsTeacherRole]

    def _get_session(self, request, upload_id):
        session = api_models.VideoUploadSession.objects.filter(upload_id=upload_id).first()
        if not session:
            raise NotFound("Upload session does not exist.")
        if session.teacher.user_id != request.user.id and not request.user.is_admin_role:
            raise PermissionDenied("You do not own this upload session.")
        return session

    def get(self, request, upload_id, *args, **kwargs):
        session = self._get_session(request, upload_id)
        return Response({
            "received_bytes": session.received_bytes,
            "total_size": session.total_size,
            "percent_complete": session.percent_complete,
            "status": session.status,
        })

    def put(self, request, upload_id, *args, **kwargs):
        session = self._get_session(request, upload_id)

        if session.status != 'Uploading':
            return Response({"message": "This upload session is no longer active."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            offset = int(request.data.get('offset', session.received_bytes))
        except (TypeError, ValueError):
            return Response({"message": "offset must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        if offset != session.received_bytes:
            return Response(
                {"message": "Offset does not match server state; resume from received_bytes.", "received_bytes": session.received_bytes},
                status=status.HTTP_409_CONFLICT,
            )

        chunk = request.FILES.get('chunk')
        if not chunk:
            return Response({"message": "chunk file is required."}, status=status.HTTP_400_BAD_REQUEST)

        with open(session.temp_path, 'r+b') as f:
            f.seek(offset)
            for piece in chunk.chunks():
                f.write(piece)

        session.received_bytes = os.path.getsize(session.temp_path)
        session.save(update_fields=['received_bytes', 'updated_at'])

        return Response({
            "received_bytes": session.received_bytes,
            "total_size": session.total_size,
            "percent_complete": session.percent_complete,
        })

    def delete(self, request, upload_id, *args, **kwargs):
        session = self._get_session(request, upload_id)
        if os.path.exists(session.temp_path):
            os.remove(session.temp_path)
        session.status = 'Cancelled'
        session.save(update_fields=['status'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class VideoUploadCompleteAPIView(generics.GenericAPIView):
    permission_classes = [api_permissions.IsTeacherRole]

    def post(self, request, upload_id, *args, **kwargs):
        session = api_models.VideoUploadSession.objects.filter(upload_id=upload_id).first()
        if not session:
            raise NotFound("Upload session does not exist.")
        if session.teacher.user_id != request.user.id and not request.user.is_admin_role:
            raise PermissionDenied("You do not own this upload session.")

        if session.received_bytes != session.total_size:
            return Response(
                {
                    "message": "Upload is incomplete.",
                    "received_bytes": session.received_bytes,
                    "total_size": session.total_size,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.core.files import File

        with open(session.temp_path, 'rb') as f:
            session.variant_item.file = File(f, name=session.original_filename)
            session.variant_item.save()  # also extracts duration via moviepy

        os.remove(session.temp_path)
        session.status = 'Completed'
        session.save(update_fields=['status'])

        return Response({
            "message": "Video uploaded and attached to lesson.",
            "variant_item_id": session.variant_item.variant_item_id,
            "content_duration": session.variant_item.content_duration,
        })


# ---------------------------------------------------------------------------
# Lesson materials (slides, handouts, etc.) -- a plain multipart upload since,
# unlike lesson video, these don't need the resumable chunked pipeline. No
# size ceiling: Django streams FileField uploads straight to a temp file
# regardless of size.
# ---------------------------------------------------------------------------

ALLOWED_MATERIAL_EXTENSIONS = ('.pdf', '.ppt', '.pptx', '.doc', '.docx', '.xls', '.xlsx')


class LessonMaterialListCreateAPIView(generics.GenericAPIView):
    permission_classes = [api_permissions.IsTeacherRole]

    def get(self, request, lesson_id, *args, **kwargs):
        variant_item, _teacher = _get_owned_variant_item_or_404(request, lesson_id)
        materials = variant_item.materials.all()
        return Response(api_serializer.LessonMaterialSerializer(materials, many=True, context={'request': request}).data)

    def post(self, request, lesson_id, *args, **kwargs):
        variant_item, _teacher = _get_owned_variant_item_or_404(request, lesson_id)

        upload = request.FILES.get('file')
        if not upload:
            return Response({"message": "file is required."}, status=status.HTTP_400_BAD_REQUEST)

        ext = os.path.splitext(upload.name)[1].lower()
        if ext not in ALLOWED_MATERIAL_EXTENSIONS:
            return Response(
                {"message": f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_MATERIAL_EXTENSIONS)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        material = api_models.LessonMaterial.objects.create(
            variant_item=variant_item, file=upload, original_filename=upload.name
        )
        return Response(
            api_serializer.LessonMaterialSerializer(material, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class LessonMaterialDeleteAPIView(generics.DestroyAPIView):
    serializer_class = api_serializer.LessonMaterialSerializer
    queryset = api_models.LessonMaterial.objects.all()
    permission_classes = [api_permissions.IsTeacherRole]

    def get_object(self):
        variant_item, _teacher = _get_owned_variant_item_or_404(request=self.request, lesson_identifier=self.kwargs['lesson_id'])
        material = variant_item.materials.filter(id=self.kwargs['material_id']).first()
        if not material:
            raise NotFound("Material does not exist.")
        return material


# ---------------------------------------------------------------------------
# Course review workflow (teacher submits, admin approves/rejects/unpublishes)
# ---------------------------------------------------------------------------

class CourseSubmitForReviewAPIView(generics.GenericAPIView):
    permission_classes = [api_permissions.IsOwningTeacherOrAdmin]

    def post(self, request, teacher_id, course_id, *args, **kwargs):
        teacher = api_models.Teacher.objects.filter(id=teacher_id).first()
        if not teacher:
            raise NotFound("Teacher with this id does not exist.")

        course = api_models.Course.objects.filter(id=course_id, teacher=teacher).first()
        if not course:
            raise NotFound("Course with this id does not exist for this teacher.")

        errors = course.submission_errors()
        if errors:
            return Response(
                {"message": "Course is not ready for submission.", "errors": errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        course.platform_status = 'Review'
        course.teacher_course_status = 'Draft'
        course.submitted_at = timezone.now()
        course.rejection_reason = None
        course.save(update_fields=['platform_status', 'teacher_course_status', 'submitted_at', 'rejection_reason'])

        return Response({"message": "Course submitted for review.", "platform_status": course.platform_status})


class AdminCourseListAPIView(generics.ListAPIView):
    serializer_class = api_serializer.CourseSerializer
    permission_classes = [api_permissions.IsAdminRole]

    def get_queryset(self):
        queryset = api_models.Course.objects.all().select_related('teacher', 'category')
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(platform_status=status_param)
        return queryset


class AdminCourseDetailAPIView(generics.RetrieveAPIView):
    serializer_class = api_serializer.CourseSerializer
    permission_classes = [api_permissions.IsAdminRole]
    queryset = api_models.Course.objects.all()
    lookup_url_kwarg = 'course_id'


class AdminCourseApproveAPIView(generics.GenericAPIView):
    permission_classes = [api_permissions.IsAdminRole]

    def post(self, request, course_id, *args, **kwargs):
        course = api_models.Course.objects.filter(id=course_id).first()
        if not course:
            raise NotFound("Course with this id does not exist.")

        course.platform_status = 'Published'
        course.teacher_course_status = 'Published'
        course.reviewed_at = timezone.now()
        course.reviewed_by = request.user
        course.rejection_reason = None
        course.save(update_fields=[
            'platform_status', 'teacher_course_status', 'reviewed_at', 'reviewed_by', 'rejection_reason',
        ])

        api_models.Notification.objects.create(teacher=course.teacher, course=course, type="Course Published")

        return Response({"message": "Course approved and published.", "platform_status": course.platform_status})


class AdminCourseRejectAPIView(generics.GenericAPIView):
    permission_classes = [api_permissions.IsAdminRole]

    def post(self, request, course_id, *args, **kwargs):
        reason = request.data.get('reason')
        if not reason:
            return Response({"message": "A rejection reason is required."}, status=status.HTTP_400_BAD_REQUEST)

        course = api_models.Course.objects.filter(id=course_id).first()
        if not course:
            raise NotFound("Course with this id does not exist.")

        course.platform_status = 'Rejected'
        course.teacher_course_status = 'Draft'
        course.reviewed_at = timezone.now()
        course.reviewed_by = request.user
        course.rejection_reason = reason
        course.save(update_fields=[
            'platform_status', 'teacher_course_status', 'reviewed_at', 'reviewed_by', 'rejection_reason',
        ])

        api_models.Notification.objects.create(teacher=course.teacher, course=course, type="Draft")

        return Response({"message": "Course rejected.", "platform_status": course.platform_status, "reason": reason})


class AdminCoursePublishAPIView(generics.GenericAPIView):
    permission_classes = [api_permissions.IsAdminRole]

    def post(self, request, course_id, *args, **kwargs):
        course = api_models.Course.objects.filter(id=course_id).first()
        if not course:
            raise NotFound("Course with this id does not exist.")
        if course.platform_status not in ('Published', 'Disabled'):
            return Response(
                {"message": "Only approved (previously published/disabled) courses can be published."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        course.platform_status = 'Published'
        course.teacher_course_status = 'Published'
        course.save(update_fields=['platform_status', 'teacher_course_status'])

        return Response({"message": "Course published.", "platform_status": course.platform_status})


class AdminCourseUnpublishAPIView(generics.GenericAPIView):
    permission_classes = [api_permissions.IsAdminRole]

    def post(self, request, course_id, *args, **kwargs):
        course = api_models.Course.objects.filter(id=course_id).first()
        if not course:
            raise NotFound("Course with this id does not exist.")

        course.platform_status = 'Disabled'
        course.teacher_course_status = 'Disabled'
        course.save(update_fields=['platform_status', 'teacher_course_status'])

        return Response({"message": "Course unpublished.", "platform_status": course.platform_status})


# ---------------------------------------------------------------------------
# Admin: user management
# ---------------------------------------------------------------------------

class AdminUserListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = api_serializer.AdminUserSerializer
    permission_classes = [api_permissions.IsAdminRole]

    def get_queryset(self):
        queryset = User.objects.all().order_by('-id')
        role_param = self.request.query_params.get('role')
        if role_param:
            queryset = queryset.filter(role=role_param)
        search = self.request.query_params.get('q')
        if search:
            queryset = queryset.filter(email__icontains=search)
        return queryset

    def perform_create(self, serializer):
        user = serializer.save()
        if user.role == ROLE_TEACHER and not api_models.Teacher.objects.filter(user=user).exists():
            api_models.Teacher.objects.create(user=user, full_name=user.full_name)


class AdminUserDetailAPIView(generics.RetrieveUpdateAPIView):
    serializer_class = api_serializer.AdminUserSerializer
    permission_classes = [api_permissions.IsAdminRole]
    queryset = User.objects.all()
    lookup_url_kwarg = 'user_id'

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        previous_role = user.role
        response = super().update(request, *args, **kwargs)

        user.refresh_from_db()
        if user.role == ROLE_TEACHER and previous_role != ROLE_TEACHER:
            api_models.Teacher.objects.get_or_create(user=user, defaults={'full_name': user.full_name})

        return response


class AdminDashboardSummaryAPIView(generics.GenericAPIView):
    permission_classes = [api_permissions.IsAdminRole]

    def get(self, request, *args, **kwargs):
        return Response({
            "total_users": User.objects.count(),
            "students": User.objects.filter(role=ROLE_STUDENT).count(),
            "teachers": User.objects.filter(role=ROLE_TEACHER).count(),
            "courses": api_models.Course.objects.count(),
            "published_courses": api_models.Course.objects.filter(platform_status='Published').count(),
            "pending_review": api_models.Course.objects.filter(platform_status='Review').count(),
            "enrollments": api_models.EnrolledCourse.objects.count(),
            "completed_courses": api_models.EnrolledCourse.objects.filter(completed_at__isnull=False).count(),
        })


class AdminEnrollmentListAPIView(generics.ListAPIView):
    serializer_class = api_serializer.EnrolledCourseSerializer
    permission_classes = [api_permissions.IsAdminRole]
    queryset = api_models.EnrolledCourse.objects.all().select_related('course', 'user', 'teacher')


class SiteConfigurationAPIView(generics.RetrieveUpdateAPIView):
    serializer_class = api_serializer.SiteConfigurationSerializer
    permission_classes = [api_permissions.IsAdminRole]

    def get_object(self):
        return SiteConfiguration.get_solo()


# ---------------------------------------------------------------------------
# Certificates
# ---------------------------------------------------------------------------

class StudentCertificateListAPIView(generics.ListAPIView):
    serializer_class = api_serializer.CertificateSerializer
    permission_classes = [api_permissions.IsSelfOrAdmin]

    def get_queryset(self):
        return api_models.Certificate.objects.filter(user_id=self.kwargs['user_id'])


class CertificateVerifyAPIView(generics.RetrieveAPIView):
    serializer_class = api_serializer.CertificateSerializer
    permission_classes = [AllowAny]
    lookup_field = 'certificate_id'
    lookup_url_kwarg = 'certificate_id'
    queryset = api_models.Certificate.objects.all()

