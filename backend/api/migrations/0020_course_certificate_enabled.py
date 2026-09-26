from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0019_add_teammate_adls_category'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='certificate_enabled',
            field=models.BooleanField(default=False),
        ),
    ]
