from django.db.models import Count, Q
from django.db.models.functions import Lower
from rest_framework import generics
from rest_framework.exceptions import ValidationError

from .category_serializers import CategorySummarySerializer
from .models import Category
from .serializers import EquipmentTypeSerializer

DELETED_FILTER_VALUES = ("false", "true", "all")


def categories_with_type_counts():
    """All categories, each annotated with its number of active equipment types."""
    return Category.objects.annotate(
        equipment_type_count=Count(
            "equipment_types",
            filter=Q(equipment_types__is_deleted=False),
        ),
    )


class CategoryList(generics.ListAPIView):
    """List categories for the Categories screen, sorted by name.

    Query parameters:
    - deleted: "false" (default) lists active categories, "true" lists soft-deleted
      categories, "all" lists both.
    - search: case-insensitive match on part of the name.
    """

    serializer_class = CategorySummarySerializer

    def get_queryset(self):
        queryset = categories_with_type_counts()

        deleted = self.request.query_params.get("deleted", "false").lower()
        if deleted not in DELETED_FILTER_VALUES:
            raise ValidationError(
                {"deleted": ['Must be one of: "false", "true", "all".']}
            )
        if deleted != "all":
            queryset = queryset.filter(is_deleted=(deleted == "true"))

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset.order_by(Lower("name"), "category_id")


class CategoryDetail(generics.RetrieveAPIView):
    """A single category. Soft-deleted categories can still be viewed."""

    serializer_class = CategorySummarySerializer
    queryset = categories_with_type_counts()
    lookup_field = "category_id"


class CategoryEquipmentTypeList(generics.ListAPIView):
    """Active equipment types that belong to one category, sorted by name."""

    serializer_class = EquipmentTypeSerializer

    def get_queryset(self):
        category = generics.get_object_or_404(
            Category, category_id=self.kwargs["category_id"]
        )
        return (
            category.equipment_types.filter(is_deleted=False)
            .select_related("category")
            .order_by(Lower("name"), "type_id")
        )
