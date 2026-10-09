from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.name


class EquipmentType(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="equipment_types",
    )

    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["category", "name"],
                name="unique_equipment_type_per_category",
            )
        ]
        ordering = ["name"]

    def __str__(self):
        return self.name
