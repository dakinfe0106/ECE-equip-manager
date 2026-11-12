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
    equipment_type = AssetEquipmentTypeSerializer(source="type", read_only=True)

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


class CategoryCreateSerializer(CategorySerializer):
    def validate_name(self, value):
        # Names stay reserved after soft deletion, so archived categories count too.
        if Category.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("A category with this name already exists.")
        return value


class EquipmentTypeCreateSerializer(serializers.ModelSerializer):
    category_id = serializers.PrimaryKeyRelatedField(
        source="category",
        queryset=Category.objects.filter(is_deleted=False),
    )
    description = serializers.CharField(required=False, allow_blank=True, default="")

    class Meta:
        model = EquipmentType
        fields = ("type_id", "name", "description", "category_id")
        read_only_fields = ("type_id",)

    def validate(self, attrs):
        if EquipmentType.objects.filter(
            category=attrs["category"],
            name__iexact=attrs["name"],
        ).exists():
            raise serializers.ValidationError(
                {"name": "An equipment type with this name already exists in this category."}
            )
        return attrs


class AssetCreateSerializer(serializers.ModelSerializer):
    equipment_type_id = serializers.PrimaryKeyRelatedField(
        source="type",
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
