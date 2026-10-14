from django.urls import path

from . import views

urlpatterns = [
    path("assets/", views.asset_list, name="asset-list"),
    path(
        "assets/<int:asset_id>/",
        views.AssetDetailAPIView.as_view(),
        name="asset-detail",
    ),
    path("assets/lookup/", views.asset_list, name="asset-lookup"),
    
    path("equipment-types/", views.EquipmentTypeList.as_view(), name="equipment-type-list"),
    path("categories/", views.CategoryList.as_view(), name="category-list"),
]