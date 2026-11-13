
from django.contrib.auth import get_user_model
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from inventory.models import Asset

from .permissions import MaintenanceRolePermissions
from .serializers import (
    MaintenanceRecordCreateSerializer,
    MaintenanceRecordSerializer,
    MaintenanceTechnicianSerializer,
)
from .services import MaintenanceRuleError, start_maintenance

User = get_user_model()


@method_decorator(ensure_csrf_cookie, name="dispatch")
class MaintenanceRecordCreate(generics.CreateAPIView):
    permission_classes = (MaintenanceRolePermissions,)
    serializer_class = MaintenanceRecordCreateSerializer

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
class MaintenanceTechnicianList(generics.ListAPIView):
    queryset = User.objects.filter(
        is_active=True,
        role=User.Role.TECHNICIAN,
    ).order_by("last_name", "first_name", "username")
    serializer_class = MaintenanceTechnicianSerializer
    permission_classes = (MaintenanceRolePermissions,)
