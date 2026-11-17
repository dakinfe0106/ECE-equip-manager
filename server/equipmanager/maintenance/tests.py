
from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework.test import APIClient

from inventory.models import Asset, Category, EquipmentType

from .models import MaintenanceRecord


@pytest.fixture
def inventory_type(db):
    category = Category.objects.create(name="Test Equipment")
    return EquipmentType.objects.create(category=category, name="Multimeter")


@pytest.fixture
def asset_record(inventory_type):
    return Asset.objects.create(
        type=inventory_type,
        asset_identifier="MAINT-001",
        name="Digital multimeter",
    )


@pytest.fixture
def technician(db):
    return get_user_model().objects.create_user(
        username="maintenance-tech",
        password="test-password",
        role="TECHNICIAN",
    )


@pytest.fixture
def authenticated_client(technician):
    client = APIClient()
    client.force_authenticate(user=technician)
    return client


@pytest.fixture
def maintenance_record(asset_record, technician):
    asset_record.status = Asset.Status.UNDER_MAINTENANCE
    asset_record.save(update_fields=("status",))
    return MaintenanceRecord.objects.create(
        asset=asset_record,
        technician=technician,
        maintenance_type=MaintenanceRecord.MaintenanceType.REPAIR,
        priority=MaintenanceRecord.Priority.HIGH,
        start_date=date(2025, 1, 10),
    )


def create_record(client, asset_record, technician, **overrides):
    payload = {
        "asset_id": asset_record.asset_id,
        "technician_id": technician.pk,
        "maintenance_type": MaintenanceRecord.MaintenanceType.REPAIR,
        "priority": MaintenanceRecord.Priority.HIGH,
        "start_date": "2025-01-10",
    }
    payload.update(overrides)
    return client.post("/api/maintenance-records/", payload, format="json")


def test_maintenance_records_require_authentication():
    response = APIClient().get("/api/maintenance-records/")

    assert response.status_code == 403


def test_faculty_cannot_view_or_create_maintenance(
    db, asset_record, authenticated_client, technician
):
    faculty = get_user_model().objects.create_user(
        username="faculty",
        password="test-password",
        role="FACULTY",
    )
    client = APIClient()
    client.force_authenticate(user=faculty)

    assert client.get("/api/maintenance-records/").status_code == 403
    assert create_record(client, asset_record, technician).status_code == 403


def test_technician_can_list_active_technicians(authenticated_client, technician):
    response = authenticated_client.get("/api/maintenance-records/technicians/")

    assert response.status_code == 200
    assert response.data == [
        {
            "id": technician.pk,
            "username": "maintenance-tech",
            "first_name": "",
            "last_name": "",
        }
    ]


def test_create_maintenance_updates_asset_status_transactionally(
    authenticated_client, asset_record, technician
):
    response = create_record(authenticated_client, asset_record, technician)

    assert response.status_code == 201
    assert response.data["asset"]["asset_identifier"] == "MAINT-001"
    assert response.data["technician"]["id"] == technician.pk
    assert response.data["maintenance_type"] == "Repair"
    assert response.data["priority"] == "High"
    assert response.data["start_date"] == "2025-01-10"
    assert response.data["end_date"] is None
    assert response.data["status"] == "In Progress"
    asset_record.refresh_from_db()
    assert asset_record.status == Asset.Status.UNDER_MAINTENANCE
    assert MaintenanceRecord.objects.count() == 1


@pytest.mark.parametrize(
    ("asset_status", "expected_message"),
    [
        (
            Asset.Status.ON_LOAN,
            "Equipment currently on loan must be returned before maintenance.",
        ),
        (
            Asset.Status.UNDER_MAINTENANCE,
            "Only available equipment can enter maintenance.",
        ),
        (
            Asset.Status.RETIRED,
            "Only available equipment can enter maintenance.",
        ),
    ],
)
def test_create_maintenance_rejects_ineligible_asset(
    authenticated_client,
    asset_record,
    technician,
    asset_status,
    expected_message,
):
    asset_record.status = asset_status
    asset_record.save(update_fields=("status",))

    response = create_record(authenticated_client, asset_record, technician)

    assert response.status_code == 400
    assert response.data["asset_id"] == expected_message
    assert MaintenanceRecord.objects.count() == 0


def test_create_maintenance_rejects_archived_asset(
    authenticated_client, asset_record, technician
):
    asset_record.is_deleted = True
    asset_record.save(update_fields=("is_deleted",))

    response = create_record(authenticated_client, asset_record, technician)

    assert response.status_code == 400
    assert response.data["asset_id"] == "Archived equipment cannot enter maintenance."


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("maintenance_type", "Other"),
        ("priority", "Critical"),
        ("start_date", "not-a-date"),
    ],
)
def test_create_maintenance_validates_input(
    authenticated_client, asset_record, technician, field, value
):
    response = create_record(
        authenticated_client,
        asset_record,
        technician,
        **{field: value},
    )

    assert response.status_code == 400
    assert field in response.data
    assert MaintenanceRecord.objects.count() == 0
    asset_record.refresh_from_db()
    assert asset_record.status == Asset.Status.AVAILABLE


def test_create_maintenance_requires_active_technician(
    authenticated_client, asset_record
):
    inactive_technician = get_user_model().objects.create_user(
        username="inactive-tech",
        password="test-password",
        role="TECHNICIAN",
        is_active=False,
    )

    response = create_record(
        authenticated_client,
        asset_record,
        inactive_technician,
    )

    assert response.status_code == 400
    assert "technician_id" in response.data


def test_database_allows_only_one_open_record_per_asset(
    db, asset_record, technician, maintenance_record
):
    with pytest.raises(IntegrityError), transaction.atomic():
        MaintenanceRecord.objects.create(
            asset=asset_record,
            technician=technician,
            maintenance_type=MaintenanceRecord.MaintenanceType.INSPECTION,
            priority=MaintenanceRecord.Priority.LOW,
            start_date=date(2025, 1, 11),
        )


def test_list_filters_by_status_type_priority_and_asset_identifier(
    authenticated_client, maintenance_record, inventory_type, technician
):
    completed_asset = Asset.objects.create(
        type=inventory_type,
        asset_identifier="MAINT-002",
        name="Second multimeter",
    )
    completed_record = MaintenanceRecord.objects.create(
        asset=completed_asset,
        technician=technician,
        maintenance_type=MaintenanceRecord.MaintenanceType.CALIBRATION,
        priority=MaintenanceRecord.Priority.LOW,
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 2),
    )

    cases = (
        ("status=in_progress", [maintenance_record.maintenance_id]),
        ("status=completed", [completed_record.maintenance_id]),
        ("maintenance_type=Repair", [maintenance_record.maintenance_id]),
        ("priority=Low", [completed_record.maintenance_id]),
        ("asset_identifier=maint-002", [completed_record.maintenance_id]),
        (f"asset_id={completed_asset.asset_id}", [completed_record.maintenance_id]),
    )
    for query, expected_ids in cases:
        response = authenticated_client.get(f"/api/maintenance-records/?{query}")

        assert response.status_code == 200
        assert [row["maintenance_id"] for row in response.data["results"]] == expected_ids


def test_list_rejects_invalid_filters(authenticated_client):
    for query in (
        "status=scheduled",
        "maintenance_type=Other",
        "priority=Critical",
        "asset_id=not-a-number",
    ):
        response = authenticated_client.get(f"/api/maintenance-records/?{query}")

        assert response.status_code == 400


def test_asset_history_includes_active_and_completed_records(
    authenticated_client, maintenance_record, inventory_type, technician
):
    MaintenanceRecord.objects.create(
        asset=maintenance_record.asset,
        technician=technician,
        maintenance_type=MaintenanceRecord.MaintenanceType.CLEANING,
        priority=MaintenanceRecord.Priority.MEDIUM,
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 2),
    )

    response = authenticated_client.get(
        f"/api/maintenance-records/?asset_id={maintenance_record.asset_id}"
    )

    assert response.status_code == 200
    assert response.data["count"] == 2
    assert {row["status"] for row in response.data["results"]} == {
        "In Progress",
        "Completed",
    }


def test_missing_record_returns_not_found(authenticated_client):
    response = authenticated_client.get("/api/maintenance-records/9999/")

    assert response.status_code == 404
