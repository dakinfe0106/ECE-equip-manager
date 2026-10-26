from django.urls import path

from . import views

urlpatterns = [
    path("auth/csrf/", views.csrf_cookie, name="auth-csrf"),
    path("auth/login/", views.LoginView.as_view(), name="auth-login"),
    path("auth/logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", views.CurrentUserView.as_view(), name="auth-current-user"),
]
