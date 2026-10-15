
from django.db import IntegrityError, transaction
from django.db.models.functions import Lower, Trim
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination

from .models import Asset, Category
from .serializers import AssetSerializer, CategorySerializer

CATEGORY_NAME_CONSTRAINT = "inv_category_name_ci_uniq"  # name= on Category's UniqueConstraint


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CategoryList(generics.ListCreateAPIView):
    queryset = Category.objects.filter(is_deleted=False).order_by(Lower("name"))
    serializer_class = CategorySerializer

    def perform_create(self, serializer):
        # Two concurrent requests can both pass the serializer check;
        # the unique constraint is the final guard.
        try:
            with transaction.atomic():
                serializer.save()
        except IntegrityError as exc:
            constraint = getattr(getattr(exc.__cause__, "diag", None), "constraint_name", None)
            if constraint == CATEGORY_NAME_CONSTRAINT:
                raise ValidationError(
                    {"name": ["A category with this name already exists."]}
                ) from exc
            raise


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
