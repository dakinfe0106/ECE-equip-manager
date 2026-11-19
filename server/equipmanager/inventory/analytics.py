from django.db.models import Count, Q
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import AnalyticsReadPermissions

from .models import Asset


class AvailabilityFilters(serializers.Serializer):
    category_id = serializers.IntegerField(min_value=1, required=False)
    equipment_type_id = serializers.IntegerField(min_value=1, required=False)


def availability_rows(values):
    assets = Asset.objects.filter(
        is_deleted=False,
        type__is_deleted=False,
        type__category__is_deleted=False,
    )
    if "category_id" in values:
        assets = assets.filter(type__category_id=values["category_id"])
    if "equipment_type_id" in values:
        assets = assets.filter(type_id=values["equipment_type_id"])
    rows = (
        assets.values("type_id", "type__name", "type__category__name")
        .annotate(
            available=Count("pk", filter=Q(status=Asset.Status.AVAILABLE)),
            on_loan=Count("pk", filter=Q(status=Asset.Status.ON_LOAN)),
            under_maintenance=Count(
                "pk", filter=Q(status=Asset.Status.UNDER_MAINTENANCE)
            ),
            retired=Count("pk", filter=Q(status=Asset.Status.RETIRED)),
            total=Count("pk"),
        )
        .order_by("type__category__name", "type__name", "type_id")
    )
    return [
        {
            "label": f"{row['type__category__name']} / {row['type__name']}",
            **{
                key: row[key]
                for key in (
                    "available",
                    "on_loan",
                    "under_maintenance",
                    "retired",
                    "total",
                )
            },
        }
        for row in rows
    ]


class EquipmentAvailability(APIView):
    permission_classes = (AnalyticsReadPermissions,)

    def get(self, request):
        filters = AvailabilityFilters(data=request.query_params)
        filters.is_valid(raise_exception=True)
        return Response({"rows": availability_rows(filters.validated_data)})
