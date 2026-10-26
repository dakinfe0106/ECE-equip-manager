from django.db import migrations


def seed_role_groups(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    ContentType = apps.get_model("contenttypes", "ContentType")
    database = schema_editor.connection.alias

    role_models = {
        "Technician": [
            ("inventory", "category"),
            ("inventory", "equipmenttype"),
            ("inventory", "asset"),
        ],
        "Faculty": [
            ("inventory", "category"),
            ("inventory", "equipmenttype"),
            ("inventory", "asset"),
        ],
        "Administrator": [
            ("inventory", "category"),
            ("inventory", "equipmenttype"),
            ("inventory", "asset"),
            ("users", "user"),
        ],
    }

    for role_name, models in role_models.items():
        group, _ = Group.objects.using(database).get_or_create(name=role_name)
        for app_label, model_name in models:
            content_type, _ = ContentType.objects.using(database).get_or_create(
                app_label=app_label,
                model=model_name,
            )
            actions = (
                ("view",)
                if role_name == "Faculty"
                else ("add", "change", "delete", "view")
            )
            for action in actions:
                codename = f"{action}_{model_name}"
                permission, _ = Permission.objects.using(database).get_or_create(
                    content_type=content_type,
                    codename=codename,
                    defaults={"name": f"Can {action} {model_name}"},
                )
                group.permissions.add(permission)


class Migration(migrations.Migration):
    dependencies = [
        ("inventory", "0002_align_inventory_conventions"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_role_groups, migrations.RunPython.noop),
    ]
