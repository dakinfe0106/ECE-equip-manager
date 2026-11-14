
from django.conf import settings
from django.db import models
from django.db.models import CheckConstraint, Q, UniqueConstraint
from django.db.models.functions import Trim

from equipmanager.text import normalize_text
from inventory.models import Asset


class Borrower(models.Model):
    borrower_id = models.AutoField(primary_key=True)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255, blank=True, default="")
    unb_id = models.CharField(max_length=100)
    negligent_damage_flag = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        constraints = (
            UniqueConstraint(
                fields=("unb_id",),
                name="lending_borrower_unb_id_unique",
            ),
            CheckConstraint(
                condition=Q(first_name=Trim("first_name")) & ~Q(first_name=""),
                name="lending_borrower_first_name_trimmed_nonempty",
            ),
            CheckConstraint(
                condition=Q(unb_id=Trim("unb_id")) & ~Q(unb_id=""),
                name="lending_borrower_unb_id_trimmed_nonempty",
            ),
        )

    def save(self, *args, **kwargs):
        self.first_name = normalize_text(self.first_name)
        self.last_name = normalize_text(self.last_name)
        self.unb_id = normalize_text(self.unb_id)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.first_name} {self.last_name}".strip()


class DamageFlag(models.Model):
    class Status(models.TextChoices):
        UNRESOLVED = "unresolved", "Unresolved"
        RESOLVED = "resolved", "Resolved"

    damage_flag_id = models.AutoField(primary_key=True)
    borrower = models.ForeignKey(
        Borrower,
        db_column="borrower_id",
        on_delete=models.PROTECT,
        related_name="damage_flags",
    )
    asset = models.ForeignKey(
        Asset,
        db_column="asset_id",
        on_delete=models.PROTECT,
        related_name="damage_flags",
    )
    incident_date = models.DateField()
    reason = models.CharField(max_length=1000)
    notes = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.UNRESOLVED,
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="reviewed_damage_flags",
    )
    reviewed_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="resolved_damage_flags",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_reason = models.CharField(max_length=1000, blank=True, default="")

    class Meta:
        constraints = (
            CheckConstraint(
                condition=Q(reason=Trim("reason")) & ~Q(reason=""),
                name="lending_damage_flag_reason_nonempty",
            ),
            CheckConstraint(
                condition=Q(status__in=("unresolved", "resolved")),
                name="lending_damage_flag_status_valid",
            ),
            CheckConstraint(
                condition=(
                    Q(
                        status="unresolved",
                        resolved_by__isnull=True,
                        resolved_at__isnull=True,
                        resolution_reason="",
                    )
                    | (
                        Q(
                            status="resolved",
                            resolved_by__isnull=False,
                            resolved_at__isnull=False,
                        )
                        & Q(resolution_reason=Trim("resolution_reason"))
                        & ~Q(resolution_reason="")
                    )
                ),
                name="lending_damage_flag_resolution_complete",
            ),
        )

    def save(self, *args, **kwargs):
        self.reason = normalize_text(self.reason)
        self.notes = normalize_text(self.notes)
        self.resolution_reason = normalize_text(self.resolution_reason)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Damage flag {self.damage_flag_id} for borrower {self.borrower_id}"


class DamageFlagEditAudit(models.Model):
    damage_flag_edit_audit_id = models.AutoField(primary_key=True)
    damage_flag = models.ForeignKey(
        DamageFlag,
        db_column="damage_flag_id",
        on_delete=models.PROTECT,
        related_name="edit_history",
    )
    edited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="damage_flag_edits",
    )
    edited_at = models.DateTimeField(auto_now_add=True)
    changed_fields = models.JSONField()

    def __str__(self):
        return f"Edit audit {self.damage_flag_edit_audit_id} for damage flag {self.damage_flag_id}"
