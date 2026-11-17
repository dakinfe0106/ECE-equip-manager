from django.urls import path

from . import views

urlpatterns = [
    path(
        "maintenance-records/",
        views.MaintenanceRecordListCreate.as_view(),
        name="maintenance-record-list",
    ),
    path(
        "maintenance-records/technicians/",
        views.MaintenanceTechnicianList.as_view(),
        name="maintenance-technician-list",
    ),
    path(
        "maintenance-records/<int:pk>/",
        views.MaintenanceRecordDetail.as_view(),
        name="maintenance-record-detail",
    ),
]
