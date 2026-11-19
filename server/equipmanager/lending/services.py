from django.db import IntegrityError, transaction
from django.utils import timezone

from inventory.models import Asset

from .models import Borrower, DamageFlag, DamageFlagEditAudit, Loan


class CheckoutRuleError(Exception):
    def __init__(self, field, message):
        self.errors = {field: message}
        super().__init__(message)


@transaction.atomic
def checkout_asset(*, asset_id, borrower_id, expected_return_date):
    # Damage-flag services lock this same row before changing standing.
    # Always take the borrower lock before the asset lock.
    borrower = Borrower.objects.select_for_update().get(pk=borrower_id)
    if borrower.is_deleted:
        raise CheckoutRuleError("borrower_id", "This borrower is not active.")
    asset = (
        Asset.objects.select_for_update(of=("self",))
        .select_related("type__category")
        .get(pk=asset_id)
    )
    if (
        asset.is_deleted
        or asset.type.is_deleted
        or asset.type.category.is_deleted
        or asset.status != Asset.Status.AVAILABLE
    ):
        raise CheckoutRuleError("asset_id", "This asset is not available for checkout.")
    if Loan.objects.filter(asset=asset, actual_return_date__isnull=True).exists():
        raise CheckoutRuleError("asset_id", "This asset already has an open loan.")

    today = timezone.localdate()
    if expected_return_date < today:
        raise CheckoutRuleError(
            "expected_return_date", "Must be on or after the checkout date."
        )
    if Loan.objects.filter(
        borrower=borrower, actual_return_date__isnull=True,
        expected_return_date__lt=today,
    ).exists():
        raise CheckoutRuleError("borrower_id", "This borrower has overdue equipment.")
    if not damage_flag_summary(borrower=borrower)["damage_eligible"]:
        raise CheckoutRuleError(
            "borrower_id", "This borrower has three or more unresolved reviewed damage flags."
        )

    # A savepoint keeps the outer transaction usable when identifying a race.
    try:
        with transaction.atomic():
            loan = Loan.objects.create(
                asset=asset, borrower=borrower, checkout_date=today,
                expected_return_date=expected_return_date,
            )
    except IntegrityError as error:
        constraint = getattr(getattr(error.__cause__, "diag", None), "constraint_name", None)
        if constraint != "lending_loan_one_open_loan_per_asset":
            raise
        raise CheckoutRuleError(
            "asset_id", "This asset already has an open loan."
        ) from error
    asset.status = Asset.Status.ON_LOAN
    asset.save(update_fields=["status"])
    return loan


class LoanReturnRuleError(Exception):
    def __init__(self, field, message):
        self.errors = {field: message}
        super().__init__(message)


@transaction.atomic
def return_loan(*, loan_id, actual_return_date, return_condition):
    loan = Loan.objects.select_for_update().get(pk=loan_id)
    if loan.actual_return_date is not None:
        raise LoanReturnRuleError("actual_return_date", "This loan has already been returned.")
    if actual_return_date < loan.checkout_date:
        raise LoanReturnRuleError("actual_return_date", "Must be on or after the checkout date.")
    if return_condition not in Loan.ReturnCondition.values:
        raise LoanReturnRuleError("return_condition", "Select a valid return condition.")

    asset = Asset.objects.select_for_update().get(pk=loan.asset_id)
    loan.actual_return_date = actual_return_date
    loan.return_condition = return_condition
    loan.save(update_fields=["actual_return_date", "return_condition"])
    asset.status = (
        Asset.Status.UNDER_MAINTENANCE
        if return_condition == Loan.ReturnCondition.DAMAGED
        else Asset.Status.AVAILABLE
    )
    asset.save(update_fields=["status"])
    loan.asset = asset
    return loan


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
