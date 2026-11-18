from django.contrib import admin
from .models import Borrower


@admin.register(Borrower)
class BorrowerAdmin(admin.ModelAdmin):
    list_display = (
        "unb_id",
        "first_name",
        "last_name",
        "is_manual_enrollment",
        "negligent_damage_flag",
        "is_deleted",
    )
    list_filter = ("is_manual_enrollment", "negligent_damage_flag", "is_deleted")
    search_fields = ("unb_id", "first_name", "last_name")
    ordering = ("last_name", "first_name")