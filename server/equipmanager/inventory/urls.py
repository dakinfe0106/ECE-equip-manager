from django.urls import path

from . import views

urlpatterns = [
    path("assets/", views.AssetList.as_view(), name="asset-list"),
    path(
        "assets/<int:pk>/",
        views.AssetDetail.as_view(),
        name="asset-detail",
    ),
    path("assets/lookup/", views.AssetList.as_view(), name="asset-lookup"),
]
