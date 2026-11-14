from rest_framework import serializers

from .models import Borrower, Loan


class BorrowerListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Borrower
        fields = ("borrower_id", "unb_id", "first_name", "last_name")
        read_only_fields = fields


class LoanQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=("on_loan", "overdue", "returned"), required=False)
    expected_return_from = serializers.DateField(input_formats=["%Y-%m-%d"], required=False)
    expected_return_to = serializers.DateField(input_formats=["%Y-%m-%d"], required=False)
    asset_status = serializers.ChoiceField(
        choices=("available", "on_loan", "under_maintenance", "retired"), required=False
    )
    search = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        start = attrs.get("expected_return_from")
        end = attrs.get("expected_return_to")
        if start and end and start > end:
            raise serializers.ValidationError({
                "expected_return_to": "Must be on or after expected_return_from."
            })
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