from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime, timedelta
from threading import Barrier, Event
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, close_old_connections, connection, transaction
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from inventory.models import Asset, Category, EquipmentType

from .models import Borrower, DamageFlag, Loan
from .services import checkout_asset, resolve_damage_flag


@pytest.fixture
def checkout_data(db):
    category = Category.objects.create(name="Checkout tools")
    equipment_type = EquipmentType.objects.create(category=category, name="Meters")
    asset = Asset.objects.create(
        type=equipment_type, asset_identifier="METER-001", name="Multimeter"
    )
    borrower = Borrower.objects.create(first_name="Ada", last_name="Lovelace", unb_id="UNB-113")
    technician = get_user_model().objects.create_user(username="checkout-tech", role="TECHNICIAN")
    client = APIClient()
    client.force_login(technician)
    with patch("django.utils.timezone.now", return_value=datetime(2026, 11, 15, 12, tzinfo=UTC)):
        yield SimpleNamespace(
            asset=asset, borrower=borrower, technician=technician, client=client,
            today=date(2026, 11, 15),
            payload={"asset_id": asset.pk, "borrower_id": borrower.pk,
                     "expected_return_date": "2026-11-16"},
        )


def post_checkout(data, **changes):
    return data.client.post("/api/loans/", {**data.payload, **changes}, format="json")


def assert_no_checkout(data):
    assert not Loan.objects.filter(asset=data.asset).exists()
    data.asset.refresh_from_db()
    assert data.asset.status == Asset.Status.AVAILABLE


@pytest.mark.parametrize("role", ["TECHNICIAN", "ADMINISTRATOR"])
def test_checkout_success_and_get_regression(checkout_data, role):
    data = checkout_data
    data.technician.role = role
    data.technician.save(update_fields=["role"])
    response = post_checkout(data)
    assert response.status_code == 201
    loan = Loan.objects.get()
    assert loan.checkout_date == data.today
    assert loan.expected_return_date == date(2026, 11, 16)
    data.asset.refresh_from_db()
    assert data.asset.status == Asset.Status.ON_LOAN
    assert response.data == {
        "loan_id": loan.pk, "asset_id": data.asset.pk,
        "asset_identifier": "METER-001", "equipment_name": "Multimeter",
        "borrower_id": data.borrower.pk, "borrower_unb_id": "UNB-113",
        "borrower_name": "Ada Lovelace", "checkout_date": "2026-11-15",
        "expected_return_date": "2026-11-16", "actual_return_date": None,
        "return_condition": None, "status": "on_loan",
    }
    listing = data.client.get("/api/loans/", {"status": "on_loan", "search": "meter-001"})
    assert listing.status_code == 200
    assert listing.data == [response.data]


@pytest.mark.parametrize("kind", ["faculty", "anonymous", "inactive", "unsupported"])
def test_checkout_permissions(checkout_data, kind):
    data = checkout_data
    if kind == "anonymous":
        data.client = APIClient()
    elif kind == "unsupported":
        data.client.force_authenticate(user=SimpleNamespace(
            is_authenticated=True, is_active=True, role="UNKNOWN"
        ))
    else:
        data.technician.role = "FACULTY" if kind == "faculty" else "TECHNICIAN"
        data.technician.is_active = kind != "inactive"
        data.technician.save()
    assert post_checkout(data).status_code == 403
    assert_no_checkout(data)


@pytest.mark.parametrize("field", ["asset_id", "borrower_id", "expected_return_date"])
def test_checkout_required_fields(checkout_data, field):
    payload = checkout_data.payload.copy()
    del payload[field]
    response = checkout_data.client.post("/api/loans/", payload, format="json")
    assert response.status_code == 400
    assert field in response.data
    assert_no_checkout(checkout_data)


@pytest.mark.parametrize("field,value", [
    ("expected_return_date", "not-a-date"), ("expected_return_date", "2026-02-30"),
    ("expected_return_date", "2026-11-14"), ("asset_id", 0), ("borrower_id", "abc"),
    ("asset_id", None), ("borrower_id", None),
])
def test_checkout_invalid_input(checkout_data, field, value):
    response = post_checkout(checkout_data, **{field: value})
    assert response.status_code == 400
    assert field in response.data
    assert_no_checkout(checkout_data)


@pytest.mark.parametrize("field,value", [
    ("checkout_date", "2020-01-01"), ("loan_id", 99), ("status", "returned"),
    ("actual_return_date", "2026-11-15"), ("return_condition", "Intact"),
    ("asset_status", "Available"), ("damage_eligible", True), ("extra", "ignored?"),
])
def test_checkout_rejects_extra_fields(checkout_data, field, value):
    response = post_checkout(checkout_data, **{field: value})
    assert response.status_code == 400
    assert field in response.data
    assert_no_checkout(checkout_data)


@pytest.mark.parametrize("field", ["asset_id", "borrower_id"])
def test_checkout_missing_record(checkout_data, field):
    response = post_checkout(checkout_data, **{field: 999999})
    assert response.status_code == 404
    assert_no_checkout(checkout_data)


@pytest.mark.parametrize("deleted", ["asset", "type", "category", "borrower"])
def test_checkout_rejects_soft_deletion(checkout_data, deleted):
    data = checkout_data
    obj = {"asset": data.asset, "type": data.asset.type,
           "category": data.asset.type.category, "borrower": data.borrower}[deleted]
    obj.is_deleted = True
    obj.save(update_fields=["is_deleted"])
    response = post_checkout(data)
    assert response.status_code == 400
    assert ("borrower_id" if deleted == "borrower" else "asset_id") in response.data
    assert_no_checkout(data)


@pytest.mark.parametrize("asset_status", [
    Asset.Status.ON_LOAN, Asset.Status.UNDER_MAINTENANCE, Asset.Status.RETIRED,
])
def test_checkout_rejects_unavailable_asset(checkout_data, asset_status):
    data = checkout_data
    Asset.objects.filter(pk=data.asset.pk).update(status=asset_status)
    response = post_checkout(data)
    assert response.status_code == 400
    assert "asset_id" in response.data
    assert not Loan.objects.exists()
    data.asset.refresh_from_db()
    assert data.asset.status == asset_status


@pytest.mark.parametrize("offset,returned,expected_status", [
    (-1, False, 400), (0, False, 201), (1, False, 201), (-1, True, 201),
])
def test_checkout_overdue_standing(checkout_data, offset, returned, expected_status):
    data = checkout_data
    asset = Asset.objects.create(type=data.asset.type, asset_identifier="OLDER", name="Old meter")
    # Asset status is deliberately Available: loan dates are authoritative.
    Loan.objects.create(
        asset=asset, borrower=data.borrower, checkout_date=data.today - timedelta(days=5),
        expected_return_date=data.today + timedelta(days=offset),
        actual_return_date=data.today if returned else None,
        return_condition="Intact" if returned else None,
    )
    response = post_checkout(data)
    assert response.status_code == expected_status
    if expected_status == 400:
        assert "overdue" in str(response.data)
        assert_no_checkout(data)


@pytest.mark.parametrize("count", [0, 1, 2, 3, 4])
def test_checkout_damage_threshold(checkout_data, count):
    data = checkout_data
    for index in range(count):
        DamageFlag.objects.create(
            borrower=data.borrower, asset=data.asset, incident_date=data.today,
            reason=f"Reviewed incident {index}", reviewed_by=data.technician,
            reviewed_at=timezone.now(),
        )
    response = post_checkout(data)
    assert response.status_code == (201 if count < 3 else 400)
    if count >= 3:
        assert "damage" in str(response.data)
        assert_no_checkout(data)


def test_checkout_resolved_flags_and_legacy_boolean(checkout_data):
    data = checkout_data
    for index in range(3):
        flag = DamageFlag.objects.create(
            borrower=data.borrower, asset=data.asset, incident_date=data.today,
            reason=f"Resolved incident {index}", reviewed_by=data.technician,
            reviewed_at=timezone.now(),
        )
        resolve_damage_flag(borrower_id=data.borrower.pk, damage_flag_id=flag.pk,
                            technician=data.technician, resolution_reason="Reviewed and resolved")
    data.borrower.negligent_damage_flag = True
    data.borrower.save()
    assert post_checkout(data).status_code == 201


def test_checkout_due_today_allowed(checkout_data):
    assert post_checkout(checkout_data, expected_return_date="2026-11-15").status_code == 201


def test_checkout_business_date_uses_configured_timezone(checkout_data):
    with (
        override_settings(TIME_ZONE="America/Moncton"),
        patch("django.utils.timezone.now", return_value=datetime(2026, 11, 16, 1, tzinfo=UTC)),
    ):
        response = post_checkout(checkout_data, expected_return_date="2026-11-15")
        assert response.status_code == 201
        assert response.data["checkout_date"] == "2026-11-15"
        assert response.data["status"] == "on_loan"


def test_checkout_duplicate_and_constraint(checkout_data):
    data = checkout_data
    assert post_checkout(data).status_code == 201
    assert post_checkout(data).status_code == 400
    assert Loan.objects.count() == 1
    with pytest.raises(IntegrityError), transaction.atomic():
        Loan.objects.create(asset=data.asset, borrower=data.borrower,
                            checkout_date=data.today, expected_return_date=data.today)


def test_checkout_open_loan_even_if_asset_status_inconsistent(checkout_data):
    data = checkout_data
    Loan.objects.create(asset=data.asset, borrower=data.borrower,
                        checkout_date=data.today, expected_return_date=data.today)
    response = post_checkout(data)
    assert response.status_code == 400
    assert "open loan" in str(response.data)
    assert Loan.objects.count() == 1
    data.asset.refresh_from_db()
    assert data.asset.status == Asset.Status.AVAILABLE


@pytest.mark.parametrize("constraint", ["lending_loan_one_open_loan_per_asset", "unrelated_constraint"])
def test_checkout_integrity_errors(checkout_data, constraint):
    data = checkout_data
    cause = Exception("database constraint")
    cause.diag = SimpleNamespace(constraint_name=constraint)
    error = IntegrityError("constraint failed")
    error.__cause__ = cause
    with patch("lending.services.Loan.objects.create", side_effect=error):
        if constraint == "lending_loan_one_open_loan_per_asset":
            response = post_checkout(data)
            assert response.status_code == 400
            assert "asset_id" in response.data
        else:
            with pytest.raises(IntegrityError):
                checkout_asset(asset_id=data.asset.pk, borrower_id=data.borrower.pk,
                               expected_return_date=data.today)
    assert_no_checkout(data)


def test_checkout_rolls_back_loan_and_asset_when_save_fails(checkout_data):
    data = checkout_data
    original_save = Asset.save

    def fail_after_save(instance, *args, **kwargs):
        original_save(instance, *args, **kwargs)
        raise RuntimeError("Simulated failure after status update")

    with patch.object(Asset, "save", fail_after_save), pytest.raises(RuntimeError):
        checkout_asset(asset_id=data.asset.pk, borrower_id=data.borrower.pk,
                       expected_return_date=data.today)
    assert_no_checkout(data)


def test_checkout_session_csrf_is_enforced(checkout_data):
    data = checkout_data
    data.client = APIClient(enforce_csrf_checks=True)
    data.client.force_login(data.technician)
    assert post_checkout(data).status_code == 403
    assert_no_checkout(data)
    token = data.client.get("/api/auth/csrf/").data["csrfToken"]
    response = data.client.post("/api/loans/", data.payload, format="json", HTTP_X_CSRFTOKEN=token)
    assert response.status_code == 201


@pytest.mark.django_db(transaction=True)
def test_concurrent_checkouts_only_one_succeeds(checkout_data):
    data = checkout_data
    other = Borrower.objects.create(first_name="Grace", unb_id="UNB-OTHER")
    barrier = Barrier(2)

    def checkout(borrower_id):
        close_old_connections()
        try:
            client = APIClient()
            client.force_authenticate(user=data.technician)
            barrier.wait(timeout=10)
            return client.post("/api/loans/", {
                **data.payload, "borrower_id": borrower_id,
            }, format="json").status_code
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(checkout, [data.borrower.pk, other.pk]))
    assert sorted(results) == [201, 400]
    assert Loan.objects.filter(asset=data.asset, actual_return_date__isnull=True).count() == 1
    data.asset.refresh_from_db()
    assert data.asset.status == Asset.Status.ON_LOAN


@pytest.mark.django_db(transaction=True)
def test_checkout_waits_for_damage_policy_update(checkout_data):
    data = checkout_data
    for index in range(2):
        DamageFlag.objects.create(
            borrower=data.borrower, asset=data.asset, incident_date=data.today,
            reason=f"Existing reviewed incident {index}", reviewed_by=data.technician,
            reviewed_at=timezone.now(),
        )
    attempting_borrower_lock = Event()

    def checkout():
        close_old_connections()
        try:
            client = APIClient()
            client.force_authenticate(user=data.technician)

            def signal_lock(execute, sql, params, many, context):
                if "lending_borrower" in sql and "FOR UPDATE" in sql:
                    attempting_borrower_lock.set()
                return execute(sql, params, many, context)

            with connection.execute_wrapper(signal_lock):
                return client.post("/api/loans/", data.payload, format="json")
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=1) as executor:
        # Simulate a damage service holding its normal borrower lock while
        # the third reviewed incident has not yet committed.
        with transaction.atomic():
            Borrower.objects.select_for_update().get(pk=data.borrower.pk)
            DamageFlag.objects.create(
                borrower=data.borrower, asset=data.asset, incident_date=data.today,
                reason="Third reviewed incident", reviewed_by=data.technician,
                reviewed_at=timezone.now(),
            )
            future = executor.submit(checkout)
            assert attempting_borrower_lock.wait(timeout=10)
            assert not future.done()
        response = future.result(timeout=10)
    assert response.status_code == 400
    assert "damage" in str(response.data)
    assert_no_checkout(data)
