from django.urls import path

from . import views

urlpatterns = [
    path("analytics/years/", views.AnalyticsYears.as_view(), name="analytics-years"),
    path(
        "analytics/utilization/",
        views.UtilizationAnalytics.as_view(),
        name="analytics-utilization",
    ),
    path(
        "analytics/borrowing/",
        views.BorrowingAnalytics.as_view(),
        name="analytics-borrowing",
    ),
    path(
        "analytics/borrowers/",
        views.BorrowerAnalytics.as_view(),
        name="analytics-borrowers",
    ),
    path("loans/", views.LoanList.as_view(), name="loan-list"),
    path("loans/<int:pk>/return/", views.LoanReturn.as_view(), name="loan-return"),
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
