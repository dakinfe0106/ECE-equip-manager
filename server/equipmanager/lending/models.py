
from django.db import models
from django.db.models import CheckConstraint, Q, UniqueConstraint
from django.db.models.functions import Trim

from equipmanager.text import normalize_text


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


class Loan(models.Model):
    class ReturnCondition(models.TextChoices):
        INTACT = "Intact", "Intact"
        DAMAGED = "Damaged", "Damaged"

    loan_id = models.AutoField(primary_key=True)
    asset = models.ForeignKey("inventory.Asset", on_delete=models.PROTECT)
    borrower = models.ForeignKey(Borrower, on_delete=models.PROTECT)
    checkout_date = models.DateField()
    expected_return_date = models.DateField()
    actual_return_date = models.DateField(null=True, blank=True)
    return_condition = models.CharField(
        max_length=20, choices=ReturnCondition.choices, null=True, blank=True
    )

    class Meta:
        constraints = (
            CheckConstraint(
                condition=Q(expected_return_date__gte=models.F("checkout_date")),
                name="lending_loan_expected_date_order",
            ),
            CheckConstraint(
                condition=Q(actual_return_date__isnull=True)
                | Q(actual_return_date__gte=models.F("checkout_date")),
                name="lending_loan_actual_date_order",
            ),
            CheckConstraint(
                condition=(Q(actual_return_date__isnull=True) & Q(return_condition__isnull=True))
                | (Q(actual_return_date__isnull=False) & Q(return_condition__isnull=False)),
                name="lending_loan_return_complete",
            ),
            CheckConstraint(
                condition=Q(return_condition__isnull=True)
                | Q(return_condition__in=["Intact", "Damaged"]),
                name="lending_loan_return_condition_valid",
            ),
            UniqueConstraint(
                fields=("asset",),
                condition=Q(actual_return_date__isnull=True),
                name="lending_loan_one_open_loan_per_asset",
            ),
        )
