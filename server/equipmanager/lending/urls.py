from django.urls import path

from . import views
from .analytics import AnalyticsOptions, LendingAnalytics
from .analytics_export import AnalyticsExport

urlpatterns = [
    path('analytics/exports/', AnalyticsExport.as_view(), name='analytics-export'),
    path('analytics/options/', AnalyticsOptions.as_view(), name='analytics-options'),
    path('analytics/lending/', LendingAnalytics.as_view(), name='analytics-lending'),
    path("loans/", views.LoanList.as_view(), name="loan-list"),
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
