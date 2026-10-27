from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class EquipmentUserAdmin(UserAdmin):
    fieldsets = (*UserAdmin.fieldsets, ('Application role', {'fields': ('role',)}))
    add_fieldsets = (*UserAdmin.add_fieldsets, ('Application role', {'fields': ('role',)}))
    list_display = (*UserAdmin.list_display, 'role')
    list_filter = (*UserAdmin.list_filter, 'role')
