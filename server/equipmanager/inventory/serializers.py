from typing import ClassVar

from rest_framework import serializers

from .models import Category, EquipmentType


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields: ClassVar = ["id", "name"]


class EquipmentTypeSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)

    class Meta:
        model = EquipmentType
        fields: ClassVar = ["id", "name", "description", "category"]