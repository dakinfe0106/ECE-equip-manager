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
