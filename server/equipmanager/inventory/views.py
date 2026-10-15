from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.db.models.functions import Lower, Trim
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

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

DELETED_FILTER_VALUES = ("false", "true", "all")

@ensure_csrf_cookie
@api_view(["GET"])
def category_list(request):
    categories = Category.objects.filter(is_deleted=False).order_by(
        "name", "category_id"
    )
    return Response(CategorySerializer(categories, many=True).data)


@ensure_csrf_cookie
@api_view(["GET"])
def equipment_type_list(request):
    deleted = request.query_params.get("deleted", "false").lower()

    if deleted not in DELETED_FILTER_VALUES:
        raise ValidationError(
            {"deleted": ['Must be one of: "false", "true", "all".']}
        )

    equipment_types = EquipmentType.objects.filter(
        category__is_deleted=False,
    ).select_related("category")

    if deleted != "all":
        equipment_types = equipment_types.filter(
            is_deleted=(deleted == "true")
        )

    category_id = request.query_params.get("category_id")
    if category_id:
        try:
            category_id = int(category_id)
        except ValueError as exc:
            raise ValidationError(
                {"category_id": "Must be a valid integer."}
            ) from exc

        equipment_types = equipment_types.filter(category_id=category_id)

    equipment_types = equipment_types.order_by("type_id")

    return Response(
        EquipmentTypeLookupSerializer(equipment_types, many=True).data
    )


@method_decorator(ensure_csrf_cookie, name="dispatch")
class AssetListCreateAPIView(generics.ListCreateAPIView):
    pagination_class = AssetPagination

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

        asset_identifier = self.request.query_params.get("asset_identifier", "").strip()
        if asset_identifier:
            exact_match = assets.filter(asset_identifier=asset_identifier).first()
            if exact_match is not None:
                assets = assets.filter(asset_id=exact_match.asset_id)
            else:
                assets = assets.annotate(
                    normalized_asset_identifier=Lower(Trim("asset_identifier"))
                ).filter(
                    normalized_asset_identifier__contains=asset_identifier.lower()
                )
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
            if constraint_name != "inventory_asset_identifier_unique":
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

    def get_queryset(self):
        category = generics.get_object_or_404(
            Category, category_id=self.kwargs["pk"]
        )
        return (
            category.equipment_types.filter(is_deleted=False)
            .select_related("category")
            .order_by("type_id")
        )
