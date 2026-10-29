from django.urls import path

from . import views

urlpatterns = [
    path("dashboard/", views.Dashboard.as_view(), name="dashboard"),
    # Lookup for the Add Asset form: id and name only, ordered by name.
    path("categories/", views.category_list, name="category-list"),
    # Categories page: ordered by ID, with status and equipment type count.
    path(
        "categories/summary/",
        views.CategoryList.as_view(),
        name="category-summary-list",
    ),
    path(
        "categories/<int:pk>/equipment-types/",
        views.CategoryEquipmentTypeList.as_view(),
        name="category-equipment-type-list",
    ),
    path("equipment-types/", views.equipment_type_list, name="equipment-type-list"),
    path("assets/", views.AssetListCreateAPIView.as_view(), name="asset-list"),
    path(
        "assets/<int:asset_id>/",
        views.AssetDetailAPIView.as_view(),
        name="asset-detail",
    ),
    path("assets/lookup/", views.AssetListCreateAPIView.as_view(), name="asset-lookup"),
]
