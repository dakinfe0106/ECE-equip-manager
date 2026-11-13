from collections.abc import Mapping

from rest_framework import serializers

from .models import Borrower


class BorrowerListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Borrower
        fields = ("borrower_id", "unb_id", "first_name", "last_name")
        read_only_fields = fields


class BorrowerDetailSerializer(BorrowerListSerializer):
    class Meta(BorrowerListSerializer.Meta):
        read_only_fields = ("borrower_id", "unb_id", "last_name")

    def to_internal_value(self, data):
        if isinstance(data, Mapping):
            disallowed_fields = sorted(set(data) - {"first_name"})
            if disallowed_fields:
                raise serializers.ValidationError(
                    {
                        field: ["This field is not allowed."]
                        for field in disallowed_fields
                    }
                )
        return super().to_internal_value(data)
