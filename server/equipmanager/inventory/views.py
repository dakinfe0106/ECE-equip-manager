from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import EquipmentType, Category
from .serializers import EquipmentTypeSerializer
from .serializers import EquipmentTypeSerializer, CategorySerializer
from typing import ClassVar


class EquipmentTypeList(generics.ListCreateAPIView):
    """
    API endpoint to list all active equipment types.
    """
    serializer_class = EquipmentTypeSerializer
    permission_classes: ClassVar = [AllowAny]  

    def get_queryset(self):
        return EquipmentType.objects.filter(
            is_deleted=False,
            category__is_deleted=False,
        ).select_related("category")

class CategoryList(generics.ListAPIView):
    """
    API endpoint to list all active categories (used for the dropdown).
    """
    queryset = Category.objects.filter(is_deleted=False)
    serializer_class = CategorySerializer
    permission_classes: ClassVar = [AllowAny]  
