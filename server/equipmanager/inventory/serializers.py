from typing import ClassVar

from rest_framework import serializers

from .models import Category, EquipmentType


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields: ClassVar = ["id", "name"]


class EquipmentTypeSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)

    #for POST requests so the frontend can send a category ID
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), 
        source='category', 
        write_only=True
    )

    class Meta:
        model = EquipmentType
        fields: ClassVar = ["id", "name", "description", "category"]

    # Custom validation to prevent duplicates
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