
from django.db.models import Count, Q
from django.db.models.functions import Lower, Trim
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination

from .models import Asset, Category
from .serializers import (
    AssetSerializer,
    CategorySummarySerializer,
    EquipmentTypeSerializer,
)


class AssetPagination(PageNumberPagination):
    page_size = 20


@ensure_csrf_cookie
@api_view(["GET"])
def asset_list(request):
    assets = (
        Asset.objects.filter(
            is_deleted=False,
            equipment_type__is_deleted=False,
            equipment_type__category__is_deleted=False,
        )
        .select_related("equipment_type__category")
        .order_by("asset_id")
    )

    asset_identifier = request.query_params.get("asset_identifier", "").strip()
    if asset_identifier:
        assets = assets.annotate(
            normalized_asset_identifier=Lower(Trim("asset_identifier"))
        ).filter(normalized_asset_identifier__contains=asset_identifier.lower())

    paginator = AssetPagination()
    page = paginator.paginate_queryset(assets, request)
    serializer = AssetSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


class AssetDetailAPIView(generics.RetrieveUpdateAPIView):
    queryset = (
        Asset.objects.filter(
            is_deleted=False,
            equipment_type__is_deleted=False,
            equipment_type__category__is_deleted=False,
        )
        .select_related("equipment_type__category")
    )
    serializer_class = AssetSerializer
    lookup_field = "asset_id"

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


DELETED_FILTER_VALUES = ("false", "true", "all")


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
