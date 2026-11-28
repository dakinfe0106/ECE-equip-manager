from datetime import date
from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from openpyxl import load_workbook
from rest_framework.test import APIClient

from .exports import INVENTORY_HEADERS
from .models import Asset, Category, EquipmentType

EXPORT_URL = "/api/assets/export/"
EXCEL_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def client_for(role, username="export-user"):
    user = get_user_model().objects.create_user(username=username, role=role)
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def sheet_rows(response):
    workbook = load_workbook(BytesIO(response.content), read_only=True)
    sheet = workbook["Inventory"]
    return [tuple(cell for cell in row) for row in sheet.iter_rows(values_only=True)]


@pytest.fixture
def equipment_type(db):
    category = Category.objects.create(name="Test Equipment")
    return EquipmentType.objects.create(category=category, name="Oscilloscopes")


def test_inventory_export_requires_authentication(db):
    assert APIClient().get(EXPORT_URL).status_code == 403


def test_inventory_export_rejects_faculty(db):
    assert client_for("FACULTY").get(EXPORT_URL).status_code == 403


def test_inventory_export_rejects_inactive_staff(db):
    user = get_user_model().objects.create_user(
        username="inactive-tech", role="TECHNICIAN", is_active=False
    )
    client = APIClient()
    client.force_authenticate(user=user)

    assert client.get(EXPORT_URL).status_code == 403


@pytest.mark.parametrize("role", ["TECHNICIAN", "ADMINISTRATOR"])
def test_inventory_export_downloads_workbook_for_staff(db, role):
    response = client_for(role).get(EXPORT_URL)

    assert response.status_code == 200
    assert response["Content-Type"].startswith(EXCEL_TYPE)
    assert 'filename="ems-inventory-' in response["Content-Disposition"]
    assert response["Cache-Control"] == "no-store"
    assert sheet_rows(response) == [INVENTORY_HEADERS]


def test_inventory_export_rows_match_active_assets(equipment_type):
    Asset.objects.create(
        type=equipment_type,
        asset_identifier="OSC-002",
        name="Bench scope",
        status=Asset.Status.RETIRED,
    )
    Asset.objects.create(
        type=equipment_type,
        asset_identifier="OSC-001",
        name="Portable scope",
        acquisition_date=date(2024, 3, 15),
        status=Asset.Status.ON_LOAN,
    )

    rows = sheet_rows(client_for("TECHNICIAN").get(EXPORT_URL))

    assert rows[1][0] == "OSC-001"
    assert rows[1][1:4] == ("Portable scope", "Test Equipment", "Oscilloscopes")
    assert rows[1][4].date() == date(2024, 3, 15)
    assert rows[1][5] == "On loan"
    assert rows[2] == (
        "OSC-002",
        "Bench scope",
        "Test Equipment",
        "Oscilloscopes",
        None,
        "Retired",
    )
    assert len(rows) == 3


def test_inventory_export_excludes_archived_assets_types_and_categories(
    equipment_type,
):
    Asset.objects.create(type=equipment_type, asset_identifier="KEEP-1", name="Kept")
    Asset.objects.create(
        type=equipment_type,
        asset_identifier="GONE-1",
        name="Archived asset",
        is_deleted=True,
    )
    archived_type = EquipmentType.objects.create(
        category=equipment_type.category, name="Old probes", is_deleted=True
    )
    Asset.objects.create(type=archived_type, asset_identifier="GONE-2", name="Probe")
    archived_category = Category.objects.create(name="Old stock", is_deleted=True)
    old_type = EquipmentType.objects.create(category=archived_category, name="Meters")
    Asset.objects.create(type=old_type, asset_identifier="GONE-3", name="Meter")

    rows = sheet_rows(client_for("TECHNICIAN").get(EXPORT_URL))

    assert [row[0] for row in rows[1:]] == ["KEEP-1"]


def test_inventory_export_writes_formula_like_text_literally(equipment_type):
    Asset.objects.create(
        type=equipment_type,
        asset_identifier="FX-1",
        name="=HYPERLINK(\"http://example.com\")",
    )

    rows = sheet_rows(client_for("TECHNICIAN").get(EXPORT_URL))

    assert rows[1][1] == "'=HYPERLINK(\"http://example.com\")"
