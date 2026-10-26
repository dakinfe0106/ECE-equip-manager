from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group

from .models import User


@admin.register(User)
class EmsUserAdmin(UserAdmin):
    def get_fieldsets(self, request, obj=None):
        fieldsets = super().get_fieldsets(request, obj)
        if request.user.is_superuser:
            return fieldsets

        restricted_fields = {"is_staff", "is_superuser", "user_permissions"}
        filtered_fieldsets = []
        for title, options in fieldsets:
            fields = tuple(
                field
                for field in options.get("fields", ())
                if field not in restricted_fields
            )
            if fields:
                filtered_fieldsets.append((title, {**options, "fields": fields}))
        return filtered_fieldsets

    def formfield_for_manytomany(self, db_field, request, **kwargs):
        if db_field.name == "groups" and not request.user.is_superuser:
            kwargs["queryset"] = Group.objects.filter(
                name__in=("Technician", "Faculty", "Administrator")
            )
        return super().formfield_for_manytomany(db_field, request, **kwargs)
