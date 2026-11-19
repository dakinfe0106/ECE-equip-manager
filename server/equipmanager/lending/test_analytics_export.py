from datetime import UTC, datetime
from io import BytesIO
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from openpyxl import load_workbook
from rest_framework.test import APIClient

from . import test_analytics as analytics_fixtures

# Register the same isolated analytics fixtures without changing other apps' fixtures.
client = analytics_fixtures.client
records = analytics_fixtures.records

pytestmark = pytest.mark.django_db
GENERATED_AT = datetime(2025, 2, 11, 12, tzinfo=UTC)
REPORTS = ["availability", "utilization", "borrowing", "borrowers"]


def export(client, **params):
    with patch(
        "lending.analytics_export.timezone.localtime", return_value=GENERATED_AT
    ):
        return client.get("/api/analytics/exports/", params)


def workbook(response):
    assert response.status_code == 200
    assert (
        response["Content-Type"]
        == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    return load_workbook(BytesIO(response.content), data_only=False)


def test_selected_sheets_match_the_reporting_api(client, records):
    category, equipment_type, _ = records
    params = {
        "category_id": category.pk,
        "equipment_type_id": equipment_type.pk,
        "year": 2025,
    }
    response = export(client, reports=REPORTS, scope="current", **params)
    book = workbook(response)
    assert book.sheetnames == [
        "Export details",
        "Equipment Availability",
        "Equipment Utilization",
        "Borrowing Activity",
        "Borrower Activity",
    ]
    with patch("lending.analytics.timezone.localtime", return_value=GENERATED_AT):
        availability = client.get("/api/analytics/availability-summary/", params).json()["rows"]
        for report, name in zip(REPORTS[1:], book.sheetnames[2:], strict=True):
            data = client.get(
                "/api/analytics/lending/", dict(params, report=report)
            ).json()
            assert list(book[name].values)[1:] == [
                (row["label"], row["value"]) for row in data["rows"]
            ]
    assert list(book["Equipment Availability"].values)[1:] == [
        tuple(
            row[key]
            for key in (
                "label",
                "available",
                "on_loan",
                "under_maintenance",
                "retired",
                "total",
            )
        )
        for row in availability
    ]
    metadata = dict(list(book["Export details"].values)[1:])
    assert metadata["Transactions"] == 2
    assert metadata["Total loan days"] == 20
    assert metadata["Average duration (days)"] == 10
    assert metadata["Overdue rate (%)"] == 100
    assert metadata["Checkout year"] == 2025
    assert metadata["Business date"] == "2025-02-11"
    assert metadata["Category"] == f"Meters (ID {category.pk})"
    assert response["Cache-Control"] == "no-store"
    assert (
        response["Content-Disposition"]
        == 'attachment; filename="ems-analytics-2025-02-11.xlsx"'
    )


def test_all_data_ignores_filters_and_includes_all_years(client, records):
    response = export(
        client,
        reports=["utilization"],
        scope="all",
        year=1900,
        category_id=2147483647,
        equipment_type_id=2147483647,
    )
    book = workbook(response)
    assert book.sheetnames == ["Export details", "Equipment Utilization"]
    assert list(book["Equipment Utilization"].values)[1:] == [("Meters / Digital", 24)]
    metadata = dict(list(book["Export details"].values)[1:])
    assert metadata["Scope"] == "All data"
    assert metadata["Category"] == "All"
    assert metadata["Equipment type"] == "All"
    assert metadata["Checkout year"] == "All years"
    assert metadata["Transactions"] == 3


def test_availability_stays_current_for_an_empty_historical_year(client, records):
    book = workbook(export(client, reports=["availability", "utilization"], year=1900))
    assert list(book["Equipment Availability"].values)[1:] == [
        ("Meters / Digital", 3, 0, 0, 0, 3)
    ]
    assert list(book["Equipment Utilization"].values) == [
        ("Equipment type", "Loan days")
    ]
    metadata = dict(list(book["Export details"].values)[1:])
    assert metadata["Equipment Utilization"] == "No data matches this scope."
    assert metadata["Transactions"] == 0


def test_archived_loans_are_retained_and_spreadsheet_text_is_literal(client, records):
    category, _, _ = records
    category.name = "=1+1"
    category.is_deleted = True
    category.save()
    book = workbook(export(client, reports=["availability", "utilization"], year=2025))
    assert list(book["Equipment Availability"].values) == [
        (
            "Equipment type",
            "Available",
            "On loan",
            "Under maintenance",
            "Retired",
            "Total",
        )
    ]
    cell = book["Equipment Utilization"]["A2"]
    assert cell.value == "=1+1 / Digital"
    assert cell.data_type == "s"
    assert not any(
        cell.data_type == "f" for sheet in book for row in sheet for cell in row
    )


@pytest.mark.parametrize(
    "params",
    [
        {},
        {"reports": []},
        {"reports": ["unknown"]},
        {"reports": ["availability", "availability"]},
        {"reports": REPORTS + ["borrowing"]},
        {"reports": ["availability"], "scope": "unknown"},
        {"reports": ["availability"], "year": 0},
        {"reports": ["availability"], "category_id": "bad"},
    ],
)
def test_invalid_export_selections_return_400(client, params):
    assert export(client, **params).status_code == 400


@pytest.mark.parametrize("role", ["TECHNICIAN", "FACULTY", "ADMINISTRATOR"])
def test_exports_preserve_role_permissions_and_borrower_privacy(role, records):
    client = APIClient()
    user = get_user_model()(role=role, is_active=True)
    client.force_authenticate(user)
    book = workbook(export(client, reports=["borrowers"], year=2025))
    assert list(book["Borrower Activity"].values)[1:] == [
        ("1 loan", 0),
        ("2–5 loans", 1),
        ("6–10 loans", 0),
        ("11+ loans", 0),
    ]
    values = str([list(sheet.values) for sheet in book])
    assert "TEST-ONLY" not in values
    assert "Synthetic" not in values
    assert "borrower_id" not in values


def test_export_requires_an_active_session_and_is_read_only(client):
    url = "/api/analytics/exports/"
    assert APIClient().get(url, {"reports": ["availability"]}).status_code == 403
    assert client.post(url, {}, format="json").status_code == 405
    user = get_user_model()(role="FACULTY", is_active=False)
    client.force_authenticate(user)
    assert client.get(url, {"reports": ["availability"]}).status_code == 403
