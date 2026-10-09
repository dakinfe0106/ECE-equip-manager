from rest_framework import generics

from .models import EquipmentType
from .serializers import EquipmentTypeSerializer


class EquipmentTypeList(generics.ListAPIView):
    serializer_class = EquipmentTypeSerializer

    def get_queryset(self):
        return EquipmentType.objects.filter(
            is_deleted=False,
            category__is_deleted=False,
        ).select_related("category")

