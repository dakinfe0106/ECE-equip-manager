from django.urls import path

from . import views

urlpatterns = [
    path("loans/", views.LoanList.as_view(), name="loan-list"),
    path("loans/<int:pk>/", views.LoanDetail.as_view(), name="loan-detail"),
    path("borrowers/", views.BorrowerList.as_view(), name="borrower-list"),
    path(
        "borrowers/<int:pk>/damage-flags/",
        views.BorrowerDamageFlagListCreate.as_view(),
        name="borrower-damage-flag-list",
    ),
    path(
        "borrowers/<int:pk>/damage-flags/<int:damage_flag_id>/",
        views.BorrowerDamageFlagDetail.as_view(),
        name="borrower-damage-flag-detail",
    ),
    path("borrowers/<int:pk>/", views.BorrowerDetail.as_view(), name="borrower-detail"),
]
