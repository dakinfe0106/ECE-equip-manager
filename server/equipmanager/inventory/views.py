from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import EquipmentType, Category
from .serializers import EquipmentTypeSerializer
from .serializers import EquipmentTypeSerializer, CategorySerializer


class EquipmentTypeList(generics.ListAPIView):
    serializer_class = EquipmentTypeSerializer

    def get_queryset(self):
        return EquipmentType.objects.filter(
            is_deleted=False,
            category__is_deleted=False,
        ).select_related("category")

class CategoryList(generics.ListAPIView):
    """
    API endpoint to list all active categories (used for the dropdown).
    """
    # Best practice: Only show categories that aren't deleted, matching Treasure's logic
    queryset = Category.objects.filter(is_deleted=False)
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]  # Allows the frontend to fetch this without logging in
