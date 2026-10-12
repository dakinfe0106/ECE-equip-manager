from typing import ClassVar

from rest_framework import serializers

from .serializers import CategorySerializer


class CategorySummarySerializer(CategorySerializer):
    """A category as shown on the Categories screen.

    Adds the soft-delete flag and the number of active equipment types.
    `equipment_type_count` comes from a queryset annotation (see category_views.py).
    """

    equipment_type_count = serializers.IntegerField(read_only=True)

    class Meta(CategorySerializer.Meta):
        fields: ClassVar = [
            *CategorySerializer.Meta.fields,
            "is_deleted",
            "equipment_type_count",
        ]
