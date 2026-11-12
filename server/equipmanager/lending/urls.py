from django.urls import path

from . import views

urlpatterns = [
    path("borrowers/", views.BorrowerList.as_view(), name="borrower-list"),
    path(
        "borrowers/<int:pk>/",
        views.BorrowerDetail.as_view(),
        name="borrower-detail",
    ),
]
