
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
