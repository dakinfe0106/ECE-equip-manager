
from django.db.models import CharField, Q, Value
from django.db.models.functions import Concat
from django.utils import timezone
from rest_framework import generics
from rest_framework.pagination import PageNumberPagination

from inventory.models import Asset

from .models import Borrower, Loan
from .permissions import BorrowerListPermissions, LoanReadPermissions
from .serializers import BorrowerListSerializer, LoanListSerializer, LoanQuerySerializer


class BorrowerPagination(PageNumberPagination):
    page_size = 20


class BorrowerList(generics.ListAPIView):
    serializer_class = BorrowerListSerializer
    pagination_class = BorrowerPagination
    permission_classes = (BorrowerListPermissions,)

    def get_queryset(self):
        borrowers = Borrower.objects.filter(is_deleted=False)
        search = self.request.query_params.get("search", "").strip()
        if search:
            borrowers = borrowers.annotate(
                full_name=Concat(
                    "first_name",
                    Value(" "),
                    "last_name",
                    output_field=CharField(),
                )
            ).filter(
                Q(unb_id__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(full_name__icontains=search)
            )
        return borrowers.order_by("borrower_id")


class LoanList(generics.ListAPIView):
    serializer_class = LoanListSerializer
    permission_classes = (LoanReadPermissions,)
    pagination_class = None

    def get_queryset(self):
        # Treat explicit blank filters as invalid, rather than omitted HTML fields.
        query = LoanQuerySerializer(data=self.request.query_params.dict())
        query.is_valid(raise_exception=True)
        params = query.validated_data
        self.today = timezone.localdate()
        loans = Loan.objects.select_related("borrower", "asset", "asset__type")
        status = params.get("status")
        if status == "returned":
            loans = loans.filter(actual_return_date__isnull=False)
        elif status in ("on_loan", "overdue"):
            loans = loans.filter(actual_return_date__isnull=True)
            if status == "overdue":
                loans = loans.filter(expected_return_date__lt=self.today)
        if "expected_return_from" in params:
            loans = loans.filter(expected_return_date__gte=params["expected_return_from"])
        if "expected_return_to" in params:
            loans = loans.filter(expected_return_date__lte=params["expected_return_to"])
        asset_statuses = {
            "available": Asset.Status.AVAILABLE,
            "on_loan": Asset.Status.ON_LOAN,
            "under_maintenance": Asset.Status.UNDER_MAINTENANCE,
            "retired": Asset.Status.RETIRED,
        }
        if "asset_status" in params:
            loans = loans.filter(asset__status=asset_statuses[params["asset_status"]])
        search = params.get("search", "")
        if search:
            loans = loans.alias(
                borrower_full_name=Concat(
                    "borrower__first_name", Value(" "), "borrower__last_name",
                    output_field=CharField(),
                )
            ).filter(
                Q(borrower__first_name__icontains=search)
                | Q(borrower__last_name__icontains=search)
                | Q(borrower_full_name__icontains=search)
                | Q(borrower__unb_id__icontains=search)
                | Q(asset__name__icontains=search)
                | Q(asset__asset_identifier__icontains=search)
            )
        return loans.order_by("loan_id")

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "today": self.today}
