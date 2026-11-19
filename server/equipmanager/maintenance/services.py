from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone

from inventory.models import Asset

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
    if asset.status == Asset.Status.ON_LOAN:
        raise MaintenanceRuleError(
            {"asset_id": "Equipment currently on loan must be returned before maintenance."}
        )
    if asset.status != Asset.Status.AVAILABLE:
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

    asset.status = Asset.Status.UNDER_MAINTENANCE
    asset.save(update_fields=("status",))
    return record


@transaction.atomic
def update_maintenance(
    *,
    record_id: int,
    maintenance_type: str | None = None,
    priority: str | None = None,
    technician_id: int | None = None,
) -> MaintenanceRecord:
    record = MaintenanceRecord.objects.select_for_update().get(pk=record_id)

    if record.end_date is not None:
        raise MaintenanceRuleError(
            {"maintenance_id": "Completed maintenance records cannot be edited."}
        )

    changed_fields = []
    if maintenance_type is not None:
        record.maintenance_type = maintenance_type
        changed_fields.append("maintenance_type")
    if priority is not None:
        record.priority = priority
        changed_fields.append("priority")
    if technician_id is not None:
        record.technician = User.objects.get(
            pk=technician_id,
            is_active=True,
            role=User.Role.TECHNICIAN,
        )
        changed_fields.append("technician")

    if changed_fields:
        record.save(update_fields=changed_fields)
    return record


@transaction.atomic
def complete_maintenance(
    *,
    record_id: int,
    end_date,
    outcome: str = Asset.Status.AVAILABLE,
) -> MaintenanceRecord:
    if outcome not in (Asset.Status.AVAILABLE, Asset.Status.RETIRED):
        raise MaintenanceRuleError(
            {"outcome": "Outcome must be Available or Retired."}
        )

    asset_id = MaintenanceRecord.objects.values_list("asset_id", flat=True).get(
        pk=record_id
    )
    asset = Asset.objects.select_for_update(of=("self",)).get(pk=asset_id)
    record = MaintenanceRecord.objects.select_for_update().get(pk=record_id)

    if record.end_date is not None:
        raise MaintenanceRuleError(
            {"end_date": "This maintenance record has already been completed."}
        )
    if end_date < record.start_date:
        raise MaintenanceRuleError(
            {"end_date": "Completion date cannot precede the maintenance start date."}
        )
    if end_date > timezone.localdate():
        raise MaintenanceRuleError(
            {"end_date": "Completion date cannot be in the future."}
        )

    record.end_date = end_date
    record.save(update_fields=("end_date",))
    asset.status = outcome
    asset.save(update_fields=("status",))
    return record
