from django.db import migrations


def backfill_roles(apps, schema_editor):
    User = apps.get_model('userauths', 'User')
    Teacher = apps.get_model('api', 'Teacher')

    teacher_user_ids = set(Teacher.objects.values_list('user_id', flat=True))

    for user in User.objects.all():
        if user.is_superuser:
            new_role = 'Admin'
        elif user.id in teacher_user_ids:
            new_role = 'Teacher'
        else:
            new_role = 'Student'

        if user.role != new_role:
            user.role = new_role
            if new_role == 'Admin':
                user.is_staff = True
            user.save(update_fields=['role', 'is_staff'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('userauths', '0004_user_role'),
        ('api', '0013_alter_variant_options_alter_variantitem_options_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_roles, noop_reverse),
    ]
