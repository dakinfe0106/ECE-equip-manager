from django.db import migrations, models
from django.db.models import Q
from django.db.models.functions import Lower, Trim


def normalize_existing_text(apps, schema_editor):
    Category = apps.get_model("inventory", "Category")
    EquipmentType = apps.get_model("inventory", "EquipmentType")
    Asset = apps.get_model("inventory", "Asset")

    Category.objects.update(name=Trim("name"))
    EquipmentType.objects.update(
        name=Trim("name"),
        description=Trim("description"),
    )
    Asset.objects.update(
        asset_identifier=Trim("asset_identifier"),
        name=Trim("name"),
    )


class Migration(migrations.Migration):
    dependencies = [
        ("inventory", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            normalize_existing_text,
            migrations.RunPython.noop,
        ),
        migrations.RemoveConstraint(
            model_name="category",
            name="inv_category_name_ci_uniq",
        ),
        migrations.RemoveConstraint(
            model_name="category",
            name="inv_category_name_nonblank",
        ),
        migrations.RemoveConstraint(
            model_name="equipmenttype",
            name="inv_type_cat_name_ci_uniq",
        ),
        migrations.RemoveConstraint(
            model_name="equipmenttype",
            name="inv_type_name_nonblank",
        ),
        migrations.RemoveConstraint(
            model_name="asset",
            name="inv_asset_ident_ci_uniq",
        ),
        migrations.RemoveConstraint(
            model_name="asset",
            name="inv_asset_identifier_nonblank",
        ),
        migrations.RemoveConstraint(
            model_name="asset",
            name="inv_asset_name_nonblank",
        ),
        migrations.RenameField(
            model_name="asset",
            old_name="equipment_type",
            new_name="type",
        ),
        migrations.AddConstraint(
            model_name="category",
            constraint=models.UniqueConstraint(
                Lower("name"),
                name="inventory_category_name_ci_unique",
            ),
        ),
        migrations.AddConstraint(
            model_name="category",
            constraint=models.CheckConstraint(
                condition=Q(name=Trim("name")) & ~Q(name=""),
                name="inventory_category_name_trimmed_nonempty",
            ),
        ),
        migrations.AddConstraint(
            model_name="equipmenttype",
            constraint=models.UniqueConstraint(
                Lower("name"),
                "category",
                name="inventory_equipment_type_category_name_ci_unique",
            ),
        ),
        migrations.AddConstraint(
            model_name="equipmenttype",
            constraint=models.CheckConstraint(
                condition=Q(name=Trim("name")) & ~Q(name=""),
                name="inventory_equipment_type_name_trimmed_nonempty",
            ),
        ),
        migrations.AddConstraint(
            model_name="asset",
            constraint=models.UniqueConstraint(
                fields=("asset_identifier",),
                name="inventory_asset_identifier_unique",
            ),
        ),
        migrations.AddConstraint(
            model_name="asset",
            constraint=models.CheckConstraint(
                condition=Q(asset_identifier=Trim("asset_identifier"))
                & ~Q(asset_identifier=""),
                name="inventory_asset_identifier_trimmed_nonempty",
            ),
        ),
        migrations.AddConstraint(
            model_name="asset",
            constraint=models.CheckConstraint(
                condition=Q(name=Trim("name")) & ~Q(name=""),
                name="inventory_asset_name_trimmed_nonempty",
            ),
        ),
    ]
