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
        Checks if an equipment type with the same name already exists 
        within the selected category. Case-insensitive to prevent typos.
        """
        name = data.get('name')
        category = data.get('category') # This gets the Category object thanks to source='category'
        
        if name and category:
            # __iexact makes it case-insensitive (e.g., "Laptop" == "laptop")
            if EquipmentType.objects.filter(name__iexact=name, category=category).exists():
                raise serializers.ValidationError({
                    "name": f"An equipment type named '{name}' already exists in this category."
                })
                
        return data