from datetime import UTC, date, datetime, timedelta
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import override_settings
from openpyxl import load_workbook
from rest_framework.test import APIClient

from inventory.models import Asset, Category, EquipmentType

from .models import Borrower, Loan


@pytest.fixture
def borrower_client(db):
    user = get_user_model().objects.create_user(
        username="shop-tech",
        role="TECHNICIAN",
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def create_borrower(*, unb_id, first_name="Ada", last_name="Lovelace", **kwargs):
    return Borrower.objects.create(
        unb_id=unb_id,
        first_name=first_name,
        last_name=last_name,
        **kwargs,
    )


def test_borrower_save_trims_names_and_unb_id(db):
    borrower = create_borrower(
        unb_id="  UNB-001  ",
        first_name="  Ada ",
        last_name=" Lovelace  ",
    )

    assert borrower.unb_id == "UNB-001"
    assert borrower.first_name == "Ada"
    assert borrower.last_name == "Lovelace"


@pytest.mark.parametrize(
    ("first_name", "unb_id"),
    [
        (" ", "UNB-001"),
        ("Ada", "  "),
    ],
)
def test_borrower_database_constraints_reject_blank_required_strings(
    db, first_name, unb_id
):
    with pytest.raises(IntegrityError), transaction.atomic():
        Borrower.objects.bulk_create(
            [Borrower(first_name=first_name, unb_id=unb_id)]
        )


def test_borrower_unb_id_is_unique(db):
    create_borrower(unb_id="UNB-001")

    with pytest.raises(IntegrityError), transaction.atomic():
        create_borrower(unb_id="UNB-001")


def test_borrower_list_requires_authentication():
    response = APIClient().get("/api/borrowers/")

    assert response.status_code == 403


@pytest.mark.parametrize("role", ["TECHNICIAN", "ADMINISTRATOR"])
def test_borrower_list_allows_technicians_and_administrators(db, role):
    user = get_user_model().objects.create_user(
        username=f"borrower-view-{role.lower()}",
        role=role,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get("/api/borrowers/")

    assert response.status_code == 200


def test_borrower_list_denies_faculty(db):
    user = get_user_model().objects.create_user(
        username="borrower-view-faculty",
        role="FACULTY",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get("/api/borrowers/")

    assert response.status_code == 403


@pytest.mark.parametrize("method", ["put", "patch", "delete"])
def test_borrower_list_rejects_unsupported_methods(borrower_client, method):
    response = getattr(borrower_client, method)("/api/borrowers/", {}, format="json")

    assert response.status_code == 405


def test_borrower_list_returns_documented_identity_fields(borrower_client):
    borrower = create_borrower(unb_id="UNB-001")

    response = borrower_client.get("/api/borrowers/")

    assert response.status_code == 200
    assert response.data["count"] == 1
    assert response.data["next"] is None
    assert response.data["previous"] is None
    assert response.data["results"] == [
        {
            "borrower_id": borrower.borrower_id,
            "unb_id": "UNB-001",
            "first_name": "Ada",
            "last_name": "Lovelace",
        }
    ]


@pytest.mark.parametrize(
    "search",
    [
        "  unb-001 ",
        " ADA ",
        " lovelace ",
        "  aDa lOvElAcE ",
    ],
)
def test_borrower_search_matches_id_and_names_case_insensitively(
    borrower_client, search
):
    create_borrower(unb_id="UNB-001")
    create_borrower(
        unb_id="UNB-002",
        first_name="Grace",
        last_name="Hopper",
    )

    response = borrower_client.get("/api/borrowers/", {"search": search})

    assert response.status_code == 200
    assert [row["unb_id"] for row in response.data["results"]] == ["UNB-001"]


def test_borrower_list_excludes_soft_deleted_records(borrower_client):
    create_borrower(unb_id="UNB-ACTIVE")
    create_borrower(unb_id="UNB-DELETED", is_deleted=True)

    response = borrower_client.get("/api/borrowers/")

    assert response.status_code == 200
    assert response.data["count"] == 1
    assert [row["unb_id"] for row in response.data["results"]] == ["UNB-ACTIVE"]


def test_borrower_search_returns_empty_when_no_record_matches(borrower_client):
    create_borrower(unb_id="UNB-001")

    response = borrower_client.get("/api/borrowers/", {"search": "missing"})

    assert response.status_code == 200
    assert response.data["count"] == 0
    assert response.data["results"] == []


def test_borrower_list_paginates_twenty_records_per_page(borrower_client):
    Borrower.objects.bulk_create(
        [
            Borrower(
                unb_id=f"UNB-{index:03d}",
                first_name=f"Borrower {index}",
            )
            for index in range(1, 23)
        ]
    )

    first_page = borrower_client.get("/api/borrowers/")
    second_page = borrower_client.get("/api/borrowers/?page=2")

    assert first_page.status_code == 200
    assert first_page.data["count"] == 22
    assert len(first_page.data["results"]) == 20
    assert first_page.data["next"] is not None
    assert first_page.data["previous"] is None
    assert second_page.status_code == 200
    assert len(second_page.data["results"]) == 2
    assert second_page.data["next"] is None
    assert second_page.data["previous"] is not None


@pytest.fixture
def loan_data(db):
    today = date(2026, 11, 13)
    category = Category.objects.create(name="Electronics")
    equipment_type = EquipmentType.objects.create(category=category, name="Test instruments")
    borrower = create_borrower(unb_id="UNB-LOAN", first_name="Ada", last_name="Lovelace")
    loans = []
    for index, (offset, condition, asset_status) in enumerate([
        (-1, None, Asset.Status.ON_LOAN),
        (0, None, Asset.Status.ON_LOAN),
        (1, None, Asset.Status.ON_LOAN),
        (-2, "Intact", Asset.Status.AVAILABLE),
        (-3, "Damaged", Asset.Status.UNDER_MAINTENANCE),
        (-4, "Intact", Asset.Status.RETIRED),
    ]):
        asset = Asset.objects.create(
            type=equipment_type, asset_identifier=f"SHOP-{index}",
            name=f"Oscilloscope {index}", status=asset_status,
        )
        loans.append(Loan.objects.create(
            asset=asset, borrower=borrower, checkout_date=today - timedelta(days=10),
            expected_return_date=today + timedelta(days=offset),
            actual_return_date=today if condition else None, return_condition=condition,
        ))
    with patch("lending.views.timezone.localdate", return_value=today):
        yield SimpleNamespace(today=today, borrower=borrower, loans=loans)


def loan_ids(response):
    assert response.status_code == 200
    return [row["loan_id"] for row in response.data]


@pytest.mark.parametrize("role", ["TECHNICIAN", "ADMINISTRATOR"])
def test_loan_roles_allowed(db, role):
    user = get_user_model().objects.create_user(username="loan-reader", role=role)
    client = APIClient()
    client.force_login(user)
    response = client.get("/api/loans/")
    assert response.status_code == 200
    assert response.data == []


def test_loan_anonymous_denied():
    assert APIClient().get("/api/loans/").status_code == 403


@pytest.mark.parametrize("role,active", [("FACULTY", True), ("UNKNOWN", True), ("TECHNICIAN", False)])
def test_loan_disallowed_users(db, role, active):
    client = APIClient()
    client.force_authenticate(user=SimpleNamespace(is_authenticated=True, is_active=active, role=role))
    assert client.get("/api/loans/").status_code == 403


def test_loan_exact_response_and_all_statuses(borrower_client, loan_data):
    response = borrower_client.get("/api/loans/")
    assert loan_ids(response) == [loan.pk for loan in loan_data.loans]
    loan = loan_data.loans[0]
    assert response.data[0] == {
        "loan_id": loan.pk, "asset_id": loan.asset_id,
        "asset_identifier": "SHOP-0",
        "equipment_name": "Oscilloscope 0", "borrower_id": loan.borrower_id,
        "borrower_unb_id": "UNB-LOAN",
        "borrower_name": "Ada Lovelace", "checkout_date": "2026-11-03",
        "expected_return_date": "2026-11-12", "actual_return_date": None,
        "return_condition": None, "status": "overdue",
    }
    assert [row["status"] for row in response.data] == [
        "overdue", "on_loan", "on_loan", "returned", "returned", "returned"
    ]
    assert response.data[3]["actual_return_date"] == "2026-11-13"
    assert response.data[3]["return_condition"] == "Intact"
    assert response.data[4]["return_condition"] == "Damaged"


def test_loan_name_without_last_name(borrower_client, loan_data):
    loan_data.borrower.last_name = ""
    loan_data.borrower.save()
    assert borrower_client.get("/api/loans/").data[0]["borrower_name"] == "Ada"


@pytest.mark.parametrize("status,indices", [
    ("on_loan", [0, 1, 2]), ("overdue", [0]), ("returned", [3, 4, 5]),
])
def test_loan_status_filters(borrower_client, loan_data, status, indices):
    response = borrower_client.get("/api/loans/", {"status": status})
    assert loan_ids(response) == [loan_data.loans[i].pk for i in indices]


@pytest.mark.parametrize("search", [
    "  aDA  ", "LOVElaCe", " ada lovelace ", "unb-loan", "OSCILLOSCOPE", "  shop-0  ",
])
def test_loan_search(borrower_client, loan_data, search):
    # An unrelated loan proves search restricts results rather than just returning all.
    other = create_borrower(unb_id="OTHER", first_name="Grace", last_name="Hopper")
    asset = Asset.objects.create(type=loan_data.loans[0].asset.type, name="Drill", asset_identifier="DRILL")
    Loan.objects.create(asset=asset, borrower=other, checkout_date=loan_data.today,
                        expected_return_date=loan_data.today)
    response = borrower_client.get("/api/loans/", {"search": search})
    expected = loan_data.loans[:1] if "shop-0" in search else loan_data.loans
    assert loan_ids(response) == [loan.pk for loan in expected]


@pytest.mark.parametrize("search", ["", "   ", "no-match"])
def test_loan_empty_and_missing_search(borrower_client, loan_data, search):
    response = borrower_client.get("/api/loans/", {"search": search})
    assert len(loan_ids(response)) == (0 if search == "no-match" else 6)


@pytest.mark.parametrize("params,indices", [
    ({"expected_return_from": "2026-11-13"}, [1, 2]),
    ({"expected_return_to": "2026-11-12"}, [0, 3, 4, 5]),
    ({"expected_return_from": "2026-11-12", "expected_return_to": "2026-11-13"}, [0, 1]),
    ({"expected_return_from": "2026-11-13", "expected_return_to": "2026-11-13"}, [1]),
    ({"asset_status": "on_loan"}, [0, 1, 2]),
    ({"asset_status": "available"}, [3]),
    ({"asset_status": "under_maintenance"}, [4]),
    ({"asset_status": "retired"}, [5]),
    ({"search": "SHOP-0", "status": "on_loan"}, [0]),
    ({"search": "SHOP-0", "status": "returned"}, []),
    ({"status": "overdue", "search": "aDa lovelace", "asset_status": "on_loan",
      "expected_return_from": "2026-11-12", "expected_return_to": "2026-11-12"}, [0]),
])
def test_loan_combined_and_individual_filters(borrower_client, loan_data, params, indices):
    assert loan_ids(borrower_client.get("/api/loans/", params)) == [loan_data.loans[i].pk for i in indices]


@pytest.mark.parametrize("params,field", [
    ({"status": "active"}, "status"), ({"status": ""}, "status"),
    ({"asset_status": "overdue"}, "asset_status"),
    ({"asset_status": "unknown"}, "asset_status"),
    ({"expected_return_from": "not-a-date"}, "expected_return_from"),
    ({"expected_return_to": "2026-02-30"}, "expected_return_to"),
    ({"expected_return_from": "2026-11-14", "expected_return_to": "2026-11-13"}, "expected_return_to"),
])
def test_loan_invalid_queries(borrower_client, params, field):
    response = borrower_client.get("/api/loans/", params)
    assert response.status_code == 400
    assert field in response.data


def test_loan_history_survives_soft_deletion(borrower_client, loan_data):
    Borrower.objects.filter(pk=loan_data.borrower.pk).update(is_deleted=True)
    Asset.objects.all().update(is_deleted=True)
    EquipmentType.objects.all().update(is_deleted=True)
    Category.objects.all().update(is_deleted=True)
    response = borrower_client.get("/api/loans/", {"search": "ada"})
    assert loan_ids(response) == [loan.pk for loan in loan_data.loans]


@pytest.mark.parametrize("method", ["put", "patch", "delete"])
def test_loan_rejects_unsupported_write_methods(borrower_client, method):
    assert getattr(borrower_client, method)("/api/loans/", {}, format="json").status_code == 405


def test_loan_get_does_not_change_records(borrower_client, loan_data):
    models = (Loan, Borrower, Asset, EquipmentType, Category)
    before = [list(model.objects.order_by("pk").values()) for model in models]
    assert borrower_client.get("/api/loans/").status_code == 200
    assert [list(model.objects.order_by("pk").values()) for model in models] == before


@pytest.mark.parametrize("changes", [
    {"expected_return_date": date(2026, 11, 2)},
    {"actual_return_date": date(2026, 11, 2), "return_condition": "Intact"},
    {"actual_return_date": date(2026, 11, 13)},
    {"return_condition": "Damaged"},
    {"actual_return_date": date(2026, 11, 13), "return_condition": "Unknown"},
    {"actual_return_date": date(2026, 11, 13), "return_condition": ""},
])
def test_loan_database_constraints(db, loan_data, changes):
    fields = {"asset": loan_data.loans[3].asset, "borrower": loan_data.borrower,
              "checkout_date": date(2026, 11, 3), "expected_return_date": date(2026, 11, 13)}
    fields.update(changes)
    with pytest.raises(IntegrityError), transaction.atomic():
        Loan.objects.create(**fields)


def test_loan_one_open_per_asset_and_multiple_history(db, loan_data):
    original = loan_data.loans[0]
    fields = {"asset": original.asset, "borrower": original.borrower,
              "checkout_date": original.checkout_date, "expected_return_date": original.expected_return_date}
    with pytest.raises(IntegrityError), transaction.atomic():
        Loan.objects.create(**fields)
    for condition in ("Intact", "Damaged"):
        Loan.objects.create(**fields, actual_return_date=loan_data.today, return_condition=condition)
    assert Loan.objects.filter(asset=original.asset).count() == 3


@pytest.mark.parametrize("related", ["asset", "borrower"])
def test_loan_protects_related_records(db, loan_data, related):
    with pytest.raises(ProtectedError):
        getattr(loan_data.loans[0], related).delete()


def test_loan_uses_configured_local_business_date(borrower_client, loan_data):
    # UTC is Nov 14, while the Shop's local date is still Nov 13.
    with (
        override_settings(TIME_ZONE="America/Moncton"),
        patch("django.utils.timezone.now", return_value=datetime(
            2026, 11, 14, 1, tzinfo=UTC
        )),
    ):
        # Temporarily restore the real localdate inside the fixture's patch.
        from django.utils.timezone import localtime

        with patch("lending.views.timezone.localdate", side_effect=lambda: localtime().date()):
            response = borrower_client.get("/api/loans/")
            assert response.data[1]["status"] == "on_loan"
            assert loan_ids(borrower_client.get("/api/loans/", {"status": "overdue"})) == [
                loan_data.loans[0].pk
            ]
@pytest.mark.parametrize("negligent_damage_flag", [False, True])
def test_borrower_detail_returns_identity_and_negligent_damage_status(
    borrower_client, negligent_damage_flag
):
    borrower = create_borrower(
        unb_id="UNB-DETAIL",
        negligent_damage_flag=negligent_damage_flag,
    )

    response = borrower_client.get(f"/api/borrowers/{borrower.borrower_id}/")

    assert response.status_code == 200
    assert response.data == {
        "borrower_id": borrower.borrower_id,
        "unb_id": "UNB-DETAIL",
        "first_name": "Ada",
        "last_name": "Lovelace",
        "is_manual_enrollment": True,
        "negligent_damage_flag": negligent_damage_flag,
        "unresolved_damage_flag_count": 0,
        "damage_warning_level": "no_warning",
        "damage_eligible": True,
    }


@pytest.mark.parametrize("role", ["TECHNICIAN", "ADMINISTRATOR"])
def test_borrower_detail_allows_technicians_and_administrators(db, role):
    user = get_user_model().objects.create_user(
        username=f"borrower-detail-{role.lower()}",
        role=role,
    )
    borrower = create_borrower(unb_id=f"UNB-{role}")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(f"/api/borrowers/{borrower.borrower_id}/")

    assert response.status_code == 200


def test_borrower_detail_denies_faculty(db):
    user = get_user_model().objects.create_user(
        username="borrower-detail-faculty",
        role="FACULTY",
    )
    borrower = create_borrower(unb_id="UNB-FACULTY")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(f"/api/borrowers/{borrower.borrower_id}/")

    assert response.status_code == 403


def test_borrower_detail_requires_authentication(db):
    borrower = create_borrower(unb_id="UNB-UNAUTH")

    response = APIClient().get(f"/api/borrowers/{borrower.borrower_id}/")

    assert response.status_code == 403


@pytest.mark.parametrize("is_deleted", [False, True])
def test_borrower_detail_returns_not_found_for_missing_or_deleted_borrower(
    borrower_client, db, is_deleted
):
    if is_deleted:
        borrower = create_borrower(unb_id="UNB-DELETED-DETAIL", is_deleted=True)
        borrower_id = borrower.borrower_id
    else:
        borrower_id = 999999

    response = borrower_client.get(f"/api/borrowers/{borrower_id}/")

    assert response.status_code == 404


def test_borrower_detail_does_not_change_borrower_list_response(borrower_client):
    borrower = create_borrower(unb_id="UNB-LIST-DETAIL", negligent_damage_flag=True)

    response = borrower_client.get("/api/borrowers/")

    assert response.status_code == 200
    assert response.data["results"] == [
        {
            "borrower_id": borrower.borrower_id,
            "unb_id": "UNB-LIST-DETAIL",
            "first_name": "Ada",
            "last_name": "Lovelace",
        }
    ]


def create_analytics_loan(
    *,
    asset,
    borrower,
    checkout_date,
    expected_return_date,
    actual_return_date=None,
    return_condition=None,
):
    return Loan.objects.create(
        asset=asset,
        borrower=borrower,
        checkout_date=checkout_date,
        expected_return_date=expected_return_date,
        actual_return_date=actual_return_date,
        return_condition=return_condition,
    )


def create_analytics_asset(*, inventory_type, asset_identifier, name):
    return Asset.objects.create(
        type=inventory_type,
        asset_identifier=asset_identifier,
        name=name,
    )


def test_analytics_years_and_reports_require_authentication():
    client = APIClient()

    for path in (
        "/api/analytics/years/",
        "/api/analytics/utilization/",
        "/api/analytics/borrowing/",
        "/api/analytics/borrowers/",
    ):
        assert client.get(path).status_code == 403


def test_faculty_can_view_borrowing_analytics(db):
    user = get_user_model().objects.create_user(
        username="analytics-faculty",
        role="FACULTY",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get("/api/analytics/borrowing/")

    assert response.status_code == 200
    assert response.data["total_loans"] == 0


def test_analytics_years_include_checkout_years_and_current_year(
    borrower_client, monkeypatch
):
    category = Category.objects.create(name="Analytics tools")
    inventory_type = EquipmentType.objects.create(category=category, name="Meters")
    asset = create_analytics_asset(
        inventory_type=inventory_type,
        asset_identifier="ANALYTICS-YEAR",
        name="Meter",
    )
    borrower = create_borrower(unb_id="UNB-YEAR")
    create_analytics_loan(
        asset=asset,
        borrower=borrower,
        checkout_date=date(2023, 4, 1),
        expected_return_date=date(2023, 4, 2),
        actual_return_date=date(2023, 4, 2),
        return_condition=Loan.ReturnCondition.INTACT,
    )
    monkeypatch.setattr("lending.analytics.timezone.localdate", lambda: date(2025, 1, 2))

    response = borrower_client.get("/api/analytics/years/")

    assert response.status_code == 200
    assert response.data == {"years": [2025, 2023]}


def test_borrowing_analytics_filters_by_checkout_year_and_counts_statuses(
    borrower_client, monkeypatch
):
    category = Category.objects.create(name="Borrowing analytics")
    inventory_type = EquipmentType.objects.create(category=category, name="Scales")
    asset = create_analytics_asset(
        inventory_type=inventory_type,
        asset_identifier="ANALYTICS-BORROWING",
        name="Scale",
    )
    second_active_asset = create_analytics_asset(
        inventory_type=inventory_type,
        asset_identifier="ANALYTICS-BORROWING-2",
        name="Second scale",
    )
    borrower = create_borrower(unb_id="UNB-BORROWING")
    create_analytics_loan(
        asset=asset,
        borrower=borrower,
        checkout_date=date(2025, 1, 1),
        expected_return_date=date(2025, 1, 5),
        actual_return_date=date(2025, 1, 3),
        return_condition=Loan.ReturnCondition.INTACT,
    )
    create_analytics_loan(
        asset=asset,
        borrower=borrower,
        checkout_date=date(2025, 1, 2),
        expected_return_date=date(2025, 1, 8),
    )
    create_analytics_loan(
        asset=second_active_asset,
        borrower=borrower,
        checkout_date=date(2025, 1, 3),
        expected_return_date=date(2025, 1, 12),
    )
    create_analytics_loan(
        asset=asset,
        borrower=borrower,
        checkout_date=date(2024, 12, 31),
        expected_return_date=date(2025, 1, 2),
        actual_return_date=date(2025, 1, 2),
        return_condition=Loan.ReturnCondition.DAMAGED,
    )
    monkeypatch.setattr("lending.analytics.timezone.localdate", lambda: date(2025, 1, 10))

    response = borrower_client.get("/api/analytics/borrowing/", {"year": 2025})

    assert response.status_code == 200
    assert response.data == {
        "year": 2025,
        "total_loans": 3,
        "completed_loans": 1,
        "active_loans": 2,
        "overdue_loans": 1,
        "intact_returns": 1,
        "damaged_returns": 0,
    }


def test_borrower_analytics_preserves_history_and_searches_identity(
    borrower_client, monkeypatch
):
    category = Category.objects.create(name="Borrower analytics")
    inventory_type = EquipmentType.objects.create(category=category, name="Probes")
    asset = create_analytics_asset(
        inventory_type=inventory_type,
        asset_identifier="ANALYTICS-BORROWER",
        name="Probe",
    )
    borrower = create_borrower(
        unb_id="UNB-HISTORICAL",
        first_name="Grace",
        last_name="Hopper",
        is_deleted=True,
    )
    create_analytics_loan(
        asset=asset,
        borrower=borrower,
        checkout_date=date(2024, 2, 1),
        expected_return_date=date(2024, 2, 6),
        actual_return_date=date(2024, 2, 5),
        return_condition=Loan.ReturnCondition.DAMAGED,
    )
    monkeypatch.setattr("lending.analytics.timezone.localdate", lambda: date(2025, 1, 10))

    response = borrower_client.get(
        "/api/analytics/borrowers/",
        {"year": 2024, "search": "unb-historical"},
    )

    assert response.status_code == 200
    assert response.data["results"] == [
        {
            "borrower_id": borrower.borrower_id,
            "unb_id": "UNB-HISTORICAL",
            "first_name": "Grace",
            "last_name": "Hopper",
            "total_loans": 1,
            "completed_loans": 1,
            "active_loans": 0,
            "overdue_loans": 0,
            "damaged_returns": 1,
        }
    ]


def test_utilization_analytics_counts_frequency_and_duration(borrower_client, monkeypatch):
    category = Category.objects.create(name="Utilization analytics")
    inventory_type = EquipmentType.objects.create(category=category, name="Calipers")
    frequent_asset = create_analytics_asset(
        inventory_type=inventory_type,
        asset_identifier="ANALYTICS-FREQUENT",
        name="Frequently borrowed caliper",
    )
    rarely_used_asset = create_analytics_asset(
        inventory_type=inventory_type,
        asset_identifier="ANALYTICS-RARE",
        name="Rarely borrowed caliper",
    )
    borrower = create_borrower(unb_id="UNB-UTILIZATION")
    create_analytics_loan(
        asset=frequent_asset,
        borrower=borrower,
        checkout_date=date(2025, 1, 1),
        expected_return_date=date(2025, 1, 10),
        actual_return_date=date(2025, 1, 4),
        return_condition=Loan.ReturnCondition.INTACT,
    )
    create_analytics_loan(
        asset=frequent_asset,
        borrower=borrower,
        checkout_date=date(2025, 1, 5),
        expected_return_date=date(2025, 1, 12),
    )
    create_analytics_loan(
        asset=rarely_used_asset,
        borrower=borrower,
        checkout_date=date(2024, 12, 30),
        expected_return_date=date(2025, 1, 3),
        actual_return_date=date(2025, 1, 2),
        return_condition=Loan.ReturnCondition.DAMAGED,
    )
    monkeypatch.setattr("lending.analytics.timezone.localdate", lambda: date(2025, 1, 10))

    response = borrower_client.get("/api/analytics/utilization/", {"year": 2025})

    assert response.status_code == 200
    assert response.data["results"][0]["asset_id"] == frequent_asset.asset_id
    assert response.data["results"][0]["loan_count"] == 2
    assert response.data["results"][0]["total_loan_days"] == 8
    assert response.data["results"][0]["average_loan_days"] == 4
    assert response.data["results"][1]["asset_id"] == rarely_used_asset.asset_id
    assert response.data["results"][1]["loan_count"] == 0


@pytest.mark.parametrize(
    ("path", "params", "expected_filename"),
    [
        ("/api/analytics/utilization/", {"export": "xlsx"}, "equipment-utilization.xlsx"),
        ("/api/analytics/borrowing/", {"year": 2024, "export": "xlsx"}, "borrowing-activity.xlsx"),
        ("/api/analytics/borrowers/", {"search": "Ada", "export": "xlsx"}, "borrower-activity.xlsx"),
    ],
)
def test_lending_analytics_exports_excel(borrower_client, path, params, expected_filename):
    response = borrower_client.get(path, params)

    assert response.status_code == 200
    assert response["Content-Type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert expected_filename in response["Content-Disposition"]
    workbook = load_workbook(BytesIO(response.content), read_only=True)
    assert next(iter(workbook.active.values))


def test_borrower_detail_patch_updates_first_name(borrower_client):
    borrower = create_borrower(unb_id="UNB-EDIT", first_name="Ada", last_name="Lovelace")

    response = borrower_client.patch(
        f"/api/borrowers/{borrower.borrower_id}/",
        {"first_name": "Adeline"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["first_name"] == "Adeline"
    assert response.data["last_name"] == "Lovelace"

    borrower.refresh_from_db()
    assert borrower.first_name == "Adeline"


def test_create_borrower_success(borrower_client):
    response = borrower_client.post(
        "/api/borrowers/",
        {
            "unb_id": "UNB-NEW-01",
            "first_name": "Kobi",
            "last_name": "Mensah",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["unb_id"] == "UNB-NEW-01"
    assert response.data["first_name"] == "Kobi"
    assert response.data["last_name"] == "Mensah"

    borrower = Borrower.objects.get(unb_id="UNB-NEW-01")
    assert borrower.is_manual_enrollment is True


@pytest.mark.parametrize("is_deleted", [False, True])
def test_create_borrower_prevents_duplicate_unb_id(borrower_client, is_deleted):
    create_borrower(unb_id="UNB-DUP-01", is_deleted=is_deleted)

    response = borrower_client.post(
        "/api/borrowers/",
        {
            "unb_id": "UNB-DUP-01",
            "first_name": "Duplicate",
            "last_name": "User",
        },
        format="json",
    )

    assert response.status_code == 400
    assert "unb_id" in response.data

@pytest.mark.parametrize(
    "payload,missing_field",
    [
        ({"first_name": "Kobi"}, "unb_id"),
        ({"unb_id": "UNB-VAL-01"}, "first_name"),
        ({"unb_id": "   ", "first_name": "Kobi"}, "unb_id"),
        ({"unb_id": "UNB-VAL-01", "first_name": "   "}, "first_name"),
    ],
)
def test_create_borrower_validates_required_fields(borrower_client, payload, missing_field):
    response = borrower_client.post(
        "/api/borrowers/",
        payload,
        format="json",
    )

    assert response.status_code == 400
    assert missing_field in response.data


def test_create_borrower_denies_faculty(db):
    user = get_user_model().objects.create_user(
        username="borrower-create-faculty",
        role="FACULTY",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        "/api/borrowers/",
        {
            "unb_id": "UNB-FAC-01",
            "first_name": "Unauthorized",
        },
        format="json",
    )

    assert response.status_code == 403

def test_borrower_analytics_denies_faculty(db):
    user = get_user_model().objects.create_user(
        username="borrower-analytics-faculty",
        role="FACULTY",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    assert client.get("/api/analytics/borrowers/").status_code == 403
    assert (
        client.get("/api/analytics/borrowers/", {"export": "xlsx"}).status_code
        == 403
    )