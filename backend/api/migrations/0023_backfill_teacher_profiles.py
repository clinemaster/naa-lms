from django.db import migrations


def backfill_teacher_profiles(apps, schema_editor):
    User = apps.get_model('userauths', 'User')
    Teacher = apps.get_model('api', 'Teacher')
    for user in User.objects.filter(role='Teacher', teacher__isnull=True):
        Teacher.objects.create(user=user, full_name=user.full_name or user.email.split('@')[0])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0022_alter_course_language'),
        ('userauths', '0007_user_role_sysadmin_label'),
    ]

    operations = [
        migrations.RunPython(backfill_teacher_profiles, migrations.RunPython.noop),
    ]
