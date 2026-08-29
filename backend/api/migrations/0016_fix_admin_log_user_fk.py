from django.db import migrations


def fix_admin_log_fk(apps, schema_editor):
    """Repair django_admin_log.user_id on dev SQLite databases carried over
    from before AUTH_USER_MODEL was switched to userauths.User. The raw FK
    was left pointing at the unused default auth_user table, so every admin
    action (which writes a LogEntry) raised IntegrityError. No-op on a
    correctly-provisioned database (fresh installs never hit this)."""
    if schema_editor.connection.vendor != "sqlite":
        return

    with schema_editor.connection.cursor() as cursor:
        cursor.execute("PRAGMA foreign_key_list(django_admin_log)")
        fk_targets = {row[2] for row in cursor.fetchall()}
        if "userauths_user" in fk_targets:
            return

        cursor.execute("PRAGMA foreign_keys=OFF")
        # Existing rows reference ids from the abandoned auth_user table and
        # carry no meaningful history for this project - safe to drop.
        cursor.execute("DELETE FROM django_admin_log")
        cursor.execute(
            '''
            CREATE TABLE "django_admin_log__new" (
                "id" integer NOT NULL PRIMARY KEY AUTOINCREMENT,
                "object_id" text NULL,
                "object_repr" varchar(200) NOT NULL,
                "action_flag" smallint unsigned NOT NULL CHECK ("action_flag" >= 0),
                "change_message" text NOT NULL,
                "content_type_id" integer NULL REFERENCES "django_content_type" ("id") DEFERRABLE INITIALLY DEFERRED,
                "user_id" integer NOT NULL REFERENCES "userauths_user" ("id") DEFERRABLE INITIALLY DEFERRED,
                "action_time" datetime NOT NULL
            )
            '''
        )
        cursor.execute('DROP TABLE "django_admin_log"')
        cursor.execute('ALTER TABLE "django_admin_log__new" RENAME TO "django_admin_log"')
        cursor.execute(
            'CREATE INDEX "django_admin_log_content_type_id_idx" ON "django_admin_log" ("content_type_id")'
        )
        cursor.execute(
            'CREATE INDEX "django_admin_log_user_id_idx" ON "django_admin_log" ("user_id")'
        )
        cursor.execute("PRAGMA foreign_keys=ON")


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0015_alter_lessonprogress_completed"),
        ("userauths", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(fix_admin_log_fk, migrations.RunPython.noop),
    ]
