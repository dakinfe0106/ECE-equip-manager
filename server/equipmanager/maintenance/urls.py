from django.urls import path

from . import views

urlpatterns = [
    path(
        "maintenance-records/",
        views.MaintenanceRecordCreate.as_view(),
        name="maintenance-record-create",
    ),
    path(
        "maintenance-records/technicians/",
        views.MaintenanceTechnicianList.as_view(),
        name="maintenance-technician-list",
    ),
]
