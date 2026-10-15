from django.urls import path

from . import views

urlpatterns = [
    # Asset URLs
    path("assets/", views.AssetListCreateAPIView.as_view(), name="asset-list"),
    path("assets/<int:asset_id>/", views.AssetDetailAPIView.as_view(), name="asset-detail"),
    path("assets/lookup/", views.AssetListCreateAPIView.as_view(), name="asset-lookup"), # FIXED THIS LINE
    
    # Equipment Type URLs
    path("equipment-types/", views.EquipmentTypeList.as_view(), name="equipment-type-list"),
    path("equipment-types/lookup/", views.equipment_type_list, name="equipment-type-lookup"),
    
    # Category URLs
    path("categories/", views.category_list, name="category-list"),
    path("categories/summary/", views.CategoryList.as_view(), name="category-summary-list"),
    path("categories/<int:pk>/equipment-types/", views.CategoryEquipmentTypeList.as_view(), name="category-equipment-type-list"),
]