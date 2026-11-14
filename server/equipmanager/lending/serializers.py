from rest_framework import serializers

from .models import Borrower


class BorrowerListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Borrower
        fields = ("borrower_id", "unb_id", "first_name", "last_name")
        read_only_fields = fields


class BorrowerCreateSerializer(serializers.ModelSerializer):
    last_name = serializers.CharField(
        max_length=255, required=False, allow_blank=True, default=""
    )

    class Meta:
        model = Borrower
        fields = ("borrower_id", "unb_id", "first_name", "last_name")
        read_only_fields = ("borrower_id",)

    def validate_unb_id(self, value):
        if Borrower.objects.filter(unb_id=value).exists():
            raise serializers.ValidationError(
                "A borrower with this UNB ID already exists."
            )
        return value