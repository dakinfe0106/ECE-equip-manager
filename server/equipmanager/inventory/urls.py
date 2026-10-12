from django.urls import path

from . import category_views, views

urlpatterns = [
    path("assets/", views.asset_list, name="asset-list"),
    path("assets/lookup/", views.asset_list, name="asset-lookup"),
    path("categories/", category_views.CategoryList.as_view(), name="category-list"),
    path(
        "categories/<int:category_id>/",
        category_views.CategoryDetail.as_view(),
        name="category-detail",
    ),
    path(
        "categories/<int:category_id>/equipment-types/",
        category_views.CategoryEquipmentTypeList.as_view(),
        name="category-equipment-type-list",
    ),
]
