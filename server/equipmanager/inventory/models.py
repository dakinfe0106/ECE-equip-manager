from django.db import models
from django.db.models import CheckConstraint, Q, UniqueConstraint
from django.db.models.functions import Lower, Trim

from equipmanager.text import normalize_text


class Category(models.Model):
    category_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        constraints = (
            UniqueConstraint(
                Lower("name"),
                name="inventory_category_name_ci_unique",
            ),
            CheckConstraint(
                condition=Q(name=Trim("name")) & ~Q(name=""),
                name="inventory_category_name_trimmed_nonempty",
            ),
        )

    def save(self, *args, **kwargs):
        self.name = normalize_text(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class EquipmentType(models.Model):
    type_id = models.AutoField(primary_key=True)
    category = models.ForeignKey(
        Category,
        db_column="category_id",
        on_delete=models.PROTECT,
        related_name="equipment_types",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(default="")
    is_deleted = models.BooleanField(default=False)

    class Meta:
        constraints = (
            UniqueConstraint(
                Lower("name"),
                "category",
                name="inventory_equipment_type_category_name_ci_unique",
            ),
            CheckConstraint(
                condition=Q(name=Trim("name")) & ~Q(name=""),
                name="inventory_equipment_type_name_trimmed_nonempty",
            ),
        )

    def save(self, *args, **kwargs):
        self.name = normalize_text(self.name)
        self.description = normalize_text(self.description)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Asset(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = "Available", "Available"
        ON_LOAN = "On_Loan", "On loan"
        UNDER_MAINTENANCE = "Under_Maintenance", "Under maintenance"
        RETIRED = "Retired", "Retired"

    asset_id = models.AutoField(primary_key=True)
    type = models.ForeignKey(
        EquipmentType,
        db_column="type_id",
        on_delete=models.PROTECT,
        related_name="assets",
    )
    asset_identifier = models.CharField(max_length=100)
    name = models.CharField(max_length=255)
    acquisition_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.AVAILABLE,
    )
    is_deleted = models.BooleanField(default=False)

    class Meta:
        constraints = (
            UniqueConstraint(
                Lower("asset_identifier"),
                name="inventory_asset_identifier_ci_unique",
            ),
            CheckConstraint(
                condition=Q(asset_identifier=Trim("asset_identifier"))
                & ~Q(asset_identifier=""),
                name="inventory_asset_identifier_trimmed_nonempty",
            ),
            CheckConstraint(
                condition=Q(name=Trim("name")) & ~Q(name=""),
                name="inventory_asset_name_trimmed_nonempty",
            ),
        )

    def save(self, *args, **kwargs):
        self.asset_identifier = normalize_text(self.asset_identifier)
        self.name = normalize_text(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.asset_identifier
