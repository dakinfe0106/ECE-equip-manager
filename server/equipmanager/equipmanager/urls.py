"""
URL configuration for equipmanager project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path

from .views import health_check

# Each business app owns its routes in its own urls.py; add endpoints there,
# not here (see docs/Architecture.md, section 7).
urlpatterns = [
    path('api/health/', health_check, name='health-check'),
    path('admin/', admin.site.urls),
    path('api/', include('inventory.urls')),
    path('api/', include('lending.urls')),
    path('api/', include('maintenance.urls')),
    path('api/', include('users.urls')),
]
