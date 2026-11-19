from django.db.models import Count, Q

from .models import EquipmentType


def availability_report(*, category_id=None, equipment_type_id=None):
    equipment_types = EquipmentType.objects.filter(
        is_deleted=False,
        category__is_deleted=False,
    )
    if category_id is not None:
        equipment_types = equipment_types.filter(category_id=category_id)
    if equipment_type_id is not None:
        equipment_types = equipment_types.filter(type_id=equipment_type_id)

    records = equipment_types.annotate(
        total_assets=Count("assets", filter=Q(assets__is_deleted=False)),
        available_assets=Count(
            "assets",
            filter=Q(assets__is_deleted=False, assets__status="Available"),
        ),
        on_loan_assets=Count(
            "assets",
            filter=Q(assets__is_deleted=False, assets__status="On_Loan"),
        ),
        under_maintenance_assets=Count(
            "assets",
            filter=Q(
                assets__is_deleted=False,
                assets__status="Under_Maintenance",
            ),
        ),
        retired_assets=Count(
            "assets",
            filter=Q(assets__is_deleted=False, assets__status="Retired"),
        ),
    ).order_by("category__name", "name", "type_id")

    return [
        {
            "category_id": record.category_id,
            "category_name": record.category.name,
            "equipment_type_id": record.type_id,
            "equipment_type_name": record.name,
            "total_assets": record.total_assets,
            "available_assets": record.available_assets,
            "on_loan_assets": record.on_loan_assets,
            "under_maintenance_assets": record.under_maintenance_assets,
            "retired_assets": record.retired_assets,
        }
        for record in records.select_related("category")
    ]
