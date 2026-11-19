from io import BytesIO

from django.http import HttpResponse
from django.utils import timezone
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from rest_framework import serializers
from rest_framework.views import APIView

from inventory.analytics import AvailabilityFilters, availability_rows
from inventory.models import Category, EquipmentType
from users.permissions import AnalyticsReadPermissions

from .analytics import analytics_loans, loan_report, summarize_loans

REPORTS = {
    "availability": "Equipment Availability",
    "utilization": "Equipment Utilization",
    "borrowing": "Borrowing Activity",
    "borrowers": "Borrower Activity",
}
EXCEL_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


class ExportFilters(AvailabilityFilters):
    reports = serializers.ListField(
        child=serializers.ChoiceField(choices=tuple(REPORTS)),
        allow_empty=False,
        max_length=4,
    )
    scope = serializers.ChoiceField(choices=("current", "all"), default="current")
    year = serializers.IntegerField(min_value=1, max_value=9999, required=False)

    def validate_reports(self, reports):
        if len(set(reports)) != len(reports):
            raise serializers.ValidationError("Select each report only once.")
        return reports


def append_literals(sheet, values):
    sheet.append(values)
    # User-supplied names must remain text, including strings starting with '='.
    for cell in sheet[sheet.max_row]:
        if isinstance(cell.value, str):
            cell.data_type = "s"


def style_sheet(sheet, *, data=False):
    for cell in sheet[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="2F6FED")
    sheet.freeze_panes = "A2"
    if data:
        sheet.auto_filter.ref = sheet.dimensions
    sheet.column_dimensions["A"].width = 38
    for column in list(sheet.columns)[1:]:
        sheet.column_dimensions[column[0].column_letter].width = 24


def filter_description(model, pk):
    if pk is None:
        return "All"
    name = model.objects.filter(pk=pk).values_list("name", flat=True).first()
    return f"{name or 'Unknown selection'} (ID {pk})"


def export_workbook(values, generated_at):
    today = generated_at.date()
    all_data = values["scope"] == "all"
    filters = (
        {}
        if all_data
        else {
            key: values[key]
            for key in ("category_id", "equipment_type_id", "year")
            if key in values
        }
    )
    loans, year = analytics_loans(filters, today, all_years=all_data)
    summary = summarize_loans(loans, today)
    workbook = Workbook()
    details = workbook.active
    details.title = "Export details"
    metadata = [
        ["Setting or metric", "Value"],
        ["Generated at", generated_at.isoformat()],
        ["Business date", today.isoformat()],
        ["Timezone", timezone.get_current_timezone_name()],
        ["Scope", "All data" if all_data else "Current applied filters"],
        ["Selected reports", ", ".join(REPORTS[key] for key in values["reports"])],
        ["Category", filter_description(Category, filters.get("category_id"))],
        [
            "Equipment type",
            filter_description(EquipmentType, filters.get("equipment_type_id")),
        ],
        ["Checkout year", "All years" if year is None else year],
        ["Availability", "Current inventory snapshot; checkout year does not apply."],
        ["Transactions", summary["transactions"]],
        ["Total loan days", summary["total_loan_days"]],
        ["Average duration (days)", summary["average_duration"]],
        ["Overdue rate (%)", summary["overdue_rate"]],
        [
            "Loan days definition",
            "Elapsed calendar days from checkout to return, or business date for open loans. Same-day loans count as zero days.",
        ],
        [
            "Average definition",
            "Total loan days divided by transactions, including open loans.",
        ],
        [
            "Overdue definition",
            "Percentage of loans returned late or currently overdue. Due today is not overdue.",
        ],
        [
            "Year definition",
            "Loans are selected by checkout year. Their loan days can extend beyond that year.",
        ],
        [
            "History",
            "Historical loans include archived related records. Future checkouts are excluded.",
        ],
        [
            "Borrower privacy",
            "Only borrower frequency totals are included; no borrower names or identifiers.",
        ],
    ]
    for row in metadata:
        append_literals(details, row)
    details.column_dimensions["B"].width = 90

    for report in values["reports"]:
        sheet = workbook.create_sheet(REPORTS[report])
        if report == "availability":
            rows = availability_rows(filters)
            append_literals(
                sheet,
                [
                    "Equipment type",
                    "Available",
                    "On loan",
                    "Under maintenance",
                    "Retired",
                    "Total",
                ],
            )
            for row in rows:
                append_literals(
                    sheet,
                    [
                        row[key]
                        for key in (
                            "label",
                            "available",
                            "on_loan",
                            "under_maintenance",
                            "retired",
                            "total",
                        )
                    ],
                )
        else:
            result = loan_report(loans, today, report, year)
            rows = result["rows"]
            label = {
                "utilization": "Equipment type",
                "borrowing": "Month",
                "borrowers": "Loans per borrower",
            }[report]
            unit = {
                "utilization": "Loan days",
                "borrowing": "Checkouts",
                "borrowers": "Borrowers",
            }[report]
            append_literals(sheet, [label, unit])
            for row in rows:
                append_literals(sheet, [row["label"], row["value"]])
        if not rows or (report != "availability" and not loans):
            append_literals(details, [REPORTS[report], "No data matches this scope."])
        style_sheet(sheet, data=True)
    style_sheet(details)
    details.column_dimensions["B"].width = 90
    for row in details.iter_rows(min_row=2):
        row[1].alignment = Alignment(wrap_text=True, vertical="top")
        if len(str(row[1].value)) > 90:
            details.row_dimensions[row[1].row].height = 42
    buffer = BytesIO()
    workbook.save(buffer)
    workbook.close()
    return buffer.getvalue()


class AnalyticsExport(APIView):
    permission_classes = (AnalyticsReadPermissions,)

    def get(self, request):
        filters = ExportFilters(data=request.query_params)
        filters.is_valid(raise_exception=True)
        generated_at = timezone.localtime()
        response = HttpResponse(
            export_workbook(filters.validated_data, generated_at),
            content_type=EXCEL_CONTENT_TYPE,
        )
        response["Content-Disposition"] = (
            f'attachment; filename="ems-analytics-{generated_at.date()}.xlsx"'
        )
        response["Cache-Control"] = "no-store"
        return response
