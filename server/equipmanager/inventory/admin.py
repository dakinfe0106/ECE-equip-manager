from django.contrib import admin

from .models import Category, EquipmentType


class SoftDeleteModelAdmin(admin.ModelAdmin):
    """Hide admin deletion: it would bypass soft deletion (docs/Backend.md, section 5)."""

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Category)
class CategoryAdmin(SoftDeleteModelAdmin):
    list_display = ("name", "is_deleted")
    list_filter = ("is_deleted",)
    search_fields = ("name",)


@admin.register(EquipmentType)
class EquipmentTypeAdmin(SoftDeleteModelAdmin):
    list_display = ("name", "category", "is_deleted")
    list_filter = ("is_deleted", "category")
    search_fields = ("name",)
