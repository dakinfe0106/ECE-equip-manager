from django.urls import path

from .views import CategoryList, EquipmentTypeList

urlpatterns = [
    path(
        "equipment-types/",
        EquipmentTypeList.as_view(),
        name="equipment-type-list",
    ),
    path(
        "categories/",
        CategoryList.as_view(),
        name="category-list",
    ),
]