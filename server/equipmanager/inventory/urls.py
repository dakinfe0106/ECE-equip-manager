from django.urls import path

from . import views
from .analytics import EquipmentAvailability
from .exports import InventoryExport

urlpatterns = [
    path('analytics/availability-summary/', EquipmentAvailability.as_view(), name='analytics-availability-summary'),
    path("dashboard/", views.Dashboard.as_view(), name="dashboard"),
    path(
        "analytics/availability/",
        views.AvailabilityAnalytics.as_view(),
        name="analytics-availability",
    ),
    # Lookup for the Add Asset form: id and name only, ordered by name.
    path("categories/", views.CategoryLookupList.as_view(), name="category-list"),
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
    path(
        "equipment-types/",
        views.EquipmentTypeLookupList.as_view(),
        name="equipment-type-list",
    ),
    path("assets/", views.AssetListCreateAPIView.as_view(), name="asset-list"),
    path("assets/export/", InventoryExport.as_view(), name="asset-export"),
    path(
        "assets/<int:pk>/",
        views.AssetDetail.as_view(),
        name="asset-detail",
    ),
    path("assets/lookup/", views.AssetListCreateAPIView.as_view(), name="asset-lookup"),
]
