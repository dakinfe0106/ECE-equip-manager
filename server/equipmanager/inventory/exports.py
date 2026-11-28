from django.utils import timezone
from rest_framework.views import APIView

from equipmanager.excel import excel_response
from users.permissions import StaffRolePermissions

from .models import Asset

INVENTORY_HEADERS = (
    "Asset ID",
    "Name",
    "Category",
    "Equipment Type",
    "Acquisition Date",
    "Status",
)


def inventory_rows():
    assets = (
        Asset.objects.filter(
            is_deleted=False,
            type__is_deleted=False,
            type__category__is_deleted=False,
        )
        .select_related("type__category")
        .order_by("asset_identifier", "asset_id")
    )
    for asset in assets:
        yield (
            asset.asset_identifier,
            asset.name,
            asset.type.category.name,
            asset.type.name,
            asset.acquisition_date,
            asset.get_status_display(),
        )


class InventoryExport(APIView):
    permission_classes = (StaffRolePermissions,)

    def get(self, request):
        response = excel_response(
            filename=f"ems-inventory-{timezone.localdate()}.xlsx",
            sheet_title="Inventory",
            headers=INVENTORY_HEADERS,
            rows=inventory_rows(),
        )
        response["Cache-Control"] = "no-store"
        return response
