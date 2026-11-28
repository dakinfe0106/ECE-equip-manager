from datetime import date
from io import BytesIO
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from openpyxl import load_workbook
from rest_framework.test import APIClient

from inventory.models import Asset, Category, EquipmentType

from .exports import LENDING_HEADERS
from .models import Borrower, Loan

EXPORT_URL = "/api/loans/export/"
EXCEL_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
TODAY = date(2025, 3, 10)


def client_for(role, username="export-user"):
    user = get_user_model().objects.create_user(username=username, role=role)
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def export_rows(client):
    with patch("lending.exports.timezone.localdate", return_value=TODAY):
        response = client.get(EXPORT_URL)
    assert response.status_code == 200
    workbook = load_workbook(BytesIO(response.content), read_only=True)
    rows = list(workbook["Lending Records"].iter_rows(values_only=True))
    # openpyxl reads dates back as datetimes; compare them as dates.
    return [
        tuple(value.date() if hasattr(value, "date") else value for value in row)
        for row in rows
    ]


@pytest.fixture
def asset(db):
    category = Category.objects.create(name="Test Equipment")
    equipment_type = EquipmentType.objects.create(category=category, name="Meters")
    return Asset.objects.create(
        type=equipment_type, asset_identifier="MTR-001", name="Multimeter"
    )


@pytest.fixture
def borrower(db):
    return Borrower.objects.create(
        first_name="Ada", last_name="Lovelace", unb_id="UNB-001"
    )


def test_lending_export_requires_authentication(db):
    assert APIClient().get(EXPORT_URL).status_code == 403


def test_lending_export_rejects_faculty(db):
    assert client_for("FACULTY").get(EXPORT_URL).status_code == 403


@pytest.mark.parametrize("role", ["TECHNICIAN", "ADMINISTRATOR"])
def test_lending_export_downloads_workbook_for_staff(db, role):
    response = client_for(role).get(EXPORT_URL)

    assert response.status_code == 200
    assert response["Content-Type"].startswith(EXCEL_TYPE)
    assert 'filename="ems-lending-records-' in response["Content-Disposition"]
    assert response["Cache-Control"] == "no-store"
    workbook = load_workbook(BytesIO(response.content), read_only=True)
    rows = list(workbook["Lending Records"].iter_rows(values_only=True))
    assert rows == [LENDING_HEADERS]


def test_lending_export_rows_distinguish_active_overdue_and_completed(
    asset, borrower
):
    completed = Loan.objects.create(
        asset=asset,
        borrower=borrower,
        checkout_date=date(2025, 1, 6),
        expected_return_date=date(2025, 1, 13),
        actual_return_date=date(2025, 1, 12),
        return_condition=Loan.ReturnCondition.DAMAGED,
    )
    overdue = Loan.objects.create(
        asset=asset,
        borrower=borrower,
        checkout_date=date(2025, 2, 3),
        expected_return_date=date(2025, 3, 9),
    )
    # Only one open loan is allowed per asset.
    second_asset = Asset.objects.create(
        type=asset.type, asset_identifier="MTR-002", name="Clamp meter"
    )
    active = Loan.objects.create(
        asset=second_asset,
        borrower=borrower,
        checkout_date=date(2025, 3, 3),
        expected_return_date=TODAY,
    )

    rows = export_rows(client_for("TECHNICIAN"))

    assert rows[1:] == [
        (
            active.loan_id,
            "MTR-002",
            "Clamp meter",
            "UNB-001",
            "Ada Lovelace",
            date(2025, 3, 3),
            TODAY,
            None,
            None,
            "Active",
        ),
        (
            overdue.loan_id,
            "MTR-001",
            "Multimeter",
            "UNB-001",
            "Ada Lovelace",
            date(2025, 2, 3),
            date(2025, 3, 9),
            None,
            None,
            "Overdue",
        ),
        (
            completed.loan_id,
            "MTR-001",
            "Multimeter",
            "UNB-001",
            "Ada Lovelace",
            date(2025, 1, 6),
            date(2025, 1, 13),
            date(2025, 1, 12),
            "Damaged",
            "Completed",
        ),
    ]


def test_lending_export_keeps_history_for_archived_asset_and_borrower(
    asset, borrower
):
    Loan.objects.create(
        asset=asset,
        borrower=borrower,
        checkout_date=date(2025, 1, 6),
        expected_return_date=date(2025, 1, 13),
        actual_return_date=date(2025, 1, 13),
        return_condition=Loan.ReturnCondition.INTACT,
    )
    Asset.objects.filter(pk=asset.pk).update(is_deleted=True)
    Borrower.objects.filter(pk=borrower.pk).update(is_deleted=True)

    rows = export_rows(client_for("ADMINISTRATOR"))

    assert len(rows) == 2
    assert rows[1][1] == "MTR-001"
    assert rows[1][4] == "Ada Lovelace"


def test_lending_export_omits_blank_last_name(asset):
    single_name = Borrower.objects.create(first_name="Grace", unb_id="UNB-002")
    Loan.objects.create(
        asset=asset,
        borrower=single_name,
        checkout_date=date(2025, 3, 3),
        expected_return_date=date(2025, 3, 17),
    )

    rows = export_rows(client_for("TECHNICIAN"))

    assert rows[1][4] == "Grace"
