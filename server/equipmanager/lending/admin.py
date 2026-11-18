from django.contrib import admin

from .models import Borrower


@admin.register(Borrower)
class BorrowerAdmin(admin.ModelAdmin):
    list_display = ("unb_id", "first_name", "last_name", "negligent_damage_flag", "is_deleted")
    search_fields = ("unb_id", "first_name", "last_name")
    list_filter = ("negligent_damage_flag", "is_deleted")

    def has_delete_permission(self, request, obj=None):
        return False