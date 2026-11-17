
from django.contrib.auth import get_user_model
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from inventory.models import Asset

from .models import MaintenanceRecord
from .permissions import MaintenanceRolePermissions
from .serializers import (
    MaintenanceRecordCreateSerializer,
    MaintenanceRecordSerializer,
    MaintenanceTechnicianSerializer,
)
from .services import MaintenanceRuleError, start_maintenance

User = get_user_model()


class MaintenancePagination(PageNumberPagination):
    page_size = 20


@method_decorator(ensure_csrf_cookie, name="dispatch")
class MaintenanceRecordListCreate(generics.ListCreateAPIView):
    queryset = MaintenanceRecord.objects.all()
    permission_classes = (MaintenanceRolePermissions,)
    pagination_class = MaintenancePagination

    def get_queryset(self):
        records = MaintenanceRecord.objects.select_related(
            "asset__type",
            "technician",
        )

        status_filter = self.request.query_params.get("status", "all").lower()
        if status_filter == "in_progress":
            records = records.filter(end_date__isnull=True)
        elif status_filter == "completed":
            records = records.filter(end_date__isnull=False)
        elif status_filter != "all":
            raise ValidationError(
                {"status": 'Must be one of: "all", "in_progress", "completed".'}
            )

        maintenance_type = self.request.query_params.get("maintenance_type")
        if maintenance_type:
            valid_types = MaintenanceRecord.MaintenanceType.values
            if maintenance_type not in valid_types:
                raise ValidationError(
                    {"maintenance_type": "Select a valid maintenance type."}
                )
            records = records.filter(maintenance_type=maintenance_type)

        priority = self.request.query_params.get("priority")
        if priority:
            valid_priorities = MaintenanceRecord.Priority.values
            if priority not in valid_priorities:
                raise ValidationError({"priority": "Select a valid priority."})
            records = records.filter(priority=priority)

        asset_identifier = self.request.query_params.get("asset_identifier", "").strip()
        if asset_identifier:
            records = records.filter(
                asset__asset_identifier__icontains=asset_identifier,
            )

        asset_id = self.request.query_params.get("asset_id")
        if asset_id:
            try:
                asset_id = int(asset_id)
            except ValueError as exc:
                raise ValidationError(
                    {"asset_id": "Must be a valid integer."}
                ) from exc
            records = records.filter(asset_id=asset_id)

        return records.order_by("-start_date", "-maintenance_id")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return MaintenanceRecordCreateSerializer
        return MaintenanceRecordSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        try:
            record = start_maintenance(
                asset_id=values["asset_id"].pk,
                technician_id=values["technician_id"].pk,
                maintenance_type=values["maintenance_type"],
                priority=values["priority"],
                start_date=values["start_date"],
            )
        except MaintenanceRuleError as exc:
            raise ValidationError(exc.detail) from exc
        except User.DoesNotExist:
            raise ValidationError(
                {"technician_id": "Select an active technician."}
            ) from None
        except Asset.DoesNotExist as exc:
            raise NotFound("The selected equipment no longer exists.") from exc

        return Response(
            MaintenanceRecordSerializer(record).data,
            status=status.HTTP_201_CREATED,
        )


@method_decorator(ensure_csrf_cookie, name="dispatch")
class MaintenanceRecordDetail(generics.RetrieveAPIView):
    queryset = MaintenanceRecord.objects.select_related(
        "asset__type",
        "technician",
    )
    serializer_class = MaintenanceRecordSerializer
    permission_classes = (MaintenanceRolePermissions,)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class MaintenanceTechnicianList(generics.ListAPIView):
    queryset = User.objects.filter(
        is_active=True,
        role=User.Role.TECHNICIAN,
    ).order_by("last_name", "first_name", "username")
    serializer_class = MaintenanceTechnicianSerializer
    permission_classes = (MaintenanceRolePermissions,)
