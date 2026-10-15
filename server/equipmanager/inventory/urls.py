from django.urls import path

from . import views

urlpatterns = [
    path("categories/", views.category_list, name="category-list"),
    path("equipment-types/", views.equipment_type_list, name="equipment-type-list"),
    path("assets/", views.AssetListCreateAPIView.as_view(), name="asset-list"),
    path(
        "assets/<int:pk>/",
        views.AssetDetail.as_view(),
        name="asset-detail",
    ),
    path("assets/lookup/", views.AssetListCreateAPIView.as_view(), name="asset-lookup"),
]
