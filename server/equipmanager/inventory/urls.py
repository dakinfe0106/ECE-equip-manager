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
    path("categories/", views.CategoryList.as_view(), name="category-list"),
    path(
        "categories/<int:category_id>/equipment-types/",
        views.CategoryEquipmentTypeList.as_view(),
        name="category-equipment-type-list",
    ),
]
