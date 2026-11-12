from django.db import migrations, models
from django.db.models.functions import Lower


class Migration(migrations.Migration):
    """Asset IDs are unique regardless of case (confirmed by the team)."""

    dependencies = [
        ("inventory", "0002_align_inventory_conventions"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="asset",
            name="inventory_asset_identifier_unique",
        ),
        migrations.AddConstraint(
            model_name="asset",
            constraint=models.UniqueConstraint(
                Lower("asset_identifier"),
                name="inventory_asset_identifier_ci_unique",
            ),
        ),
    ]
