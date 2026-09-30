from django.urls import path

from . import views

urlpatterns = [
    path('wel/', views.ReactView.as_view(), name='react-view'),
]