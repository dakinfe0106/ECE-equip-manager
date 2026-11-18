from django.db.models import CharField, Count, Q, Value
from django.db.models.functions import Concat
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from inventory.models import Asset

from .models import Borrower, DamageFlag, Loan
from .permissions import BorrowerListPermissions, LoanReadPermissions
from .serializers import (
    BorrowerCreateSerializer,
    BorrowerDetailSerializer,
    BorrowerListSerializer,
    BorrowerUpdateSerializer,
    DamageFlagResolutionSerializer,
    DamageFlagSerializer,
    DamageFlagUpdateSerializer,
    DamageFlagWriteSerializer,
    LoanCheckoutSerializer,
    LoanListSerializer,
    LoanQuerySerializer,
    LoanReturnSerializer,
)
from .services import (
    CheckoutRuleError,
    DamageFlagRuleError,
    LoanReturnRuleError,
    checkout_asset,
    damage_flag_summary,
    record_damage_flag,
    resolve_damage_flag,
    return_loan,
    update_damage_flag,
)


class BorrowerPagination(PageNumberPagination):
    page_size = 20


class BorrowerList(generics.ListCreateAPIView):
    serializer_class = BorrowerListSerializer
    pagination_class = BorrowerPagination
    permission_classes = (BorrowerListPermissions,)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return BorrowerCreateSerializer
        return BorrowerListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        borrower = serializer.save()
        return Response(
            BorrowerListSerializer(
                borrower, context=self.get_serializer_context()
            ).data,
            status=status.HTTP_201_CREATED,
        )

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


class LoanList(generics.ListCreateAPIView):
    serializer_class = LoanListSerializer
    permission_classes = (LoanReadPermissions,)
    pagination_class = None

    def get_serializer_class(self):
        if self.request.method == "POST":
            return LoanCheckoutSerializer
        return LoanListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            loan = checkout_asset(**serializer.validated_data)
        except Asset.DoesNotExist as error:
            raise NotFound("Asset not found.") from error
        except Borrower.DoesNotExist as error:
            raise NotFound("Borrower not found.") from error
        except CheckoutRuleError as error:
            raise ValidationError(error.errors) from error
        self.today = loan.checkout_date
        return Response(
            LoanListSerializer(loan, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )

    def get_queryset(self):
        # Treat explicit blank filters as invalid, rather than omitted HTML fields.
        query = LoanQuerySerializer(data=self.request.query_params.dict())
        query.is_valid(raise_exception=True)
        params = query.validated_data
        self.today = timezone.localdate()
        loans = Loan.objects.select_related("borrower", "asset", "asset__type")
        status_param = params.get("status")
        if status_param == "returned":
            loans = loans.filter(actual_return_date__isnull=False)
        elif status_param in ("on_loan", "overdue"):
            loans = loans.filter(actual_return_date__isnull=True)
            if status_param == "overdue":
                loans = loans.filter(expected_return_date__lt=self.today)
        if "expected_return_from" in params:
            loans = loans.filter(
                expected_return_date__gte=params["expected_return_from"]
            )
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
                    "borrower__first_name",
                    Value(" "),
                    "borrower__last_name",
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
        context = super().get_serializer_context()
        if hasattr(self, "today"):
            context["today"] = self.today
        return context


class LoanReturn(APIView):
    permission_classes = (LoanReadPermissions,)

    def post(self, request, pk):
        serializer = LoanReturnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            loan = return_loan(loan_id=pk, **serializer.validated_data)
        except Loan.DoesNotExist as error:
            raise NotFound("Loan not found.") from error
        except LoanReturnRuleError as error:
            raise ValidationError(error.errors) from error
        return Response(
            {
                "loan": LoanListSerializer(loan, context={"today": timezone.localdate()}).data,
                "maintenance_required": loan.return_condition == Loan.ReturnCondition.DAMAGED,
            },
            status=status.HTTP_200_OK,
        )


class BorrowerDetail(generics.RetrieveUpdateAPIView):
    permission_classes = (BorrowerListPermissions,)
    queryset = Borrower.objects.filter(is_deleted=False).annotate(
        unresolved_damage_flag_count=Count(
            "damage_flags",
            filter=Q(
                damage_flags__status=DamageFlag.Status.UNRESOLVED,
                damage_flags__reviewed_at__isnull=False,
            ),
        )
    )

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return BorrowerUpdateSerializer
        return BorrowerDetailSerializer

    def update(self, request, *args, **kwargs):
        super().update(request, *args, **kwargs)
        instance = self.get_object()
        serializer = BorrowerDetailSerializer(
            instance, context=self.get_serializer_context()
        )
        return Response(serializer.data)


class BorrowerDamageFlagListCreate(APIView):
    permission_classes = (BorrowerListPermissions,)

    def get(self, request, pk):
        borrower = get_object_or_404(Borrower, borrower_id=pk, is_deleted=False)
        flags = list(
            DamageFlag.objects.filter(borrower=borrower)
            .select_related("borrower", "asset", "reviewed_by", "resolved_by")
            .order_by("-incident_date", "-created_at", "-damage_flag_id")
        )
        return Response(
            {
                "count": len(flags),
                "results": DamageFlagSerializer(flags, many=True).data,
                "summary": damage_flag_summary(borrower=borrower),
            }
        )

    def post(self, request, pk):
        get_object_or_404(Borrower, borrower_id=pk, is_deleted=False)
        serializer = DamageFlagWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            flag, summary = record_damage_flag(
                borrower_id=pk,
                technician=request.user,
                data=dict(serializer.validated_data),
            )
        except Borrower.DoesNotExist as error:
            raise NotFound("Borrower not found.") from error
        except DamageFlagRuleError as error:
            raise ValidationError(error.errors) from error

        flag = DamageFlag.objects.select_related(
            "borrower", "asset", "reviewed_by", "resolved_by"
        ).get(pk=flag.pk)
        return Response(
            {
                "damage_flag": DamageFlagSerializer(flag).data,
                "summary": summary,
            },
            status=status.HTTP_201_CREATED,
        )


class BorrowerDamageFlagDetail(APIView):
    permission_classes = (BorrowerListPermissions,)

    def patch(self, request, pk, damage_flag_id):
        borrower = get_object_or_404(Borrower, borrower_id=pk, is_deleted=False)
        existing_flag = get_object_or_404(
            DamageFlag.objects.filter(borrower=borrower),
            damage_flag_id=damage_flag_id,
        )
        serializer = DamageFlagUpdateSerializer(
            data=request.data,
            partial=True,
            context={"current_asset_id": existing_flag.asset_id},
        )
        serializer.is_valid(raise_exception=True)
        try:
            flag, summary = update_damage_flag(
                borrower_id=pk,
                damage_flag_id=damage_flag_id,
                technician=request.user,
                data=serializer.validated_data,
            )
        except (Borrower.DoesNotExist, DamageFlag.DoesNotExist) as error:
            raise NotFound("Damage flag not found for this borrower.") from error
        except DamageFlagRuleError as error:
            raise ValidationError(error.errors) from error

        return Response(
            {
                "damage_flag": DamageFlagSerializer(flag).data,
                "summary": summary,
            }
        )

    def post(self, request, pk, damage_flag_id):
        borrower = get_object_or_404(Borrower, borrower_id=pk, is_deleted=False)
        get_object_or_404(
            DamageFlag.objects.filter(borrower=borrower),
            damage_flag_id=damage_flag_id,
        )
        serializer = DamageFlagResolutionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            flag, summary = resolve_damage_flag(
                borrower_id=pk,
                damage_flag_id=damage_flag_id,
                technician=request.user,
                resolution_reason=serializer.validated_data["resolution_reason"],
            )
        except (Borrower.DoesNotExist, DamageFlag.DoesNotExist) as error:
            raise NotFound("Damage flag not found for this borrower.") from error
        except DamageFlagRuleError as error:
            raise ValidationError(error.errors) from error

        return Response(
            {
                "damage_flag": DamageFlagSerializer(flag).data,
                "summary": summary,
            }
        )
    