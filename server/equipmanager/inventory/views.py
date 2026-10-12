
from django.db.models.functions import Lower, Trim
from rest_framework.decorators import api_view
from rest_framework.pagination import PageNumberPagination

from .models import Asset
from .serializers import AssetSerializer


class AssetPagination(PageNumberPagination):
    page_size = 20


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
