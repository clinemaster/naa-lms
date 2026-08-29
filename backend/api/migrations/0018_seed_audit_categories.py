from django.db import migrations

CATEGORIES = [
    "Financial Audit",
    "Compliance Audit",
    "Performance Audit",
    "IT & Information Systems Audit",
    "Data Analytics & CAATs",
    "Forensic Audit & Fraud Investigation",
    "Extractive Industry Audit",
    "Public Procurement Audit",
    "Local Government Audit",
    "Revenue Audit",
    "Public Debt Audit",
    "Payroll & Pension Audit",
    "Quality Assurance",
    "ISSAI & Audit Standards",
    "Audit Planning & Management",
    "Audit Reporting & Communication",
    "Ethics & Professional Conduct",
    "Emerging & Specialized Audits",
]


def seed_categories(apps, schema_editor):
    # apps.get_model() returns a historical model without Category.save()'s
    # slug-generation override, so the slug is set explicitly here to match
    # it (title.lower().replace(' ', '-')).
    Category = apps.get_model("api", "Category")
    for title in CATEGORIES:
        Category.objects.get_or_create(title=title, defaults={"slug": title.lower().replace(" ", "-")})


def remove_categories(apps, schema_editor):
    Category = apps.get_model("api", "Category")
    Category.objects.filter(title__in=CATEGORIES).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0017_lessonmaterial"),
    ]

    operations = [
        migrations.RunPython(seed_categories, remove_categories),
    ]
