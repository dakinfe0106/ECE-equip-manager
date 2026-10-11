from django.db import models
from django.db.models import CheckConstraint, F, UniqueConstraint
from django.db.models.functions import Length, Lower, Trim
from django.db.models.lookups import GreaterThan


class Category(models.Model):
    category_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        constraints = (
            UniqueConstraint(
                Lower(Trim("name")),
                name="inv_category_name_ci_uniq",
            ),
            CheckConstraint(
                condition=GreaterThan(Length(Trim("name")), 0),
                name="inv_category_name_nonblank",
            ),
        )

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
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
                F("category"),
                Lower(Trim("name")),
                name="inv_type_cat_name_ci_uniq",
            ),
            CheckConstraint(
                condition=GreaterThan(Length(Trim("name")), 0),
                name="inv_type_name_nonblank",
            ),
        )

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
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
    equipment_type = models.ForeignKey(
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
                Lower(Trim("asset_identifier")),
                name="inv_asset_ident_ci_uniq",
            ),
            CheckConstraint(
                condition=GreaterThan(Length(Trim("asset_identifier")), 0),
                name="inv_asset_identifier_nonblank",
            ),
            CheckConstraint(
                condition=GreaterThan(Length(Trim("name")), 0),
                name="inv_asset_name_nonblank",
            ),
        )

    def save(self, *args, **kwargs):
        self.asset_identifier = self.asset_identifier.strip()
        self.name = self.name.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.asset_identifier
