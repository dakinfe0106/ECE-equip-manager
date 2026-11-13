from django.contrib.auth import get_user_model
from rest_framework import serializers

from inventory.models import Asset

from .models import MaintenanceRecord

User = get_user_model()


class MaintenanceAssetSerializer(serializers.ModelSerializer):
    equipment_type = serializers.CharField(source="type.name", read_only=True)

    class Meta:
        model = Asset
        fields = ("asset_id", "asset_identifier", "name", "status", "equipment_type")


class MaintenanceTechnicianSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name")


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    asset = MaintenanceAssetSerializer(read_only=True)
    technician = MaintenanceTechnicianSerializer(read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceRecord
        fields = (
            "maintenance_id",
            "asset",
            "technician",
            "maintenance_type",
            "priority",
            "start_date",
            "end_date",
            "status",
        )
        read_only_fields = fields

    def get_status(self, record):
        return "Completed" if record.end_date else "In Progress"


class MaintenanceRecordCreateSerializer(serializers.Serializer):
    asset_id = serializers.PrimaryKeyRelatedField(
        queryset=Asset.objects.all(),
    )
    technician_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True, role=User.Role.TECHNICIAN),
    )
    maintenance_type = serializers.ChoiceField(
        choices=MaintenanceRecord.MaintenanceType.choices,
    )
    priority = serializers.ChoiceField(choices=MaintenanceRecord.Priority.choices)
    start_date = serializers.DateField()
