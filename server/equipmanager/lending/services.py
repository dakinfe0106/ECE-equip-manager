from django.db import transaction
from django.utils import timezone

from .models import Borrower, DamageFlag, DamageFlagEditAudit


class DamageFlagRuleError(Exception):
    def __init__(self, field, message):
        self.errors = {field: message}
        super().__init__(message)


def damage_warning_level_for_count(unresolved_count):
    if unresolved_count == 0:
        return "no_warning"
    if unresolved_count == 1:
        return "first_warning"
    if unresolved_count == 2:
        return "final_warning"
    return "ineligible"


def damage_flag_summary(*, borrower):
    unresolved_count = borrower.damage_flags.filter(
        status=DamageFlag.Status.UNRESOLVED,
        reviewed_at__isnull=False,
    ).count()
    return {
        "unresolved_count": unresolved_count,
        "warning_level": damage_warning_level_for_count(unresolved_count),
        "damage_eligible": unresolved_count < 3,
    }


@transaction.atomic
def record_damage_flag(*, borrower_id, technician, data):
    borrower = Borrower.objects.select_for_update().get(
        borrower_id=borrower_id,
        is_deleted=False,
    )
    data = dict(data)
    reviewed = data.pop("reviewed")
    if reviewed is not True:
        raise DamageFlagRuleError("reviewed", "The incident must be reviewed before it can be recorded.")

    flag = DamageFlag.objects.create(
        borrower=borrower,
        reviewed_by=technician,
        reviewed_at=timezone.now(),
        **data,
    )
    return flag, damage_flag_summary(borrower=borrower)


@transaction.atomic
def update_damage_flag(*, borrower_id, damage_flag_id, technician, data):
    borrower = Borrower.objects.select_for_update().get(
        borrower_id=borrower_id,
        is_deleted=False,
    )
    flag = (
        DamageFlag.objects.select_for_update(of=("self",))
        .select_related("asset", "borrower", "reviewed_by", "resolved_by")
        .get(
            damage_flag_id=damage_flag_id,
            borrower=borrower,
        )
    )

    field_names = {
        "asset": "equipment_id",
        "incident_date": "incident_date",
        "reason": "reason",
        "notes": "notes",
    }
    changed_fields = []
    for field, value in data.items():
        if getattr(flag, f"{field}_id", None) == getattr(value, "pk", None) and field == "asset":
            continue
        if field != "asset" and getattr(flag, field) == value:
            continue
        setattr(flag, field, value)
        changed_fields.append(field_names[field])

    if changed_fields:
        flag.save()
        DamageFlagEditAudit.objects.create(
            damage_flag=flag,
            edited_by=technician,
            changed_fields=changed_fields,
        )

    return flag, damage_flag_summary(borrower=borrower)


@transaction.atomic
def resolve_damage_flag(*, borrower_id, damage_flag_id, technician, resolution_reason):
    borrower = Borrower.objects.select_for_update().get(
        borrower_id=borrower_id,
        is_deleted=False,
    )
    flag = (
        DamageFlag.objects.select_for_update(of=("self",))
        .select_related("asset", "borrower", "reviewed_by", "resolved_by")
        .get(
            damage_flag_id=damage_flag_id,
            borrower=borrower,
        )
    )
    if flag.status != DamageFlag.Status.UNRESOLVED:
        raise DamageFlagRuleError("detail", "This damage flag has already been resolved.")

    flag.status = DamageFlag.Status.RESOLVED
    flag.resolved_by = technician
    flag.resolved_at = timezone.now()
    flag.resolution_reason = resolution_reason
    flag.save()
    return flag, damage_flag_summary(borrower=borrower)
