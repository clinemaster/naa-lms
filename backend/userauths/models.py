from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save

ROLE_STUDENT = 'Student'
ROLE_TEACHER = 'Teacher'
ROLE_ADMIN = 'Admin'

ROLE_CHOICES = (
    (ROLE_STUDENT, 'Student'),
    (ROLE_TEACHER, 'Teacher'),
    (ROLE_ADMIN, 'Admin'),
)


class User(AbstractUser):
    # Add any additional fields you want for your custom user model
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    otp = models.CharField(max_length=6, blank=True, null=True)
    refresh_token = models.CharField(max_length=1000, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_STUDENT)


    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']


    def __str__(self):
        return self.email

    @property
    def is_student(self):
        return self.role == ROLE_STUDENT

    @property
    def is_teacher_role(self):
        return self.role == ROLE_TEACHER

    @property
    def is_admin_role(self):
        return self.role == ROLE_ADMIN or self.is_superuser

    def save(self, *args, **kwargs):
        email_username = self.email.split('@')[0]
        if self.full_name == '' or self.full_name is None:
            self.full_name = email_username
        if self.username == '' or self.username is None:
            self.username = email_username
        if self.is_superuser:
            self.role = ROLE_ADMIN
        if self.role == ROLE_ADMIN:
            self.is_staff = True
        super().save(*args, **kwargs)


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    image = models.FileField(upload_to='user_folder/', default='user_folder/default.jpg', blank=True, null=True)
    full_name = models.CharField(max_length=255)
    bio = models.TextField(blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    date = models.DateField(auto_now_add=True)
    about = models.TextField(blank=True, null=True)

    def __str__(self):
        if self.full_name:
            return str(self.full_name)
        else:
            return str(self.user.full_name)  
        
    def save(self, *args, **kwargs):
        if self.full_name == '' or self.full_name is None:
            self.full_name = self.user.username
        super().save(*args, **kwargs)

def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

def save_user_profile(sender, instance, **kwargs):
    profile, _ = UserProfile.objects.get_or_create(user=instance)
    profile.save()

post_save.connect(create_user_profile, sender=User)
post_save.connect(save_user_profile, sender=User)