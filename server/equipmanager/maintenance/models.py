
from django.conf import settings
from django.db import models
from django.db.models import F, Q

from inventory.models import Asset


class MaintenanceRecord(models.Model):
    class MaintenanceType(models.TextChoices):
        INSPECTION = "Inspection", "Inspection"
        PREVENTATIVE_CARE = "Preventative-care", "Preventative Care"
        REPAIR = "Repair", "Repair"
        CALIBRATION = "Calibration", "Calibration"
        CLEANING = "Cleaning", "Cleaning"
        SOFTWARE_SERVICE = "Software Service", "Software Service"

    class Priority(models.TextChoices):
        LOW = "Low", "Low"
        MEDIUM = "Medium", "Medium"
        HIGH = "High", "High"
        URGENT = "Urgent", "Urgent"

    maintenance_id = models.AutoField(primary_key=True)
    asset = models.ForeignKey(
        Asset,
        db_column="asset_id",
        on_delete=models.PROTECT,
        related_name="maintenance_records",
    )
    technician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        db_column="technician_id",
        on_delete=models.PROTECT,
        related_name="maintenance_records",
    )
    maintenance_type = models.CharField(
        max_length=30,
        choices=MaintenanceType.choices,
    )
    priority = models.CharField(max_length=10, choices=Priority.choices)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        constraints = (
            models.UniqueConstraint(
                fields=("asset",),
                condition=Q(end_date__isnull=True),
                name="maintenance_record_one_open_per_asset",
            ),
            models.CheckConstraint(
                condition=Q(end_date__isnull=True) | Q(end_date__gte=F("start_date")),
                name="maintenance_record_end_on_or_after_start",
            ),
        )

    def __str__(self):
        return f"{self.asset.asset_identifier} - {self.maintenance_type}"
