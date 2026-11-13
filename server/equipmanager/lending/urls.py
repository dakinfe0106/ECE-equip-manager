from django.urls import path

from . import views

urlpatterns = [
    path("loans/", views.LoanList.as_view(), name="loan-list"),
    path("borrowers/", views.BorrowerList.as_view(), name="borrower-list"),
]
