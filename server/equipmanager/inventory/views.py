from rest_framework import generics

from .models import EquipmentType
from .serializers import EquipmentTypeSerializer


class EquipmentTypeList(generics.ListAPIView):
    serializer_class = EquipmentTypeSerializer

    def get_queryset(self):
        return EquipmentType.objects.filter(
            is_deleted=False,
            category__is_deleted=False,
        ).select_related("category")

from django.db import IntegrityError, transaction
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
    EquipmentTypeLookupSerializer,
)


class AssetPagination(PageNumberPagination):
    page_size = 20


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
    equipment_types = EquipmentType.objects.filter(
        is_deleted=False,
        category__is_deleted=False,
    ).select_related("category").order_by(
        "name", "type_id"
    )
    category_id = request.query_params.get("category_id")
    if category_id:
        try:
            category_id = int(category_id)
        except ValueError as exc:
            raise ValidationError(
                {"category_id": "Must be a valid category ID."}
            ) from exc
        equipment_types = equipment_types.filter(category_id=category_id)
    return Response(EquipmentTypeLookupSerializer(equipment_types, many=True).data)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class AssetListCreateAPIView(generics.ListCreateAPIView):
    pagination_class = AssetPagination

    def get_queryset(self):
        assets = (
            Asset.objects.filter(
                is_deleted=False,
                equipment_type__is_deleted=False,
                equipment_type__category__is_deleted=False,
            )
            .select_related("equipment_type__category")
            .order_by("asset_id")
        )

        asset_identifier = self.request.query_params.get("asset_identifier", "").strip()
        if asset_identifier:
            assets = assets.annotate(
                normalized_asset_identifier=Lower(Trim("asset_identifier"))
            ).filter(normalized_asset_identifier__contains=asset_identifier.lower())
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
            if constraint_name != "inv_asset_ident_ci_uniq":
                raise
            raise ValidationError(
                {"asset_identifier": "An asset with this Asset ID already exists."}
            ) from exc

        response_serializer = AssetSerializer(
            asset,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


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
