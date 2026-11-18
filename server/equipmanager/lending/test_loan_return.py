from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from threading import Barrier
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.db import close_old_connections
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from inventory.models import Asset, Category, EquipmentType
from maintenance.models import MaintenanceRecord

from .models import Borrower, DamageFlag, Loan


@pytest.fixture
def loan(db):
    category = Category.objects.create(name="Return tools")
    equipment_type = EquipmentType.objects.create(name="Meter", category=category)
    asset = Asset.objects.create(
        name="Multimeter",
        type=equipment_type,
        asset_identifier="RETURN-001",
        status=Asset.Status.ON_LOAN,
    )
    borrower = Borrower.objects.create(
        unb_id="UNB-RETURN",
        first_name="Ada",
        last_name="Lovelace",
        negligent_damage_flag=True,
    )
    return Loan.objects.create(
        asset=asset,
        borrower=borrower,
        checkout_date=timezone.localdate() - timedelta(days=4),
        expected_return_date=timezone.localdate() - timedelta(days=2),
    )


@pytest.fixture
def technician(db):
    return get_user_model().objects.create_user(
        username="return-tech", role="TECHNICIAN"
    )


@pytest.fixture
def client(technician):
    client = APIClient()
    client.force_authenticate(technician)
    return client


def post_return(client, loan, **changes):
    data = {
        "actual_return_date": loan.checkout_date.isoformat(),
        "return_condition": "Intact",
    }
    return client.post(
        reverse("loan-return", args=[loan.pk]), {**data, **changes}, format="json"
    )


def assert_open(loan):
    loan.refresh_from_db()
    assert loan.actual_return_date is None
    assert loan.return_condition is None
    assert loan.asset.status == Asset.Status.ON_LOAN


@pytest.mark.parametrize(
    ("role", "condition", "asset_status", "maintenance_required"),
    [
        ("TECHNICIAN", "Intact", Asset.Status.AVAILABLE, False),
        ("ADMINISTRATOR", "Damaged", Asset.Status.UNDER_MAINTENANCE, True),
    ],
)
def test_return_persists_history_and_asset_status(
    loan, client, role, condition, asset_status, maintenance_required
):
    user = get_user_model().objects.create_user(username="return-user", role=role)
    client.force_authenticate(user)
    history = (
        loan.checkout_date,
        loan.expected_return_date,
        loan.borrower_id,
        loan.asset_id,
    )
    return_date = (
        loan.checkout_date
        if condition == "Intact"
        else loan.checkout_date + timedelta(days=1)
    )
    response = post_return(
        client,
        loan,
        return_condition=condition,
        actual_return_date=return_date.isoformat(),
    )

    assert response.status_code == 200
    assert response.data["maintenance_required"] is maintenance_required
    assert response.data["loan"]["status"] == "returned"
    loan.refresh_from_db()
    assert loan.actual_return_date == return_date
    assert loan.return_condition == condition
    assert (
        loan.checkout_date,
        loan.expected_return_date,
        loan.borrower_id,
        loan.asset_id,
    ) == history
    assert loan.asset.status == asset_status
    assert loan.borrower.negligent_damage_flag is True
    assert not DamageFlag.objects.exists()
    assert not MaintenanceRecord.objects.exists()

    for status in ("on_loan", "overdue", "returned"):
        listing = client.get(reverse("loan-list"), {"status": status})
        assert listing.status_code == 200
        assert listing.data == ([response.data["loan"]] if status == "returned" else [])


@pytest.mark.parametrize(
    ("role", "active"),
    [
        ("FACULTY", True),
        ("UNSUPPORTED", True),
        ("TECHNICIAN", False),
        (None, False),
    ],
)
def test_return_requires_active_loan_write_role(loan, role, active):
    client = APIClient()
    if role == "UNSUPPORTED":
        client.force_authenticate(
            SimpleNamespace(is_authenticated=True, is_active=active, role=role)
        )
    elif role:
        user = get_user_model().objects.create_user(
            username="denied-user", role=role, is_active=active
        )
        client.force_authenticate(user)
    assert post_return(client, loan).status_code == 403
    assert_open(loan)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("actual_return_date", None),
        ("return_condition", None),
        ("actual_return_date", "invalid"),
        ("actual_return_date", "2000-01-01"),
        ("actual_return_date", "2026-1-1"),
        ("return_condition", "damaged"),
        ("loan_id", 1),
        ("borrower", 1),
        ("asset", 1),
        ("checkout_date", "2026-01-01"),
        ("expected_return_date", "2026-01-01"),
        ("status", "returned"),
    ],
)
def test_invalid_input_leaves_loan_open(loan, client, field, value):
    data = {
        "actual_return_date": loan.checkout_date.isoformat(),
        "return_condition": "Intact",
    }
    if value is None:
        del data[field]
    else:
        data[field] = value
    response = client.post(reverse("loan-return", args=[loan.pk]), data, format="json")
    assert response.status_code == 400
    assert field in response.data
    assert_open(loan)


def test_missing_and_duplicate_returns(loan, client):
    response = client.post(
        reverse("loan-return", args=[loan.pk + 1]),
        {
            "actual_return_date": loan.checkout_date.isoformat(),
            "return_condition": "Damaged",
        },
        format="json",
    )
    assert response.status_code == 404
    assert post_return(client, loan, return_condition="Damaged").status_code == 200
    response = post_return(
        client, loan, actual_return_date=loan.expected_return_date.isoformat()
    )
    assert response.status_code == 400
    loan.refresh_from_db()
    assert loan.actual_return_date == loan.checkout_date
    assert loan.return_condition == "Damaged"
    assert loan.asset.status == Asset.Status.UNDER_MAINTENANCE


def test_failed_asset_save_rolls_back_both_writes(loan, client):
    save = Asset.save

    def fail_after_save(asset, *args, **kwargs):
        save(asset, *args, **kwargs)
        raise RuntimeError("Asset save failed")

    with (
        patch.object(Asset, "save", fail_after_save),
        pytest.raises(RuntimeError, match="Asset save failed"),
    ):
        post_return(client, loan)
    assert_open(loan)


@pytest.mark.django_db(transaction=True)
def test_concurrent_returns_only_one_succeeds(loan, technician):
    ready = Barrier(2)

    def attempt(condition):
        try:
            client = APIClient()
            client.force_authenticate(technician)
            ready.wait(timeout=10)
            return condition, post_return(
                client, loan, return_condition=condition
            ).status_code
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(attempt, ("Intact", "Damaged")))
    assert sorted(status for _, status in results) == [200, 400]
    condition = next(condition for condition, status in results if status == 200)
    loan.refresh_from_db()
    assert loan.return_condition == condition
    assert loan.actual_return_date == loan.checkout_date
    assert (
        loan.asset.status
        == {
            "Intact": Asset.Status.AVAILABLE,
            "Damaged": Asset.Status.UNDER_MAINTENANCE,
        }[condition]
    )


def test_damaged_return_hands_off_to_maintenance(loan, client, technician):
    assert post_return(client, loan, return_condition="Damaged").status_code == 200
    checkout = client.post(
        reverse("loan-list"),
        {
            "asset_id": loan.asset_id,
            "borrower_id": loan.borrower_id,
            "expected_return_date": timezone.localdate().isoformat(),
        },
        format="json",
    )
    assert checkout.status_code == 400
    assert "asset_id" in checkout.data
    payload = {
        "asset_id": loan.asset_id,
        "technician_id": technician.pk,
        "maintenance_type": "Repair",
        "priority": "High",
        "start_date": timezone.localdate().isoformat(),
    }
    first = client.post("/api/maintenance-records/", payload, format="json")
    assert first.status_code == 201
    assert first.data["asset"]["status"] == Asset.Status.UNDER_MAINTENANCE
    second = client.post("/api/maintenance-records/", payload, format="json")
    assert second.status_code == 400
    assert (
        MaintenanceRecord.objects.filter(
            asset_id=loan.asset_id, end_date__isnull=True
        ).count()
        == 1
    )


@pytest.mark.parametrize(
    "status", [Asset.Status.AVAILABLE, Asset.Status.UNDER_MAINTENANCE]
)
def test_maintenance_rejects_active_loan_even_with_damaged_history(
    loan, client, technician, status
):
    Loan.objects.create(
        asset_id=loan.asset_id,
        borrower_id=loan.borrower_id,
        checkout_date=date(2024, 1, 1),
        expected_return_date=date(2024, 1, 2),
        actual_return_date=date(2024, 1, 2),
        return_condition="Damaged",
    )
    Asset.objects.filter(pk=loan.asset_id).update(status=status)
    response = client.post(
        "/api/maintenance-records/",
        {
            "asset_id": loan.asset_id,
            "technician_id": technician.pk,
            "maintenance_type": "Repair",
            "priority": "High",
            "start_date": timezone.localdate().isoformat(),
        },
        format="json",
    )
    assert response.status_code == 400
    assert not MaintenanceRecord.objects.exists()


def test_earlier_damaged_return_does_not_qualify_latest_intact_loan(
    loan, client, technician
):
    assert post_return(client, loan, return_condition="Damaged").status_code == 200
    Loan.objects.create(
        asset_id=loan.asset_id,
        borrower_id=loan.borrower_id,
        checkout_date=loan.expected_return_date,
        expected_return_date=loan.expected_return_date,
        actual_return_date=loan.expected_return_date,
        return_condition="Intact",
    )
    response = client.post(
        "/api/maintenance-records/",
        {
            "asset_id": loan.asset_id,
            "technician_id": technician.pk,
            "maintenance_type": "Repair",
            "priority": "High",
            "start_date": timezone.localdate().isoformat(),
        },
        format="json",
    )
    assert response.status_code == 400
    assert not MaintenanceRecord.objects.exists()
