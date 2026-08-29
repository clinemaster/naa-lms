from django.db import migrations

TITLE = "TEAMMATE+ AND ADLS"


def add_category(apps, schema_editor):
    Category = apps.get_model("api", "Category")
    Category.objects.get_or_create(title=TITLE, defaults={"slug": TITLE.lower().replace(" ", "-")})


def remove_category(apps, schema_editor):
    Category = apps.get_model("api", "Category")
    Category.objects.filter(title=TITLE).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0018_seed_audit_categories"),
    ]

    operations = [
        migrations.RunPython(add_category, remove_category),
    ]
