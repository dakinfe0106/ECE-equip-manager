from django.urls import path

from . import views

urlpatterns = [
    path('auth/csrf/', views.CsrfToken.as_view(), name='auth-csrf'),
    path('auth/login/', views.Login.as_view(), name='auth-login'),
    path('auth/logout/', views.Logout.as_view(), name='auth-logout'),
    path('auth/me/', views.CurrentUser.as_view(), name='auth-me'),
]
