import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework.test import APIClient

from .models import Borrower


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


@pytest.mark.parametrize("role", ["TECHNICIAN", "ADMINISTRATOR"])
def test_borrower_create_allows_technician_and_administrator(db, role):
    user = get_user_model().objects.create_user(
        username=f"borrower-create-{role.lower()}",
        role=role,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        "/api/borrowers/",
        {
            "unb_id": "  3519271  ",
            "first_name": "  Kobi  ",
            "last_name": "  Mensah  ",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["unb_id"] == "3519271"
    assert response.data["first_name"] == "Kobi"
    assert response.data["last_name"] == "Mensah"
    created = Borrower.objects.get(borrower_id=response.data["borrower_id"])
    assert not created.negligent_damage_flag
    assert not created.is_deleted


def test_borrower_create_allows_optional_blank_last_name(borrower_client):
    response = borrower_client.post(
        "/api/borrowers/",
        {"unb_id": "3519272", "first_name": "Grace"},
        format="json",
    )

    assert response.status_code == 201
    assert response.data["last_name"] == ""


@pytest.mark.parametrize(
    ("payload", "missing_field"),
    [
        ({"first_name": "Kobi"}, "unb_id"),
        ({"unb_id": "   ", "first_name": "Kobi"}, "unb_id"),
        ({"unb_id": "3519273"}, "first_name"),
        ({"unb_id": "3519273", "first_name": "   "}, "first_name"),
    ],
)
def test_borrower_create_rejects_missing_or_blank_required_fields(
    borrower_client, payload, missing_field
):
    response = borrower_client.post("/api/borrowers/", payload, format="json")

    assert response.status_code == 400
    assert missing_field in response.data
    assert Borrower.objects.count() == 0


def test_borrower_create_rejects_duplicate_unb_id_including_soft_deleted(
    borrower_client,
):
    create_borrower(unb_id="3519271", is_deleted=True)

    response = borrower_client.post(
        "/api/borrowers/",
        {"unb_id": " 3519271 ", "first_name": "Duplicate"},
        format="json",
    )

    assert response.status_code == 400
    assert response.data["unb_id"] == [
        "A borrower with this UNB ID already exists."
    ]
    assert Borrower.objects.count() == 1


def test_borrower_create_ignores_client_supplied_server_flags(borrower_client):
    response = borrower_client.post(
        "/api/borrowers/",
        {
            "unb_id": "3519274",
            "first_name": "Kobi",
            "negligent_damage_flag": True,
            "is_deleted": True,
        },
        format="json",
    )

    assert response.status_code == 201
    created = Borrower.objects.get(borrower_id=response.data["borrower_id"])
    assert not created.negligent_damage_flag
    assert not created.is_deleted


def test_borrower_create_denies_faculty_and_anonymous(db):
    assert (
        APIClient()
        .post(
            "/api/borrowers/",
            {"unb_id": "3519999", "first_name": "Anon"},
            format="json",
        )
        .status_code
        == 403
    )

    faculty = get_user_model().objects.create_user(
        username="faculty-cannot-add-borrower", role="FACULTY"
    )
    client = APIClient()
    client.force_authenticate(user=faculty)
    assert (
        client.post(
            "/api/borrowers/",
            {"unb_id": "3519999", "first_name": "Faculty"},
            format="json",
        ).status_code
        == 403
    )


def test_borrower_create_enforces_csrf_for_session_users(db):
    user = get_user_model().objects.create_user(
        username="csrf-borrower-tech",
        role="TECHNICIAN",
        password="test-password",
    )
    client = APIClient(enforce_csrf_checks=True)
    client.force_login(user)

    assert (
        client.post(
            "/api/borrowers/",
            {"unb_id": "3519888", "first_name": "NoCsrf"},
            format="json",
        ).status_code
        == 403
    )

    get_response = client.get(
        "/api/borrowers/", HTTP_ORIGIN="http://localhost:5173"
    )
    csrf_token = get_response.cookies["csrftoken"].value
    response = client.post(
        "/api/borrowers/",
        {"unb_id": "3519888", "first_name": "ValidCsrf"},
        format="json",
        HTTP_ORIGIN="http://localhost:5173",
        HTTP_X_CSRFTOKEN=csrf_token,
    )
    assert response.status_code == 201