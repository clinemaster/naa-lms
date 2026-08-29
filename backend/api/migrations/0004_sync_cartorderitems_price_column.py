from django.db import migrations


def add_price_column_if_missing(apps, schema_editor):
    cursor = schema_editor.connection.cursor()
    cursor.execute("PRAGMA table_info(api_cartorderitems)")
    columns = [row[1] for row in cursor.fetchall()]

    if "price" not in columns:
        schema_editor.execute(
            "ALTER TABLE api_cartorderitems ADD COLUMN price decimal DEFAULT 0.00"
        )


def noop_reverse(apps, schema_editor):
    # SQLite cannot reliably drop columns in-place across all versions.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0003_alter_cart_cart_id"),
    ]

    operations = [
        migrations.RunPython(add_price_column_if_missing, noop_reverse),
    ]
