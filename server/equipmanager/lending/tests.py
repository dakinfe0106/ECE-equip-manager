from datetime import UTC, date, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import override_settings
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


def test_borrower_list_is_read_only(borrower_client):
    response = borrower_client.post(
        "/api/borrowers/",
        {
            "unb_id": "UNB-001",
            "first_name": "Ada",
            "last_name": "Lovelace",
        },
        format="json",
    )

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


@pytest.mark.parametrize("method", ["post", "put", "patch", "delete"])
def test_loan_writes_rejected(borrower_client, method):
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
