from django.db import models
from userauths.models import User, UserProfile
from shortuuid.django_fields import ShortUUIDField 
from django.utils.text import slugify
from django.utils import timezone
from moviepy.editor import VideoFileClip
import math

LANGUAGE_CHOICES = (
    ('English', 'English'),
    ('Code Switching', 'Code Switching'),
    ('French', 'French'),
    ('Swahili', 'Swahili'),
)

LEVEL_CHOICES = (
    ('Beginner', 'Beginner'),
    ('Intermediate', 'Intermediate'),
    ('Advanced', 'Advanced'),
)

RATING = (
    (1, '1 Star'),
    (2, '2 Stars'),
    (3, '3 Stars'),
    (4, '4 Stars'),
    (5, '5 Stars'),
)

TEACHER_STATUS = (
    ('Draft', 'Draft'),
    ('Disabled', 'Disabled'),
    ('Published', 'Published'),
)


NOTI_TYPE = (
    ('New Review', 'New Review'),
    ('Draft', 'Draft'),
    ('Course Published', 'Course Published'),
    ('New Course Question', 'New Course Question'),
    ('Course Enrollement Completed', 'Course Enrollement Completed'),
)


PLATFORM_STATUS = (
    ('Review', 'Review'),
    ('Disabled', 'Disabled'),
    ('Published', 'Published'),
    ('Draft', 'Draft'),
    ('Rejected', 'Rejected'),
)


class Teacher(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    image = models.FileField(upload_to='course-file/', blank=True, null=True, default='default.jpg')
    full_name = models.CharField(max_length=100)
    bio = models.CharField(max_length=100, blank=True, null=True)
    facebook = models.URLField(blank=True, null=True)
    twitter = models.URLField(blank=True, null=True)
    linkedin = models.URLField(blank=True, null=True)
    about = models.TextField(blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.full_name
    
    def students(self):
        return EnrolledCourse.objects.filter(teacher=self)
    
    def courses(self):
        return Course.objects.filter(teacher=self)
    
    def reviews(self):
        return Review.objects.filter(course__teacher=self).count()
    
class Category(models.Model):
    title = models.CharField(max_length=100)
    image = models.FileField(upload_to='category-file/', blank=True, null=True, default='default.jpg')
    slug = models.SlugField(unique=True, null=True, blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['title']

    def __str__(self):
        return self.title
    
    def course_count(self):
        return Course.objects.filter(category=self).count()
    
    def save(self, *args, **kwargs):
        if self.slug == "" or self.slug is None:
            self.slug = self.title.lower().replace(' ', '-')
        super(Category, self).save(*args, **kwargs)
        
class Course(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, null=True, blank=True)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE)
    file = models.FileField(upload_to='course-file/', blank=True, null=True)
    title = models.CharField(max_length=100)
    image = models.FileField(upload_to='course-file/', blank=True, null=True, default='default.jpg')
    description = models.TextField(blank=True, null=True)
    language = models.CharField(max_length=20, choices=LANGUAGE_CHOICES, default="English")
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default="Beginner")
    slug = models.SlugField(unique=True, null=True, blank=True)
    platform_status = models.CharField(max_length=20, choices=PLATFORM_STATUS, default="Published")
    teacher_course_status = models.CharField(max_length=20, choices=TEACHER_STATUS, default="Published")
    featured = models.BooleanField(default=False)
    course_id = ShortUUIDField(length=6, max_length=20, unique=True, alphabet="1234567890")
    date = models.DateTimeField(default=timezone.now)

    # Admin review workflow bookkeeping.
    submitted_at = models.DateTimeField(blank=True, null=True)
    reviewed_at = models.DateTimeField(blank=True, null=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='reviewed_courses')
    rejection_reason = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['title']

    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        if self.slug == "" or self.slug is None:
            self.slug = slugify(self.title) + str(self.pk)
            base_slug = slugify(self.title) or "course"
            slug = base_slug
            counter = 1

            while Course.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            self.slug = slug
        super(Course, self).save(*args, **kwargs)   

    def students(self):
        return EnrolledCourse.objects.filter(course=self)
    
    def curriculum(self):
        return Variant.objects.filter(course=self)
    
    def lectures(self):
        return VariantItem.objects.filter(variant__course=self)
    
    def average_rating(self):
        average_rating = Review.objects.filter(course=self, active= True).aggregate(avg_rating=models.Avg('rating'))
        return average_rating['avg_rating'] 
    
    def rating_count(self):
        return Review.objects.filter(course=self, active= True).count()
    
    def reviews(self):
        return Review.objects.filter(course=self, active= True)

    def total_lessons(self):
        return VariantItem.objects.filter(variant__course=self).count()

    def submission_errors(self):
        """Validation errors that must be resolved before a teacher can submit for review."""
        errors = []
        if not self.title:
            errors.append("Course title is required.")
        if not self.description:
            errors.append("Course description is required.")
        if not self.image or self.image.name in ('', 'default.jpg'):
            errors.append("Course image is required.")
        if not self.category:
            errors.append("Course category is required.")

        variants = list(self.curriculum())
        if not variants:
            errors.append("At least one lesson is required.")

        for variant in variants:
            for item in variant.items():
                if not item.title:
                    errors.append(f"Lesson in '{variant.title}' is missing a title.")
                if not item.file:
                    errors.append(f"Lesson '{item.title}' has no video uploaded.")
        return errors

class Variant(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    title = models.CharField(max_length=1000)
    order = models.PositiveIntegerField(default=1)
    variant_id = ShortUUIDField(length=6, max_length=20, unique=True, alphabet="1234567890")
    date = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['order', 'date']

    def __str__(self):
        return self.title

    def variant_items(self):
        return VariantItem.objects.filter(variant=self)

    def items(self):
        return VariantItem.objects.filter(variant=self)

class VariantItem(models.Model):
    variant = models.ForeignKey(Variant, on_delete=models.CASCADE, related_name='variant_items')
    title = models.CharField(max_length=1000)
    order = models.PositiveIntegerField(default=1)
    date = models.DateTimeField(default=timezone.now)
    variant_item_id = ShortUUIDField(length=6, max_length=20, unique=True, alphabet="1234567890")
    description = models.TextField(blank=True, null=True)
    duration = models.DurationField(blank=True, null=True)
    duration_seconds = models.FloatField(blank=True, null=True)
    preview = models.BooleanField(default=False)
    content_duration = models.CharField(max_length=1000, blank=True, null=True)
    file = models.FileField(upload_to='course-file/', blank=True, null=True)

    class Meta:
        ordering = ['order', 'date']

    def __str__(self):
        return f"{self.variant.title} - {self.title}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        if self.file:
            try:
                clip = VideoFileClip(self.file.path)
                duration_second = clip.duration
                clip.close()
            except Exception:
                import logging
                logging.getLogger(__name__).exception(
                    "Could not read video duration for VariantItem id=%s; leaving content_duration unset.", self.pk
                )
                return

            minutes, remainder = divmod(duration_second, 60)
            minutes = math.floor(minutes)
            seconds = math.floor(remainder)

            duration_text = f"{minutes:02}:{seconds:02}"
            self.content_duration = duration_text
            self.duration_seconds = duration_second
            super().save(update_fields=['content_duration', 'duration_seconds'])  # Save the instance again to update the computed duration fields

class LessonMaterial(models.Model):
    """A supplementary file (slides, handout, etc.) attached to a lesson.

    Uploaded as a plain multipart request -- unlike the lesson video, these
    are small enough (and infrequent enough) that the resumable chunked
    pipeline would be overkill, and Django streams FileField uploads to a
    temp file regardless of size, so there's no practical size ceiling here.
    """
    variant_item = models.ForeignKey(VariantItem, on_delete=models.CASCADE, related_name='materials')
    file = models.FileField(upload_to='lesson-materials/')
    original_filename = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['uploaded_at']

    def __str__(self):
        return self.original_filename or self.file.name


UPLOAD_STATUS = (
    ('Uploading', 'Uploading'),
    ('Completed', 'Completed'),
    ('Cancelled', 'Cancelled'),
)


class VideoUploadSession(models.Model):
    """Tracks a resumable, chunked lesson-video upload to local disk.

    Chunks are appended to a temp file under MEDIA_ROOT/tmp_uploads/ as they
    arrive; if the connection drops, the frontend re-queries received_bytes
    and resumes from there instead of restarting the whole upload.
    """
    upload_id = ShortUUIDField(length=12, max_length=24, unique=True, alphabet="abcdefghijklmnopqrstuvwxyz1234567890")
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE)
    variant_item = models.ForeignKey(VariantItem, on_delete=models.CASCADE, related_name='upload_sessions')
    original_filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100, blank=True, null=True)
    total_size = models.BigIntegerField()
    received_bytes = models.BigIntegerField(default=0)
    status = models.CharField(max_length=20, choices=UPLOAD_STATUS, default='Uploading')
    temp_path = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.original_filename} ({self.received_bytes}/{self.total_size})"

    @property
    def percent_complete(self):
        if not self.total_size:
            return 0
        return round(self.received_bytes / self.total_size * 100, 2)


class Question_Answer(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=1000, blank=True, null=True)
    question_answer_id = ShortUUIDField(length=6, max_length=20, unique=True, alphabet="1234567890")
    date = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.username} - {self.course.title}"
    
    def messages(self):
        return Question_Answer_Message.objects.filter(question=self)
    
    def profile(self):
        return UserProfile.objects.filter(user=self.user)
    
class Question_Answer_Message(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    question = models.ForeignKey(Question_Answer, on_delete=models.CASCADE)
    message = models.TextField(blank=True, null=True)
    question_answer_message_id = ShortUUIDField(length=6, max_length=20, unique=True, alphabet="1234567890")
    date = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.username} - {self.question.course.title}"
    
    def profile(self):
        return UserProfile.objects.get(user=self.user)

class Certificate(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    certificate_id = ShortUUIDField(length=6, max_length=20, unique=True, alphabet="1234567890")
    certificate_number = models.CharField(max_length=40, unique=True, blank=True, null=True)
    pdf = models.FileField(upload_to='certificates/', blank=True, null=True)
    date = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return self.course.title

    def save(self, *args, **kwargs):
        if not self.certificate_number:
            self.certificate_number = f"NAA-{self.certificate_id or ''}".upper()
        super().save(*args, **kwargs)

class LessonProgress(models.Model):
    """Server-authoritative watch progress for a single (user, lesson) pair.

    A row exists as soon as a student starts a lesson, well before it is
    completed, so it doubles as the anti-skip ledger: max_watched_position is
    the furthest point the student has legitimately reached, and no client
    report is ever allowed to move current_position beyond it without limit.
    """
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    variant_item = models.ForeignKey(VariantItem, on_delete=models.CASCADE)
    completed_course_id = ShortUUIDField(length=6, max_length=20, unique=True, alphabet="1234567890")

    duration = models.FloatField(default=0)
    current_position = models.FloatField(default=0)
    max_watched_position = models.FloatField(default=0)
    completion_percentage = models.FloatField(default=0)
    completed = models.BooleanField(default=False)

    date = models.DateTimeField(default=timezone.now)
    last_watched_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        unique_together = ('user', 'variant_item')
        verbose_name_plural = "Lesson progress"

    def __str__(self):
        return self.course.title

class EnrolledCourse(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True)
    enrolled_course_id = ShortUUIDField(length=6, max_length=20, unique=True, alphabet="1234567890")
    date = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return self.course.title

    def lectures(self):
        return VariantItem.objects.filter(variant__course=self.course)

    def completed_lesson(self):
        return LessonProgress.objects.filter(course=self.course, user=self.user, completed=True)

    def curriculum(self):
        return Variant.objects.filter(course=self.course)

    def progress_percentage(self):
        total = self.course.total_lessons()
        if not total:
            return 0
        return round(self.completed_lesson().count() / total * 100)

    def is_course_completed(self):
        total = self.course.total_lessons()
        return total > 0 and self.completed_lesson().count() >= total

    def note(self):
        return Note.objects.filter(course=self.course, user=self.user)

    def question_answer(self):
        return Question_Answer.objects.filter(course=self.course, user=self.user)

    def review(self):
        return Review.objects.filter(course=self.course, user=self.user).first()

class Note(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    note_id = ShortUUIDField(length=6, max_length=20, unique=True, alphabet="1234567890")
    date = models.DateTimeField(default=timezone.now)
    title = models.CharField(max_length=1000, blank=True, null=True)
    note = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return self.course.title

class Review(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    date = models.DateTimeField(default=timezone.now)
    rating = models.IntegerField(choices=RATING, default=None)
    review = models.TextField(blank=True, null=True)
    active = models.BooleanField(default=False)
    reply = models.TextField(blank=True, null=True, max_length=1000)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return self.course.title

    def profile(self):
        return UserProfile.objects.get(user=self.user)

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True)
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True, blank=True)
    review = models.ForeignKey(Review, on_delete=models.SET_NULL, null=True, blank=True)
    type = models.CharField(choices=NOTI_TYPE, max_length=1000, blank=True, null=True)
    seen = models.BooleanField(default=False)
    date = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return self.type

class Wishlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    date = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return self.course.title

class Country(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10)
    active = models.BooleanField(default=True)
    date = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name