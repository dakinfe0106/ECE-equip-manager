from django.urls import path

from . import views

urlpatterns = [
    path("assets/", views.asset_list, name="asset-list"),
    path("assets/lookup/", views.asset_list, name="asset-lookup"),
]
