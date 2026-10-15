from rest_framework import serializers

from .models import Asset, Category, EquipmentType


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("category_id", "name")


class EquipmentTypeSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)

    class Meta:
        model = EquipmentType
        fields = ("type_id", "name", "description", "category")


class AssetSerializer(serializers.ModelSerializer):
    equipment_type = EquipmentTypeSerializer(read_only=True)

    class Meta:
        model = Asset
        fields = (
            "asset_id",
            "asset_identifier",
            "name",
            "acquisition_date",
            "status",
            "equipment_type",
        )
        read_only_fields = ("asset_id", "asset_identifier", "equipment_type", "status")


class CategorySummarySerializer(CategorySerializer):
    """A category as shown on the Categories screen.

    Adds the soft-delete flag and the number of active equipment types.
    `equipment_type_count` comes from a queryset annotation (see CategoryList).
    """

    equipment_type_count = serializers.IntegerField(read_only=True)

    class Meta(CategorySerializer.Meta):
        fields = (
            *CategorySerializer.Meta.fields,
            "is_deleted",
            "equipment_type_count",
        )
        read_only_fields = ("is_deleted",)
