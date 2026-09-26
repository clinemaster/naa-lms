from django.db import migrations, models
from django.db.models import Count


def enable_for_courses_with_certificates(apps, schema_editor):
    """Courses default to certificates disabled. The one explicit signal in
    existing data is a certificate that was already issued for the course, so
    those courses keep issuing them. No Certificate row is created or changed.
    """
    Course = apps.get_model('api', 'Course')
    Certificate = apps.get_model('api', 'Certificate')
    course_ids = Certificate.objects.values_list('course_id', flat=True).distinct()
    Course.objects.filter(id__in=course_ids).update(certificate_enabled=True)


def refuse_if_duplicates_exist(apps, schema_editor):
    """The unique constraint cannot be added while duplicates exist. Deleting
    issued certificates automatically is not a safe default, so stop and say
    which ones need a human decision.
    """
    Certificate = apps.get_model('api', 'Certificate')
    duplicates = (
        Certificate.objects.filter(user__isnull=False)
        .values('user_id', 'course_id')
        .annotate(total=Count('id'))
        .filter(total__gt=1)
    )
    if duplicates.exists():
        pairs = ', '.join(f"(user={d['user_id']}, course={d['course_id']}, x{d['total']})" for d in duplicates)
        raise RuntimeError(
            "Cannot enforce one certificate per student per course: duplicate certificates already exist for "
            f"{pairs}. Remove the extra Certificate rows (keep the earliest) and re-run the migration."
        )


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0020_course_certificate_enabled'),
    ]

    operations = [
        migrations.RunPython(enable_for_courses_with_certificates, migrations.RunPython.noop),
        migrations.RunPython(refuse_if_duplicates_exist, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='certificate',
            constraint=models.UniqueConstraint(fields=('user', 'course'), name='unique_certificate_per_user_course'),
        ),
    ]
