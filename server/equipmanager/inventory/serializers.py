from rest_framework import serializers

from .models import Asset, Category, EquipmentType


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("category_id", "name")
        read_only_fields = ("category_id",)


class EquipmentTypeSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    # allows the frontend to send the category ID
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), 
        source='category', 
        write_only=True
    )

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

    def validate(self, data):
        """
        Custom validation to prevent duplicate equipment types within the same category.
        """
        name = data.get('name')
        category = data.get('category')
        
        if name and category and EquipmentType.objects.filter(
            name__iexact=name, 
            category=category
        ).exists():
            raise serializers.ValidationError({
                "name": f"An equipment type named '{name}' already exists in this category."
            })
            
        return data

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
