from django.contrib import admin

from .models import Asset, Category, EquipmentType


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "is_deleted")
    search_fields = ("name",)


@admin.register(EquipmentType)
class EquipmentTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "is_deleted")
    search_fields = ("name", "category__name")
    list_filter = ("category", "is_deleted")


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('asset_identifier', 'name', 'status', 'acquisition_date')
    search_fields = ('asset_identifier', 'name')
    list_filter = ('status', 'equipment_type__category')
