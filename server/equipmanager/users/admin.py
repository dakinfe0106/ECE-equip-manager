from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class EquipmentUserAdmin(UserAdmin):
    fieldsets = (*UserAdmin.fieldsets, ('Application role', {'fields': ('role',)}))
    add_fieldsets = (*UserAdmin.add_fieldsets, ('Application role', {'fields': ('role',)}))
    list_display = (*UserAdmin.list_display, 'role')
    list_filter = (*UserAdmin.list_filter, 'role')

    def get_fieldsets(self, request, obj=None):
        fieldsets = super().get_fieldsets(request, obj)
        if request.user.is_superuser:
            return fieldsets

        restricted_fields = {'is_staff', 'is_superuser', 'groups', 'user_permissions'}
        filtered_fieldsets = []
        for title, options in fieldsets:
            fields = tuple(
                field
                for field in options.get('fields', ())
                if field not in restricted_fields
            )
            if fields:
                filtered_fieldsets.append((title, {**options, 'fields': fields}))
        return filtered_fieldsets
