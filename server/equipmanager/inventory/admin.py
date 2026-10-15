
from django.contrib import admin

from .models import Asset


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('asset_identifier', 'name', 'status', 'acquisition_date')
    search_fields = ('asset_identifier', 'name')
    list_filter = ('status', 'type__category')
