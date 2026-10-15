from rest_framework import serializers

from .models import Asset, Category, EquipmentType


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("category_id", "name")
        read_only_fields = ("category_id",)


class EquipmentTypeSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)

    class Meta:
        model = EquipmentType
        fields = ("type_id", "name", "description", "category", "is_deleted")
        read_only_fields = ("type_id", "is_deleted")


class AssetEquipmentTypeSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)

    class Meta:
        model = EquipmentType
        fields = ("type_id", "name", "description", "category")
        read_only_fields = ("type_id",)


class EquipmentTypeLookupSerializer(EquipmentTypeSerializer):
    category_id = serializers.IntegerField(read_only=True)

    class Meta(EquipmentTypeSerializer.Meta):
        fields = (*EquipmentTypeSerializer.Meta.fields, "category_id")


class AssetSerializer(serializers.ModelSerializer):
    equipment_type = AssetEquipmentTypeSerializer(read_only=True)

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


class AssetCreateSerializer(serializers.ModelSerializer):
    equipment_type_id = serializers.PrimaryKeyRelatedField(
        source="equipment_type",
        queryset=EquipmentType.objects.filter(
            is_deleted=False,
            category__is_deleted=False,
        ),
    )
    status = serializers.ChoiceField(choices=Asset.Status.choices, read_only=True)

    class Meta:
        model = Asset
        fields = (
            "asset_id",
            "asset_identifier",
            "name",
            "equipment_type_id",
            "acquisition_date",
            "status",
        )
        read_only_fields = ("asset_id", "status")

    def validate_asset_identifier(self, value):
        if Asset.objects.filter(asset_identifier__iexact=value).exists():
            raise serializers.ValidationError(
                "An asset with this Asset ID already exists."
            )
        return value

    def validate(self, attrs):
        if "status" in self.initial_data:
            raise serializers.ValidationError(
                {"status": "New assets start as Available."}
            )
        return attrs
