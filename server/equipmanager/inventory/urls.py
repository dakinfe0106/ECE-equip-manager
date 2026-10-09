from django.urls import path

from .views import EquipmentTypeList

urlpatterns = [
    path(
        "equipment-types/",
        EquipmentTypeList.as_view(),
        name="equipment-type-list",
    ),
]