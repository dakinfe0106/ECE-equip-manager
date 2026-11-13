from rest_framework import serializers

from .models import Borrower


class BorrowerListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Borrower
        fields = ("borrower_id", "unb_id", "first_name", "last_name")
        read_only_fields = fields


class BorrowerDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Borrower
        fields = (
            "borrower_id",
            "unb_id",
            "first_name",
            "last_name",
            "negligent_damage_flag",
        )
        read_only_fields = fields
