
from django.db.models.functions import Lower, Trim
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination

from .models import Asset
from .serializers import AssetSerializer


class AssetPagination(PageNumberPagination):
    page_size = 20


@method_decorator(ensure_csrf_cookie, name="dispatch")
class AssetList(generics.ListAPIView):
    serializer_class = AssetSerializer
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
