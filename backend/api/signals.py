from django.db.models.signals import post_save
from django.dispatch import receiver

from userauths.models import ROLE_TEACHER, User


@receiver(post_save, sender=User)
def ensure_teacher_profile(sender, instance, raw=False, **kwargs):
    """Every Teacher-role account needs a Teacher row, or teacher endpoints 404.

    Done on save so it holds however the account is created or promoted:
    the API, the Django admin, createsuperuser or the shell.
    """
    if raw or instance.role != ROLE_TEACHER:
        return
    from api.models import Teacher

    Teacher.objects.get_or_create(user=instance, defaults={'full_name': instance.full_name})
