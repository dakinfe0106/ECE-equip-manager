from collections import Counter

from django.utils import timezone
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from inventory.models import Category, EquipmentType
from users.permissions import AnalyticsReadPermissions

from .models import Loan


class LendingFilters(serializers.Serializer):
    category_id = serializers.IntegerField(min_value=1, required=False)
    equipment_type_id = serializers.IntegerField(min_value=1, required=False)
    year = serializers.IntegerField(min_value=1, max_value=9999, required=False)
    report = serializers.ChoiceField(
        choices=("utilization", "borrowing", "borrowers"), default="borrowing"
    )


class AnalyticsOptions(APIView):
    permission_classes = (AnalyticsReadPermissions,)

    def get(self, request):
        # Retain archived lookup choices so historical loans remain filterable.
        years = set(Loan.objects.dates("checkout_date", "year"))
        return Response(
            {
                "categories": list(
                    Category.objects.order_by("name", "pk").values(
                        "category_id", "name", "is_deleted"
                    )
                ),
                "equipment_types": list(
                    EquipmentType.objects.order_by("name", "pk").values(
                        "type_id", "category_id", "name", "is_deleted"
                    )
                ),
                "years": sorted(
                    {value.year for value in years} | {timezone.localdate().year},
                    reverse=True,
                ),
            }
        )


def summarize_loans(loans, today):
    days = sum(
        max(0, ((loan.actual_return_date or today) - loan.checkout_date).days)
        for loan in loans
    )
    late = sum(
        (loan.actual_return_date or today) > loan.expected_return_date for loan in loans
    )
    count = len(loans)
    return {
        "transactions": count,
        "total_loan_days": days,
        "average_duration": round(days / count, 1) if count else 0,
        "overdue_rate": round(100 * late / count, 1) if count else 0,
    }


def analytics_loans(values, today, *, all_years=False):
    year = None if all_years else values.get("year", today.year)
    queryset = Loan.objects.filter(checkout_date__lte=today)
    if year is not None:
        queryset = queryset.filter(checkout_date__year=year)
    if "category_id" in values:
        queryset = queryset.filter(asset__type__category_id=values["category_id"])
    if "equipment_type_id" in values:
        queryset = queryset.filter(asset__type_id=values["equipment_type_id"])
    # History survives soft deletion; no borrower identities enter the response.
    return list(queryset.select_related("asset__type__category")), year


def loan_report(loans, today, report, year):
    if report == "utilization":
        totals = Counter()
        for loan in loans:
            asset_type = loan.asset.type
            key = (asset_type.pk, asset_type.category.name, asset_type.name)
            totals[key] += max(
                0, ((loan.actual_return_date or today) - loan.checkout_date).days
            )
        rows = [
            {"label": f"{category} / {name}", "value": days}
            for (_, category, name), days in sorted(
                totals.items(), key=lambda item: (-item[1], item[0])
            )
        ]
    elif report == "borrowing":
        counts = Counter(loan.checkout_date.month for loan in loans)
        months = (
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        )
        rows = [
            {"label": label, "value": counts[index]}
            for index, label in enumerate(months, 1)
        ]
    else:
        counts = Counter(loan.borrower_id for loan in loans)
        rows = [
            {"label": "1 loan", "value": sum(n == 1 for n in counts.values())},
            {"label": "2–5 loans", "value": sum(2 <= n <= 5 for n in counts.values())},
            {
                "label": "6–10 loans",
                "value": sum(6 <= n <= 10 for n in counts.values()),
            },
            {"label": "11+ loans", "value": sum(n >= 11 for n in counts.values())},
        ]
    return {
        "year": year,
        "as_of": today,
        "rows": rows,
        "summary": summarize_loans(loans, today),
    }


class LendingAnalytics(APIView):
    permission_classes = (AnalyticsReadPermissions,)

    def get(self, request):
        today = timezone.localdate()
        filters = LendingFilters(data=request.query_params)
        filters.is_valid(raise_exception=True)
        values = filters.validated_data
        loans, year = analytics_loans(values, today)
        return Response(loan_report(loans, today, values["report"], year))
