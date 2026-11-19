from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime
from threading import Barrier
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.db import close_old_connections
from django.test import override_settings
from rest_framework.test import APIClient

from inventory.models import Asset, Category, EquipmentType

from .models import Borrower, Loan
from .services import extend_loan


@pytest.fixture
def extension_data(db):
    category = Category.objects.create(name="Extension tools")
    equipment_type = EquipmentType.objects.create(category=category, name="Meters")
    asset = Asset.objects.create(
        type=equipment_type, name="Multimeter", asset_identifier="EXT-001",
        status=Asset.Status.ON_LOAN,
    )
    borrower = Borrower.objects.create(first_name="Ada", last_name="Lovelace", unb_id="EXT-UNB")
    loan = Loan.objects.create(
        asset=asset, borrower=borrower, checkout_date=date(2026, 11, 1),
        expected_return_date=date(2026, 11, 16),
    )
    user = get_user_model().objects.create_user(username="extension-tech", role="TECHNICIAN")
    client = APIClient()
    client.force_login(user)
    with patch("django.utils.timezone.now", return_value=datetime(2026, 11, 16, 12, tzinfo=UTC)):
        yield SimpleNamespace(loan=loan, user=user, client=client, url=f"/api/loans/{loan.pk}/")


def patch_date(data, expected_return_date="2026-11-20", **extra):
    return data.client.patch(data.url, {
        "expected_return_date": expected_return_date, **extra,
    }, format="json")


def assert_original_loan(data):
    assert Loan.objects.get(pk=data.loan.pk).expected_return_date == date(2026, 11, 16)


@pytest.mark.parametrize("role", ["TECHNICIAN", "ADMINISTRATOR"])
def test_extension_success_response_and_history_unchanged(extension_data, role):
    data = extension_data
    data.user.role = role
    data.user.save(update_fields=["role"])
    before = Loan.objects.values().get(pk=data.loan.pk)
    asset_before = Asset.objects.values().get(pk=data.loan.asset_id)
    borrower_before = Borrower.objects.values().get(pk=data.loan.borrower_id)
    response = patch_date(data)
    assert response.status_code == 200
    assert response.data == {
        "loan_id": data.loan.pk, "asset_id": data.loan.asset_id,
        "asset_identifier": "EXT-001", "equipment_name": "Multimeter",
        "borrower_id": data.loan.borrower_id, "borrower_unb_id": "EXT-UNB",
        "borrower_name": "Ada Lovelace", "checkout_date": "2026-11-01",
        "expected_return_date": "2026-11-20", "actual_return_date": None,
        "return_condition": None, "status": "on_loan",
    }
    assert Loan.objects.values().get(pk=data.loan.pk) == {
        **before, "expected_return_date": date(2026, 11, 20),
    }
    assert Asset.objects.values().get(pk=data.loan.asset_id) == asset_before
    assert Borrower.objects.values().get(pk=data.loan.borrower_id) == borrower_before
    listing = data.client.get("/api/loans/", {"search": "ext-001", "status": "on_loan"})
    assert listing.status_code == 200
    assert listing.data == [response.data]
    assert data.client.get("/api/loans/", {"status": "overdue"}).data == []


@pytest.mark.parametrize("kind", ["FACULTY", "anonymous", "inactive", "unsupported"])
def test_extension_permissions(extension_data, kind):
    data = extension_data
    if kind == "anonymous":
        data.client = APIClient()
    elif kind == "unsupported":
        data.client.force_authenticate(user=SimpleNamespace(
            is_authenticated=True, is_active=True, role="UNKNOWN"
        ))
    else:
        data.user.role = "FACULTY" if kind == "FACULTY" else "TECHNICIAN"
        data.user.is_active = kind != "inactive"
        data.user.save()
    assert patch_date(data).status_code == 403
    assert_original_loan(data)


def test_extension_missing_loan(extension_data):
    extension_data.url = "/api/loans/999999/"
    assert patch_date(extension_data).status_code == 404
    assert_original_loan(extension_data)


@pytest.mark.parametrize("condition", ["Intact", "Damaged"])
def test_extension_returned_loan_rejected(extension_data, condition):
    data = extension_data
    Loan.objects.filter(pk=data.loan.pk).update(
        actual_return_date=date(2026, 11, 16), return_condition=condition
    )
    before = Loan.objects.values().get(pk=data.loan.pk)
    response = patch_date(data)
    assert response.status_code == 400
    assert "Returned" in str(response.data)
    assert Loan.objects.values().get(pk=data.loan.pk) == before

@pytest.mark.parametrize("new_date", [
    "2026-11-17",
    "2026-11-20",
    "2026-12-01",
])
def test_extension_allows_only_later_dates(extension_data, new_date):
    data = extension_data
    response = patch_date(data, new_date)

    assert response.status_code == 200
    assert response.data["status"] == "on_loan"
    assert response.data["expected_return_date"] == new_date

    data.loan.refresh_from_db()
    assert data.loan.expected_return_date.isoformat() == new_date
    assert data.loan.checkout_date == date(2026, 11, 1)


@pytest.mark.parametrize("new_date", [
    "2026-11-01",
    "2026-11-10",
    "2026-11-15",
    "2026-11-16",
])
def test_extension_rejects_same_or_earlier_dates(extension_data, new_date):
    response = patch_date(extension_data, new_date)

    assert response.status_code == 400
    assert "expected_return_date" in response.data
    assert_original_loan(extension_data)


def test_extension_rejects_overdue_loan(extension_data):
    data = extension_data
    Loan.objects.filter(pk=data.loan.pk).update(
        expected_return_date=date(2026, 11, 15)
    )

    response = patch_date(data, "2026-11-20")

    assert response.status_code == 400
    assert "Overdue" in str(response.data)
    assert Loan.objects.get(pk=data.loan.pk).expected_return_date == date(2026, 11, 15)


@pytest.mark.parametrize("value", ["2026-10-31", "not-a-date", "2026-02-30", "", None])
def test_extension_invalid_date_unchanged(extension_data, value):
    response = patch_date(extension_data, value)
    assert response.status_code == 400
    assert "expected_return_date" in response.data
    assert_original_loan(extension_data)


def test_extension_requires_date_even_for_patch(extension_data):
    response = extension_data.client.patch(extension_data.url, {}, format="json")
    assert response.status_code == 400
    assert "expected_return_date" in response.data
    assert_original_loan(extension_data)


@pytest.mark.parametrize("field,value", [
    ("asset", 999), ("asset_id", 999), ("borrower", 999), ("borrower_id", 999),
    ("checkout_date", "2020-01-01"), ("actual_return_date", "2026-11-16"),
    ("return_condition", "Intact"), ("status", "returned"), ("loan_id", 999),
    ("extra", "unexpected"),
])
def test_extension_rejects_unknown_and_protected_fields(extension_data, field, value):
    response = patch_date(extension_data, **{field: value})
    assert response.status_code == 400
    assert field in response.data
    assert_original_loan(extension_data)


@pytest.mark.parametrize("method", ["put", "post", "delete", "get"])
def test_extension_detail_unsupported_methods(extension_data, method):
    response = getattr(extension_data.client, method)(extension_data.url)
    assert response.status_code == 405
    assert_original_loan(extension_data)


def test_extension_session_csrf_enforced(extension_data):
    data = extension_data
    data.client = APIClient(enforce_csrf_checks=True)
    data.client.force_login(data.user)
    assert patch_date(data).status_code == 403
    assert_original_loan(data)
    token = data.client.get("/api/auth/csrf/").data["csrfToken"]
    response = data.client.patch(data.url, {"expected_return_date": "2026-11-20"},
                                 format="json", HTTP_X_CSRFTOKEN=token)
    assert response.status_code == 200


def test_extension_status_uses_localdate(extension_data):
    with (
        override_settings(TIME_ZONE="America/Moncton"),
        patch("django.utils.timezone.now", return_value=datetime(2026, 11, 17, 1, tzinfo=UTC)),
    ):
        response = patch_date(extension_data, "2026-11-17")
        assert response.status_code == 200
        assert response.data["status"] == "on_loan"


def test_extension_rolls_back_failed_save(extension_data):
    original_save = Loan.save

    def fail_after_save(instance, *args, **kwargs):
        assert kwargs["update_fields"] == ["expected_return_date"]
        original_save(instance, *args, **kwargs)
        raise RuntimeError("Simulated failure after saving")

    with patch.object(Loan, "save", fail_after_save), pytest.raises(RuntimeError):
        extend_loan(loan_id=extension_data.loan.pk, expected_return_date=date(2026, 11, 20))
    assert_original_loan(extension_data)


@pytest.mark.django_db(transaction=True)
def test_concurrent_extensions_preserve_loan_history(extension_data):
    data = extension_data
    before = Loan.objects.values().get(pk=data.loan.pk)
    barrier = Barrier(2)

    def update(new_date):
        close_old_connections()
        try:
            client = APIClient()
            client.force_authenticate(user=data.user)
            barrier.wait(timeout=10)
            return client.patch(data.url, {"expected_return_date": new_date}, format="json")
        finally:
            close_old_connections()

        dates = ["2026-11-20", "2026-11-21"]

        with ThreadPoolExecutor(max_workers=2) as executor:
            responses = list(executor.map(update, dates))

        assert responses[1].status_code == 200
        assert responses[0].status_code in (200, 400)

        after = Loan.objects.values().get(pk=data.loan.pk)

        assert after["expected_return_date"] == date(2026, 11, 21)
        assert {
            **after,
            "expected_return_date": before["expected_return_date"],
        } == before