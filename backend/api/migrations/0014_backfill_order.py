from django.db import migrations


def backfill_order(apps, schema_editor):
    Variant = apps.get_model('api', 'Variant')
    VariantItem = apps.get_model('api', 'VariantItem')

    for course_id in Variant.objects.values_list('course_id', flat=True).distinct():
        variants = list(Variant.objects.filter(course_id=course_id).order_by('date', 'id'))
        for index, variant in enumerate(variants, start=1):
            if variant.order != index:
                variant.order = index
                variant.save(update_fields=['order'])

    for variant_id in VariantItem.objects.values_list('variant_id', flat=True).distinct():
        items = list(VariantItem.objects.filter(variant_id=variant_id).order_by('date', 'id'))
        for index, item in enumerate(items, start=1):
            if item.order != index:
                item.order = index
                item.save(update_fields=['order'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_alter_variant_options_alter_variantitem_options_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_order, noop_reverse),
    ]
