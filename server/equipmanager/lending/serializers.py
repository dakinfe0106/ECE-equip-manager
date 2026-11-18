from rest_framework import serializers

from inventory.models import Asset

from .models import Borrower, DamageFlag, Loan
from .services import damage_warning_level_for_count


class BorrowerListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Borrower
        fields = ("borrower_id", "unb_id", "first_name", "last_name")
        read_only_fields = fields


class BorrowerCreateSerializer(serializers.ModelSerializer):
    unb_id = serializers.CharField(
        max_length=100,
        trim_whitespace=True,
        error_messages={
            "blank": "Enter a UNB ID.",
            "required": "Enter a UNB ID.",
        },
    )
    first_name = serializers.CharField(
        max_length=255,
        trim_whitespace=True,
        error_messages={
            "blank": "Enter a first name.",
            "required": "Enter a first name.",
        },
    )
    last_name = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        default="",
        trim_whitespace=True,
    )

    class Meta:
        model = Borrower
        fields = ("unb_id", "first_name", "last_name", "is_manual_enrollment")
        read_only_fields = ("is_manual_enrollment",)

    def validate_unb_id(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Enter a UNB ID.")
        if Borrower.objects.filter(unb_id=trimmed).exists():
            raise serializers.ValidationError(
                "A borrower with this UNB ID already exists."
            )
        return trimmed

    def validate_first_name(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Enter a first name.")
        return trimmed

    def validate_last_name(self, value):
        return value.strip() if value else ""

    def create(self, validated_data):
        validated_data["is_manual_enrollment"] = True
        return super().create(validated_data)


class BorrowerUpdateSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(max_length=255, trim_whitespace=True)
    last_name = serializers.CharField(
        max_length=255, required=False, allow_blank=True, trim_whitespace=True
    )

    class Meta:
        model = Borrower
        fields = ("first_name", "last_name")

    def validate_first_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Enter a first name.")
        return value.strip()

    def validate_last_name(self, value):
        return value.strip() if value else ""


class LoanCheckoutSerializer(serializers.Serializer):
    asset_id = serializers.IntegerField(min_value=1)
    borrower_id = serializers.IntegerField(min_value=1)
    expected_return_date = serializers.DateField(input_formats=["%Y-%m-%d"])

    def to_internal_value(self, data):
        if hasattr(data, "keys"):
            unknown = set(data.keys()) - set(self.fields)
            if unknown:
                raise serializers.ValidationError(
                    {field: "This field is not accepted." for field in sorted(unknown)}
                )
        return super().to_internal_value(data)


class LoanQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=("on_loan", "overdue", "returned"), required=False
    )
    expected_return_from = serializers.DateField(
        input_formats=["%Y-%m-%d"], required=False
    )
    expected_return_to = serializers.DateField(
        input_formats=["%Y-%m-%d"], required=False
    )
    asset_status = serializers.ChoiceField(
        choices=("available", "on_loan", "under_maintenance", "retired"), required=False
    )
    search = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        start = attrs.get("expected_return_from")
        end = attrs.get("expected_return_to")
        if start and end and start > end:
            raise serializers.ValidationError(
                {"expected_return_to": "Must be on or after expected_return_from."}
            )
        return attrs


class LoanListSerializer(serializers.ModelSerializer):
    asset_identifier = serializers.CharField(
        source="asset.asset_identifier",
        read_only=True,
    )
    equipment_name = serializers.CharField(
        source="asset.name",
        read_only=True,
    )
    borrower_unb_id = serializers.CharField(
        source="borrower.unb_id",
        read_only=True,
    )
    borrower_name = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Loan
        fields = (
            "loan_id",
            "asset_id",
            "asset_identifier",
            "equipment_name",
            "borrower_id",
            "borrower_unb_id",
            "borrower_name",
            "checkout_date",
            "expected_return_date",
            "actual_return_date",
            "return_condition",
            "status",
        )
        read_only_fields = fields

    def get_borrower_name(self, obj):
        return f"{obj.borrower.first_name} {obj.borrower.last_name}".strip()

    def get_status(self, obj):
        if obj.actual_return_date is not None:
            return "returned"
        if obj.expected_return_date < self.context["today"]:
            return "overdue"
        return "on_loan"


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
            "is_manual_enrollment",
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
            raise serializers.ValidationError(
                {field: "This field is not accepted." for field in sorted(unknown)}
            )


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
                raise serializers.ValidationError(
                    {field: "This field is not accepted." for field in sorted(unknown)}
                )
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
    borrower_id = serializers.IntegerField(
        source="borrower.borrower_id", read_only=True
    )
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
    