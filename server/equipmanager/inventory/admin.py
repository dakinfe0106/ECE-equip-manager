from django.contrib import admin

from .models import Asset, Category, EquipmentType


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('asset_identifier', 'name', 'status', 'acquisition_date')
    search_fields = ('asset_identifier', 'name')
    list_filter = ('status', 'equipment_type__category')

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('category_id', 'name', 'is_deleted')

@admin.register(EquipmentType)
class EquipmentTypeAdmin(admin.ModelAdmin):
    list_display = ('type_id', 'name', 'category', 'is_deleted')