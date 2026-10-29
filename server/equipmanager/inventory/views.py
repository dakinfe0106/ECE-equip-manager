from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import InventoryRolePermissions

from .models import Asset, Category, EquipmentType
from .serializers import (
    AssetCreateSerializer,
    AssetSerializer,
    CategorySerializer,
    CategorySummarySerializer,
    EquipmentTypeLookupSerializer,
    EquipmentTypeSerializer,
)


class AssetPagination(PageNumberPagination):
    page_size = 20


class Dashboard(APIView):
    """Issue #46: current counts of eligible, non-retired assets."""

    permission_classes = (InventoryRolePermissions,)
    queryset = Asset.objects.all()

    def get(self, request):
        counts = Asset.objects.filter(
            is_deleted=False,
            type__is_deleted=False,
            type__category__is_deleted=False,
            status__in=(
                Asset.Status.AVAILABLE,
                Asset.Status.ON_LOAN,
                Asset.Status.UNDER_MAINTENANCE,
            ),
        ).exclude(status=Asset.Status.RETIRED).aggregate(
            total_assets=Count("pk"),
            available_assets=Count("pk", filter=Q(status=Asset.Status.AVAILABLE)),
            on_loan_assets=Count("pk", filter=Q(status=Asset.Status.ON_LOAN)),
            under_maintenance_assets=Count(
                "pk", filter=Q(status=Asset.Status.UNDER_MAINTENANCE)
            ),
        )
        return Response(counts)


DELETED_FILTER_VALUES = ("false", "true", "all")

@method_decorator(ensure_csrf_cookie, name="dispatch")
class CategoryLookupList(generics.ListAPIView):
    queryset = Category.objects.filter(is_deleted=False).order_by(
        "name", "category_id"
    )
    serializer_class = CategorySerializer
    permission_classes = (InventoryRolePermissions,)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class EquipmentTypeLookupList(generics.ListAPIView):
    queryset = EquipmentType.objects.all()
    serializer_class = EquipmentTypeLookupSerializer
    permission_classes = (InventoryRolePermissions,)

    def get_queryset(self):
        deleted = self.request.query_params.get("deleted", "false").lower()

        if deleted not in DELETED_FILTER_VALUES:
            raise ValidationError(
                {"deleted": ['Must be one of: "false", "true", "all".']}
            )

        equipment_types = EquipmentType.objects.filter(
            category__is_deleted=False,
        )

        if deleted != "all":
            equipment_types = equipment_types.filter(
                is_deleted=(deleted == "true")
            )

        category_id = self.request.query_params.get("category_id")
        if category_id:
            try:
                category_id = int(category_id)
            except ValueError as exc:
                raise ValidationError(
                    {"category_id": "Must be a valid integer."}
                ) from exc

            equipment_types = equipment_types.filter(category_id=category_id)

        return equipment_types.select_related("category").order_by("type_id")


@method_decorator(ensure_csrf_cookie, name="dispatch")
class AssetListCreateAPIView(generics.ListCreateAPIView):
    queryset = Asset.objects.all()
    pagination_class = AssetPagination
    permission_classes = (InventoryRolePermissions,)

    def get_queryset(self):
        assets = (
            Asset.objects.filter(
                is_deleted=False,
                type__is_deleted=False,
                type__category__is_deleted=False,
            )
            .select_related("type__category")
            .order_by("asset_id")
        )

        search = self.request.query_params.get(
            "search",
            self.request.query_params.get("asset_identifier", ""),
        ).strip()
        if search:
            assets = assets.filter(
                Q(asset_identifier__icontains=search) | Q(name__icontains=search)
            )

        category_id = self.request.query_params.get("category_id", "").strip()
        if category_id:
            try:
                category_id = int(category_id)
            except ValueError as exc:
                raise ValidationError(
                    {"category_id": "Must be a valid category ID."}
                ) from exc
            assets = assets.filter(type__category_id=category_id)

        equipment_type_id = self.request.query_params.get(
            "equipment_type_id", ""
        ).strip()
        if equipment_type_id:
            try:
                equipment_type_id = int(equipment_type_id)
            except ValueError as exc:
                raise ValidationError(
                    {"equipment_type_id": "Must be a valid equipment type ID."}
                ) from exc
            assets = assets.filter(type_id=equipment_type_id)
        return assets

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AssetCreateSerializer
        return AssetSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                asset = serializer.save()
        except IntegrityError as exc:
            constraint_name = getattr(
                getattr(exc.__cause__, "diag", None), "constraint_name", None
            )
            if constraint_name != "inventory_asset_identifier_ci_unique":
                raise
            raise ValidationError(
                {"asset_identifier": "An asset with this Asset ID already exists."}
            ) from exc

        response_serializer = AssetSerializer(
            asset,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class AssetDetail(generics.RetrieveUpdateAPIView):
    queryset = (
        Asset.objects.filter(
            is_deleted=False,
            type__is_deleted=False,
            type__category__is_deleted=False,
        )
        .select_related("type__category")
    )
    serializer_class = AssetSerializer
    permission_classes = (InventoryRolePermissions,)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if "status" in request.data:
            raise ValidationError(
                {"status": "Asset status must be changed through its dedicated workflow."}
            )
        requested_identifier = request.data.get("asset_identifier")
        if (
            requested_identifier is not None
            and requested_identifier != instance.asset_identifier
        ):
            raise ValidationError(
                {"asset_identifier": "Asset ID cannot be changed after creation."}
            )
        return super().update(request, *args, **kwargs)



class CategoryList(generics.ListAPIView):
    """List categories for the Categories screen, sorted by ID (lowest first).

    Query parameters:
    - deleted: "false" (default) lists active categories, "true" lists soft-deleted
      categories, "all" lists both.
    - search: case-insensitive match on part of the name.
    """

    serializer_class = CategorySummarySerializer
    permission_classes = (InventoryRolePermissions,)
    queryset = Category.objects.all()

    def get_queryset(self):
        queryset = Category.objects.annotate(
            equipment_type_count=Count(
                "equipment_types",
                filter=Q(equipment_types__is_deleted=False),
            ),
        )

        deleted = self.request.query_params.get("deleted", "false").lower()
        if deleted not in DELETED_FILTER_VALUES:
            raise ValidationError(
                {"deleted": ['Must be one of: "false", "true", "all".']}
            )
        if deleted != "all":
            queryset = queryset.filter(is_deleted=(deleted == "true"))

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset.order_by("category_id")


class CategoryEquipmentTypeList(generics.ListAPIView):
    """Active equipment types that belong to one category, sorted by ID (lowest first)."""

    serializer_class = EquipmentTypeSerializer
    permission_classes = (InventoryRolePermissions,)
    queryset = EquipmentType.objects.all()

    def get_queryset(self):
        category = generics.get_object_or_404(
            Category, category_id=self.kwargs["pk"]
        )
        return (
            category.equipment_types.filter(is_deleted=False)
            .select_related("category")
            .order_by("type_id")
        )
