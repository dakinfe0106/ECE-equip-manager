from django.utils import timezone
from rest_framework.views import APIView

from equipmanager.excel import excel_response
from users.permissions import StaffRolePermissions

from .models import Loan

LENDING_HEADERS = (
    "Loan ID",
    "Asset ID",
    "Equipment Name",
    "Borrower UNB ID",
    "Borrower Name",
    "Checkout Date",
    "Expected Return Date",
    "Actual Return Date",
    "Return Condition",
    "Loan Status",
)


def loan_status(loan, today):
    if loan.actual_return_date is not None:
        return "Completed"
    if loan.expected_return_date < today:
        return "Overdue"
    return "Active"


def lending_rows(today):
    # Lending history includes loans whose asset or borrower is archived.
    loans = Loan.objects.select_related("asset", "borrower").order_by(
        "-checkout_date", "-loan_id"
    )
    for loan in loans:
        borrower = loan.borrower
        yield (
            loan.loan_id,
            loan.asset.asset_identifier,
            loan.asset.name,
            borrower.unb_id,
            f"{borrower.first_name} {borrower.last_name}".strip(),
            loan.checkout_date,
            loan.expected_return_date,
            loan.actual_return_date,
            loan.return_condition,
            loan_status(loan, today),
        )


class LendingRecordsExport(APIView):
    permission_classes = (StaffRolePermissions,)

    def get(self, request):
        today = timezone.localdate()
        response = excel_response(
            filename=f"ems-lending-records-{today}.xlsx",
            sheet_title="Lending Records",
            headers=LENDING_HEADERS,
            rows=lending_rows(today),
        )
        response["Cache-Control"] = "no-store"
        return response
