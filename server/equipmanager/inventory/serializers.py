from rest_framework import serializers

from .models import Asset, Category, EquipmentType


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("category_id", "name")

    def validate_name(self, value):
        # Soft-deleted categories keep their names reserved, so check every row.
        if Category.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("A category with this name already exists.")
        return value


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
