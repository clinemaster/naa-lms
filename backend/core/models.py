from django.db import models


class SiteConfiguration(models.Model):
    """Singleton platform-wide settings, editable by System Admins.

    Only one row is ever expected to exist; get_solo() creates it on first
    access with the Phase 1 defaults (sequential learning enforced).
    """
    sequential_learning_enabled = models.BooleanField(default=True)
    lesson_completion_threshold = models.PositiveIntegerField(
        default=90,
        help_text="Percentage of a lesson's duration a student must watch before it counts as completed.",
    )

    class Meta:
        verbose_name = "Site configuration"
        verbose_name_plural = "Site configuration"

    def __str__(self):
        return "Site configuration"

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
