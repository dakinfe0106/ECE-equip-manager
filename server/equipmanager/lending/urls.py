from django.urls import path

from . import views

urlpatterns = [
    path("borrowers/", views.BorrowerList.as_view(), name="borrower-list"),
]
