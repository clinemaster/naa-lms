from django.db import migrations


def rename_course_item_to_order_item(apps, schema_editor):
    table_name = "api_enrolledcourse"

    with schema_editor.connection.cursor() as cursor:
        description = schema_editor.connection.introspection.get_table_description(cursor, table_name)
        columns = {col.name for col in description}

    if "course_item_id" in columns and "order_item_id" not in columns:
        schema_editor.execute(
            "ALTER TABLE api_enrolledcourse RENAME COLUMN course_item_id TO order_item_id"
        )


def rename_order_item_to_course_item(apps, schema_editor):
    table_name = "api_enrolledcourse"

    with schema_editor.connection.cursor() as cursor:
        description = schema_editor.connection.introspection.get_table_description(cursor, table_name)
        columns = {col.name for col in description}

    if "order_item_id" in columns and "course_item_id" not in columns:
        schema_editor.execute(
            "ALTER TABLE api_enrolledcourse RENAME COLUMN order_item_id TO course_item_id"
        )


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0008_alter_cart_user"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    rename_course_item_to_order_item,
                    reverse_code=rename_order_item_to_course_item,
                )
            ],
            state_operations=[
                migrations.RenameField(
                    model_name="enrolledcourse",
                    old_name="course_item",
                    new_name="order_item",
                )
            ],
        )
    ]
