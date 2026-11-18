from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction

from inventory.models import Asset
from lending.models import Loan

from .models import MaintenanceRecord

User = get_user_model()


class MaintenanceRuleError(Exception):
    def __init__(self, detail: dict[str, str]):
        self.detail = detail
        super().__init__(str(detail))


@transaction.atomic
def start_maintenance(
    *,
    asset_id: int,
    technician_id: int,
    maintenance_type: str,
    priority: str,
    start_date,
) -> MaintenanceRecord:
    asset = (
        Asset.objects.select_for_update(of=("self",))
        .select_related("type__category")
        .get(pk=asset_id)
    )
    technician = User.objects.get(
        pk=technician_id,
        is_active=True,
        role=User.Role.TECHNICIAN,
    )

    if asset.is_deleted or asset.type.is_deleted or asset.type.category.is_deleted:
        raise MaintenanceRuleError(
            {"asset_id": "Archived equipment cannot enter maintenance."}
        )
    loans = Loan.objects.filter(asset=asset)
    if asset.status == Asset.Status.ON_LOAN or loans.filter(actual_return_date__isnull=True).exists():
        raise MaintenanceRuleError(
            {"asset_id": "Equipment currently on loan must be returned before maintenance."}
        )
    if MaintenanceRecord.objects.filter(asset=asset, end_date__isnull=True).exists():
        raise MaintenanceRuleError(
            {"asset_id": "This equipment already has active maintenance."}
        )
    if asset.status == Asset.Status.UNDER_MAINTENANCE:
        # Checkout assigns each loan ID while holding this asset lock.
        latest_loan = loans.order_by("-pk").first()
        eligible = (
            latest_loan is not None
            and latest_loan.actual_return_date is not None
            and latest_loan.return_condition == Loan.ReturnCondition.DAMAGED
        )
    else:
        eligible = asset.status == Asset.Status.AVAILABLE
    if not eligible:
        raise MaintenanceRuleError(
            {"asset_id": "Only available equipment can enter maintenance."}
        )

    try:
        record = MaintenanceRecord.objects.create(
            asset=asset,
            technician=technician,
            maintenance_type=maintenance_type,
            priority=priority,
            start_date=start_date,
        )
    except IntegrityError as exc:
        constraint_name = getattr(
            getattr(exc.__cause__, "diag", None), "constraint_name", None
        )
        if constraint_name != "maintenance_record_one_open_per_asset":
            raise
        raise MaintenanceRuleError(
            {"asset_id": "This equipment already has active maintenance."}
        ) from exc

    if asset.status != Asset.Status.UNDER_MAINTENANCE:
        asset.status = Asset.Status.UNDER_MAINTENANCE
        asset.save(update_fields=("status",))
    return record
