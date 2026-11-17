from django.db.models import (
    Avg,
    CharField,
    Count,
    DurationField,
    ExpressionWrapper,
    F,
    Q,
    Sum,
    Value,
)
from django.db.models.functions import Coalesce, Concat
from django.utils import timezone

from inventory.models import Asset

from .models import Borrower, Loan


def available_loan_years():
    current_year = timezone.localdate().year
    return sorted(
        {year.year for year in Loan.objects.dates("checkout_date", "year")} | {current_year},
        reverse=True,
    )


def borrowing_summary(*, year=None, category_id=None, equipment_type_id=None):
    filters = _loan_filters(
        year=year,
        category_id=category_id,
        equipment_type_id=equipment_type_id,
    )
    today = timezone.localdate()
    return Loan.objects.filter(filters).aggregate(
        total_loans=Count("loan_id"),
        completed_loans=Count(
            "loan_id", filter=Q(actual_return_date__isnull=False)
        ),
        active_loans=Count("loan_id", filter=Q(actual_return_date__isnull=True)),
        overdue_loans=Count(
            "loan_id",
            filter=Q(
                actual_return_date__isnull=True,
                expected_return_date__lt=today,
            ),
        ),
        intact_returns=Count(
            "loan_id",
            filter=Q(return_condition=Loan.ReturnCondition.INTACT),
        ),
        damaged_returns=Count(
            "loan_id",
            filter=Q(return_condition=Loan.ReturnCondition.DAMAGED),
        ),
    )


def utilization_report(*, year=None, category_id=None, equipment_type_id=None):
    today = timezone.localdate()
    loan_filters = _loan_filters(
        "loan__",
        year=year,
        category_id=category_id,
        equipment_type_id=equipment_type_id,
    )
    duration = ExpressionWrapper(
        Coalesce(
            F("loan__actual_return_date"),
            Value(today),
        )
        - F("loan__checkout_date"),
        output_field=DurationField(),
    )
    assets_with_history = Loan.objects.values("asset_id")
    records = (
        Asset.objects.filter(
            Q(
                is_deleted=False,
                type__is_deleted=False,
                type__category__is_deleted=False,
            )
            | Q(asset_id__in=assets_with_history)
        )
        .annotate(
            loan_count=Count("loan", filter=loan_filters),
            total_loan_duration=Sum(duration, filter=loan_filters),
            average_loan_duration=Avg(duration, filter=loan_filters),
        )
        .select_related("type__category")
        .order_by("-loan_count", "asset_identifier", "asset_id")
    )

    return [
        {
            "asset_id": asset.asset_id,
            "asset_identifier": asset.asset_identifier,
            "asset_name": asset.name,
            "category_id": asset.type.category_id,
            "category_name": asset.type.category.name,
            "equipment_type_id": asset.type_id,
            "equipment_type_name": asset.type.name,
            "loan_count": asset.loan_count,
            "total_loan_days": _duration_days(asset.total_loan_duration),
            "average_loan_days": _duration_days(
                asset.average_loan_duration, rounded=True
            ),
        }
        for asset in records
    ]


def borrower_activity(
    *, year=None, category_id=None, equipment_type_id=None, search=""
):
    today = timezone.localdate()
    loan_filters = _loan_filters(
        "loan__",
        year=year,
        category_id=category_id,
        equipment_type_id=equipment_type_id,
    )
    borrowers = Borrower.objects.annotate(
        full_name=Concat(
            "first_name",
            Value(" "),
            "last_name",
            output_field=CharField(),
        ),
        total_loans=Count("loan", filter=loan_filters),
        completed_loans=Count(
            "loan",
            filter=loan_filters & Q(loan__actual_return_date__isnull=False),
        ),
        active_loans=Count(
            "loan",
            filter=loan_filters & Q(loan__actual_return_date__isnull=True),
        ),
        overdue_loans=Count(
            "loan",
            filter=loan_filters
            & Q(
                loan__actual_return_date__isnull=True,
                loan__expected_return_date__lt=today,
            ),
        ),
        damaged_returns=Count(
            "loan",
            filter=loan_filters
            & Q(loan__return_condition=Loan.ReturnCondition.DAMAGED),
        ),
    )
    if search:
        search_filter = (
            Q(unb_id__icontains=search)
            | Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
            | Q(full_name__icontains=search)
        )
        if search.isdecimal():
            search_filter |= Q(borrower_id=int(search))
        borrowers = borrowers.filter(search_filter)

    return [
        {
            "borrower_id": borrower.borrower_id,
            "unb_id": borrower.unb_id,
            "first_name": borrower.first_name,
            "last_name": borrower.last_name,
            "total_loans": borrower.total_loans,
            "completed_loans": borrower.completed_loans,
            "active_loans": borrower.active_loans,
            "overdue_loans": borrower.overdue_loans,
            "damaged_returns": borrower.damaged_returns,
        }
        for borrower in borrowers.order_by("-total_loans", "borrower_id")
    ]


def _loan_filters(prefix="", *, year=None, category_id=None, equipment_type_id=None):
    filters = Q()
    if year is not None:
        filters &= Q(**{f"{prefix}checkout_date__year": year})
    if category_id is not None:
        filters &= Q(**{f"{prefix}asset__type__category_id": category_id})
    if equipment_type_id is not None:
        filters &= Q(**{f"{prefix}asset__type_id": equipment_type_id})
    return filters


def _duration_days(duration, *, rounded=False):
    if duration is None:
        return 0 if not rounded else None
    days = duration.total_seconds() / 86400
    return round(days, 2) if rounded else int(days)
