from rest_framework import serializers

from inventory.models import Asset

from .models import Borrower, DamageFlag
from .services import damage_warning_level_for_count


class BorrowerListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Borrower
        fields = ("borrower_id", "unb_id", "first_name", "last_name")
        read_only_fields = fields


class BorrowerDetailSerializer(serializers.ModelSerializer):
    unresolved_damage_flag_count = serializers.IntegerField(read_only=True)
    damage_warning_level = serializers.SerializerMethodField()
    damage_eligible = serializers.SerializerMethodField()

    class Meta:
        model = Borrower
        fields = (
            "borrower_id",
            "unb_id",
            "first_name",
            "last_name",
            "negligent_damage_flag",
            "unresolved_damage_flag_count",
            "damage_warning_level",
            "damage_eligible",
        )
        read_only_fields = fields

    def get_damage_warning_level(self, borrower):
        return damage_warning_level_for_count(borrower.unresolved_damage_flag_count)

    def get_damage_eligible(self, borrower):
        return borrower.unresolved_damage_flag_count < 3


class DamageFlagWriteSerializer(serializers.Serializer):
    equipment_id = serializers.PrimaryKeyRelatedField(
        source="asset",
        queryset=Asset.objects.filter(
            is_deleted=False,
            type__is_deleted=False,
            type__category__is_deleted=False,
        ),
    )
    incident_date = serializers.DateField()
    reason = serializers.CharField(max_length=1000)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    reviewed = serializers.BooleanField(write_only=True)

    def to_internal_value(self, data):
        self._reject_unknown_fields(data)
        return super().to_internal_value(data)

    def validate_reviewed(self, value):
        if value is not True:
            raise serializers.ValidationError(
                "The incident must be reviewed before it can be recorded."
            )
        return value

    def validate_reason(self, value):
        if not value.strip():
            raise serializers.ValidationError("Reason is required.")
        return value.strip()

    def _reject_unknown_fields(self, data):
        if not hasattr(data, "keys"):
            return
        unknown = set(data.keys()) - set(self.fields)
        if unknown:
            raise serializers.ValidationError({
                field: "This field is not accepted."
                for field in sorted(unknown)
            })


class DamageFlagUpdateSerializer(serializers.Serializer):
    equipment_id = serializers.PrimaryKeyRelatedField(
        source="asset",
        queryset=Asset.objects.filter(
            is_deleted=False,
            type__is_deleted=False,
            type__category__is_deleted=False,
        ),
        required=False,
    )
    incident_date = serializers.DateField(required=False)
    reason = serializers.CharField(max_length=1000, required=False)
    notes = serializers.CharField(required=False, allow_blank=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        current_asset_id = self.context.get("current_asset_id")
        if current_asset_id:
            asset_field = self.fields["equipment_id"]
            asset_field.queryset = asset_field.queryset | Asset.objects.filter(
                asset_id=current_asset_id
            )

    def to_internal_value(self, data):
        if hasattr(data, "keys"):
            unknown = set(data.keys()) - set(self.fields)
            if unknown:
                raise serializers.ValidationError({
                    field: "This field is not accepted."
                    for field in sorted(unknown)
                })
        return super().to_internal_value(data)

    def validate_reason(self, value):
        if not value.strip():
            raise serializers.ValidationError("Reason is required.")
        return value.strip()


class DamageFlagResolutionSerializer(serializers.Serializer):
    resolution_reason = serializers.CharField(max_length=1000)

    def validate_resolution_reason(self, value):
        if not value.strip():
            raise serializers.ValidationError("Resolution reason is required.")
        return value.strip()


class DamageFlagSerializer(serializers.ModelSerializer):
    borrower_id = serializers.IntegerField(source="borrower.borrower_id", read_only=True)
    borrower_name = serializers.SerializerMethodField()
    equipment_id = serializers.IntegerField(source="asset.asset_id", read_only=True)
    equipment_name = serializers.CharField(source="asset.name", read_only=True)
    reviewed = serializers.SerializerMethodField()
    reviewed_by = serializers.CharField(source="reviewed_by.username", read_only=True)
    resolved_by = serializers.CharField(
        source="resolved_by.username",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = DamageFlag
        fields = (
            "damage_flag_id",
            "borrower_id",
            "borrower_name",
            "equipment_id",
            "equipment_name",
            "incident_date",
            "reason",
            "notes",
            "status",
            "created_at",
            "updated_at",
            "reviewed",
            "reviewed_by",
            "reviewed_at",
            "resolved_by",
            "resolved_at",
            "resolution_reason",
        )
        read_only_fields = fields

    def get_borrower_name(self, flag):
        return str(flag.borrower)

    def get_reviewed(self, flag):
        return flag.reviewed_at is not None
