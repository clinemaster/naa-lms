from django.contrib.auth.password_validation import validate_password
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers  # type: ignore
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer  # type: ignore
from api import models as api_models
from userauths.models import User, UserProfile


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['username'] = user.username
        token['email'] = user.email
        token['full_name'] = user.full_name
        token['role'] = user.role
        teacher = api_models.Teacher.objects.filter(user=user).first()
        token['teacher_id'] = teacher.id if teacher else None

        return token
    
    def __init__(self, *args, **kwargs):
        super(CustomTokenObtainPairSerializer, self).__init__(*args, **kwargs)
        if not hasattr(self, 'Meta'):
            return
        request = self.context.get('request')
        if request and request.method == 'POST':
            self.Meta.depth = 0
        else:
            self.Meta.depth = 0

class RegisterSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(required=False, allow_blank=True)
    fullName = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=False)
    confirm_password = serializers.CharField(write_only=True, required=False)
    confirmPassword = serializers.CharField(write_only=True, required=False)
    passwordConfirm = serializers.CharField(write_only=True, required=False)
    cpassword = serializers.CharField(write_only=True, required=False)
    name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'full_name',
            'fullName',
            'name',
            'email',
            'password',
            'password2',
            'confirm_password',
            'confirmPassword',
            'passwordConfirm',
            'cpassword',
        ]
        # extra_kwargs = {'password': {'write_only': True}}

    def validate(self, attrs):
        password = attrs.get('password')
        password2 = (
            attrs.get('password2')
            or attrs.get('confirm_password')
            or attrs.get('confirmPassword')
            or attrs.get('passwordConfirm')
            or attrs.get('cpassword')
        )

        if password2 and password != password2:
            raise serializers.ValidationError({"password": "Password fields didn't match."})

        if not attrs.get('full_name'):
            attrs['full_name'] = attrs.get('name') or attrs.get('fullName')

        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2', None)
        validated_data.pop('confirm_password', None)
        validated_data.pop('confirmPassword', None)
        validated_data.pop('passwordConfirm', None)
        validated_data.pop('cpassword', None)
        validated_data.pop('name', None)
        validated_data.pop('fullName', None)
        email = validated_data['email']
        email_username = email.split('@')[0]
        full_name = validated_data.get('full_name') or email_username
        user = User.objects.create_user(
            username=email_username,
            email=email,
            password=validated_data['password'],
            full_name=full_name,
        )
        return user
    
    def __init__(self, *args, **kwargs):
        super(RegisterSerializer, self).__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.method == 'POST':
            self.Meta.depth = 0
        else:
            self.Meta.depth = 0
        

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'role', 'otp']

    def __init__(self, *args, **kwargs):
        super(UserSerializer, self).__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.method == 'POST':
            self.Meta.depth = 0
        else:
            self.Meta.depth = 0


class AdminUserSerializer(serializers.ModelSerializer):
    """Used by the System Admin's user-management endpoints: create users,
    edit them, activate/deactivate, and assign/change roles."""
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'role', 'is_active', 'date_joined', 'password']
        read_only_fields = ['date_joined']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        validated_data.setdefault('username', validated_data['email'].split('@')[0])
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class SiteConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        from core.models import SiteConfiguration
        model = SiteConfiguration
        fields = ['sequential_learning_enabled', 'lesson_completion_threshold']

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'image', 'full_name', 'bio', 'country', 'date', 'about']

    def __init__(self, *args, **kwargs):
        super(UserProfileSerializer, self).__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.method == 'POST':
            self.Meta.depth = 0
        else:
            self.Meta.depth = 0


class PasswordChangeSerializer(serializers.Serializer):
    otp = serializers.CharField(max_length=6)
    uuidb64 = serializers.CharField()
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=False)

    def to_internal_value(self, data):
        # Accept common frontend naming variants to avoid unnecessary 400 errors.
        mutable_data = dict(data)

        nested_payload = mutable_data.get('data')
        if isinstance(nested_payload, dict):
            mutable_data = {**nested_payload, **mutable_data}

        if 'uuidb64' not in mutable_data:
            mutable_data['uuidb64'] = (
                mutable_data.get('uidb64')
                or mutable_data.get('uid')
                or mutable_data.get('user_id')
                or mutable_data.get('userId')
                or mutable_data.get('uuid')
                or mutable_data.get('id')
                or mutable_data.get('user')
            )

        if 'otp' not in mutable_data:
            mutable_data['otp'] = (
                mutable_data.get('otp_code')
                or mutable_data.get('otpCode')
                or mutable_data.get('code')
            )

        if 'password' not in mutable_data:
            mutable_data['password'] = (
                mutable_data.get('new_password')
                or mutable_data.get('newPassword')
                or mutable_data.get('password1')
                or mutable_data.get('new_password1')
            )

        if 'confirm_password' not in mutable_data:
            mutable_data['confirm_password'] = (
                mutable_data.get('confirmPassword')
                or mutable_data.get('password2')
                or mutable_data.get('new_password2')
            )

        return super().to_internal_value(mutable_data)

    def validate_otp(self, value):
        otp = str(value).strip()
        if not otp.isdigit() or len(otp) != 6:
            raise serializers.ValidationError('OTP must be a 6-digit code.')
        return otp

    def validate_uuidb64(self, value):
        raw_value = str(value).strip()

        if raw_value.isdigit():
            return int(raw_value)

        try:
            decoded = force_str(urlsafe_base64_decode(raw_value))
            if decoded.isdigit():
                return int(decoded)
        except Exception:
            pass

        raise serializers.ValidationError('Invalid user identifier.')

    def validate(self, attrs):
        confirm_password = attrs.get('confirm_password')
        if confirm_password and attrs['password'] != confirm_password:
            raise serializers.ValidationError({'password': "Password fields didn't match."})

        return attrs
    
    def __init__(self, *args, **kwargs):
        super(PasswordChangeSerializer, self).__init__(*args, **kwargs)
        if not hasattr(self, 'Meta'):
            return
        request = self.context.get('request')
        if request and request.method == 'POST':
            self.Meta.depth = 0
        else:
            self.Meta.depth = 0

class CategorySerializer(serializers.ModelSerializer):
    
    class Meta:
        model = api_models.Category
        fields = ['id', 'title', 'image', 'slug', 'course_count']

    def __init__(self, *args, **kwargs):
        super(CategorySerializer, self).__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.method == 'POST':
            self.Meta.depth = 0
        else:
            self.Meta.depth = 0

class TeacherSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    students = serializers.SerializerMethodField()
    courses = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()

    class Meta:
        model = api_models.Teacher
        fields = ['user', 'image', 'full_name', 'name', 'bio', 'facebook', 'twitter', 'linkedin', 'about', 'country', 'students', 'courses', 'reviews']

    def get_name(self, obj):
        if obj.full_name:
            return obj.full_name
        if obj.user and obj.user.full_name:
            return obj.user.full_name
        if obj.user and obj.user.username:
            return obj.user.username
        return ""

    def get_students(self, obj):
        return obj.students().count()

    def get_courses(self, obj):
        return obj.courses().count()

    def get_reviews(self, obj):
        return obj.reviews()
    
    def __init__(self, *args, **kwargs):
        super(TeacherSerializer, self).__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.method == 'POST':
            self.Meta.depth = 0
        else:
            self.Meta.depth = 0

class LessonMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = api_models.LessonMaterial
        fields = ['id', 'file', 'original_filename', 'uploaded_at']


class VariantItemSerializer(serializers.ModelSerializer):
    variant_item_title = serializers.CharField(source='title', read_only=True)
    variant_item_description = serializers.CharField(source='description', read_only=True)
    materials = LessonMaterialSerializer(many=True, read_only=True)

    class Meta:
        model = api_models.VariantItem
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(VariantItemSerializer, self).__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.method == 'POST':
            self.Meta.depth = 0
        else:
            self.Meta.depth = 0

class VariantSerializer(serializers.ModelSerializer):
    variant_title = serializers.CharField(source='title', read_only=True)
    variant_items = VariantItemSerializer(many=True)
    items = VariantItemSerializer(many=True)

    class Meta:
        model = api_models.Variant
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(VariantSerializer, self).__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.method == 'POST':
            self.Meta.depth = 0
        else:
            self.Meta.depth = 0

class QuestionAnswerMessageSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(many=False, source='user.profile')

    class Meta:
        model = api_models.Question_Answer_Message
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(QuestionAnswerMessageSerializer, self).__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.method == 'POST':
            self.Meta.depth = 0
        else:
            self.Meta.depth = 0

class QuestionAnswerSerializer(serializers.ModelSerializer):
    messages = QuestionAnswerMessageSerializer(many=True)   
    profile = UserProfileSerializer(many=False, source='user.profile')
    class Meta:
        model = api_models.Question_Answer
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(QuestionAnswerSerializer, self).__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.method == 'POST':
            self.Meta.depth = 0
        else:
            self.Meta.depth = 0

class LessonProgressSerializer(serializers.ModelSerializer):
    variant_item_title = serializers.CharField(source='variant_item.title', read_only=True)

    class Meta:
        model = api_models.LessonProgress
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(LessonProgressSerializer, self).__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.method == 'POST':
            self.Meta.depth = 0
        else:
            self.Meta.depth = 0

class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = api_models.Note
        fields = '__all__'
    def __init__(self, *args, **kwargs):
        super(NoteSerializer, self).__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.method == 'POST':
            self.Meta.depth = 0
        else:
            self.Meta.depth = 0

class ReviewSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(many=False, source='user.profile')

    class Meta:
        model = api_models.Review
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(ReviewSerializer, self).__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.method == 'POST':
            self.Meta.depth = 0
        else:
            self.Meta.depth = 0

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = api_models.Notification
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(NotificationSerializer, self).__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.method == 'POST':
            self.Meta.depth = 0
        else:
            self.Meta.depth = 0

class WishlistSerializer(serializers.ModelSerializer):
    class Meta:
        model = api_models.Wishlist
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(WishlistSerializer, self).__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.method == 'POST':
            self.Meta.depth = 0
        else:
            self.Meta.depth = 0

class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = api_models.Country
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super(CountrySerializer, self).__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.method == 'POST':
            self.Meta.depth = 0
        else:
            self.Meta.depth = 0

class CourseSerializer(serializers.ModelSerializer):
    lectures = VariantItemSerializer(many=True, read_only=True)
    curriculum = VariantSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    total_lessons = serializers.SerializerMethodField()
    teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = api_models.Course
        fields = [
            'id', 'category', 'teacher', 'teacher_name', 'file', 'title', 'image', 'description', 'language',
            'level', 'slug', 'platform_status', 'teacher_course_status', 'featured', 'course_id', 'date',
            'submitted_at', 'reviewed_at', 'rejection_reason', 'curriculum', 'lectures',
            'total_lessons', 'average_rating', 'rating_count', 'reviews',
        ]
        extra_kwargs = {
            'teacher': {'read_only': True},
        }

    def get_total_lessons(self, obj):
        return obj.total_lessons()

    def get_teacher_name(self, obj):
        teacher = getattr(obj, 'teacher', None)
        if not teacher:
            return ""
        if teacher.full_name:
            return teacher.full_name
        user = getattr(teacher, 'user', None)
        if user and user.full_name:
            return user.full_name
        if user and user.username:
            return user.username
        return ""

    def __init__(self, *args, **kwargs):
        super(CourseSerializer, self).__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.method == 'POST':
            self.Meta.depth = 0
        else:
            self.Meta.depth = 0

class CertificateSerializer(serializers.ModelSerializer):
    # Nested/derived explicitly rather than via Meta.depth's automatic
    # nesting, which would otherwise dump the full related User row
    # (password hash, otp, refresh_token included) onto this public,
    # unauthenticated verification endpoint.
    course = CourseSerializer(read_only=True)
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = api_models.Certificate
        fields = ['id', 'course', 'student_name', 'certificate_id', 'certificate_number', 'pdf', 'date']

    def get_student_name(self, obj):
        return obj.user.full_name if obj.user else ""

class EnrolledCourseSerializer(serializers.ModelSerializer):
    # Nested explicitly (rather than left to Meta.depth's automatic nesting)
    # so computed fields like total_lessons/teacher_name reach the frontend.
    course = CourseSerializer(read_only=True)
    lectures = VariantItemSerializer(many=True, read_only=True)
    completed_lesson = LessonProgressSerializer(many=True, read_only=True)
    curriculum = VariantSerializer(many=True, read_only=True)
    note = NoteSerializer(many=True, read_only=True)
    question_answer = QuestionAnswerSerializer(many=True, read_only=True)
    review = ReviewSerializer(many=False, read_only=True)
    progress_percentage = serializers.SerializerMethodField()
    is_course_completed = serializers.SerializerMethodField()

    class Meta:
        model = api_models.EnrolledCourse
        fields = '__all__'

    def get_progress_percentage(self, obj):
        return obj.progress_percentage()

    def get_is_course_completed(self, obj):
        return obj.is_course_completed()

    def __init__(self, *args, **kwargs):
        super(EnrolledCourseSerializer, self).__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.method == 'POST':
            self.Meta.depth = 0
        else:
            self.Meta.depth = 0

class TeacherCourseListSerializer(serializers.ModelSerializer):
    students = serializers.SerializerMethodField()

    class Meta:
        model = api_models.Course
        fields = [
            'id',
            'course_id',
            'title',
            'image',
            'level',
            'teacher_course_status',
            'date',
            'students',
        ]

    def get_students(self, obj):
        enrolled_count = getattr(obj, 'enrolled_count', None)
        if enrolled_count is None:
            enrolled_count = obj.students().count()
        return {'enrolled': enrolled_count}

class StudentSummarySerializer(serializers.Serializer):
    total_courses = serializers.IntegerField(default=0)
    completed_lessons = serializers.IntegerField(default=0)
    achieved_certificates = serializers.IntegerField(default=0)

class TeacherSummarySerializer(serializers.Serializer):
    total_courses = serializers.IntegerField(default=0)
    total_students = serializers.IntegerField(default=0)
    total_enrollments = serializers.IntegerField(default=0)
    montly_enrollments = serializers.IntegerField(default=0)

