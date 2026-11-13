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


def test_borrower_detail_requires_authentication():
    client = APIClient()

    assert client.get("/api/borrowers/1/").status_code == 403
    assert client.patch(
        "/api/borrowers/1/",
        {"first_name": "Changed"},
        format="json",
    ).status_code == 403


@pytest.mark.parametrize("role", ["TECHNICIAN", "ADMINISTRATOR"])
def test_borrower_detail_allows_technicians_and_administrators(db, role):
    user = get_user_model().objects.create_user(
        username=f"borrower-edit-{role.lower()}",
        role=role,
    )
    borrower = create_borrower(unb_id=f"UNB-{role}")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(f"/api/borrowers/{borrower.borrower_id}/")

    assert response.status_code == 200
    assert response.data == {
        "borrower_id": borrower.borrower_id,
        "unb_id": f"UNB-{role}",
        "first_name": "Ada",
        "last_name": "Lovelace",
    }
    patch_response = client.patch(
        f"/api/borrowers/{borrower.borrower_id}/",
        {"first_name": "Edited"},
        format="json",
    )

    assert patch_response.status_code == 200
    assert patch_response.data["first_name"] == "Edited"


def test_borrower_detail_denies_faculty(db):
    user = get_user_model().objects.create_user(
        username="borrower-edit-faculty",
        role="FACULTY",
    )
    borrower = create_borrower(unb_id="UNB-FACULTY")
    client = APIClient()
    client.force_authenticate(user=user)

    assert client.get(f"/api/borrowers/{borrower.borrower_id}/").status_code == 403
    assert client.patch(
        f"/api/borrowers/{borrower.borrower_id}/",
        {"first_name": "Changed"},
        format="json",
    ).status_code == 403


def test_borrower_patch_trims_abbreviated_first_name_and_preserves_other_fields(
    borrower_client,
):
    borrower = create_borrower(
        unb_id="UNB-PRESERVE",
        first_name="Original",
        last_name="Read Only",
        negligent_damage_flag=True,
    )

    response = borrower_client.patch(
        f"/api/borrowers/{borrower.borrower_id}/",
        {"first_name": "  LilyJ  "},
        format="json",
    )
    borrower.refresh_from_db()

    assert response.status_code == 200
    assert response.data == {
        "borrower_id": borrower.borrower_id,
        "unb_id": "UNB-PRESERVE",
        "first_name": "LilyJ",
        "last_name": "Read Only",
    }
    assert borrower.borrower_id == response.data["borrower_id"]
    assert borrower.unb_id == "UNB-PRESERVE"
    assert borrower.first_name == "LilyJ"
    assert borrower.last_name == "Read Only"
    assert borrower.negligent_damage_flag is True
    assert borrower.is_deleted is False
    assert Borrower.objects.count() == 1


def test_borrower_patch_allows_duplicate_names(borrower_client):
    borrower = create_borrower(unb_id="UNB-CHANGE", first_name="Original")
    other_borrower = create_borrower(
        unb_id="UNB-EXISTING",
        first_name="LilyJ",
    )

    response = borrower_client.patch(
        f"/api/borrowers/{borrower.borrower_id}/",
        {"first_name": "LilyJ"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["first_name"] == other_borrower.first_name
    borrower.refresh_from_db()
    assert borrower.unb_id == "UNB-CHANGE"


@pytest.mark.parametrize("first_name", ["", "   ", "x" * 256])
def test_borrower_patch_rejects_invalid_first_name(
    borrower_client, first_name
):
    borrower = create_borrower(unb_id="UNB-INVALID", first_name="Original")

    response = borrower_client.patch(
        f"/api/borrowers/{borrower.borrower_id}/",
        {"first_name": first_name},
        format="json",
    )

    assert response.status_code == 400
    assert "first_name" in response.data
    borrower.refresh_from_db()
    assert borrower.first_name == "Original"


@pytest.mark.parametrize(
    "forbidden_field",
    [
        "borrower_id",
        "last_name",
        "unb_id",
        "negligent_damage_flag",
        "is_deleted",
        "loans",
        "certifications",
        "unknown_field",
    ],
)
def test_borrower_patch_rejects_forbidden_and_unknown_fields(
    borrower_client, forbidden_field
):
    borrower = create_borrower(
        unb_id="UNB-FORBIDDEN",
        first_name="Original",
        last_name="Read Only",
        negligent_damage_flag=True,
    )

    response = borrower_client.patch(
        f"/api/borrowers/{borrower.borrower_id}/",
        {"first_name": "Must Not Save", forbidden_field: "attempted change"},
        format="json",
    )

    assert response.status_code == 400
    assert forbidden_field in response.data
    borrower.refresh_from_db()
    assert borrower.first_name == "Original"
    assert borrower.last_name == "Read Only"
    assert borrower.unb_id == "UNB-FORBIDDEN"
    assert borrower.negligent_damage_flag is True


@pytest.mark.parametrize("target", ["missing", "deleted"])
@pytest.mark.parametrize("method", ["get", "patch"])
def test_borrower_detail_hides_missing_and_soft_deleted_records(
    borrower_client, target, method
):
    if target == "deleted":
        borrower = create_borrower(
            unb_id="UNB-DELETED-DETAIL",
            is_deleted=True,
        )
        borrower_id = borrower.borrower_id
    else:
        borrower_id = 999999

    request = getattr(borrower_client, method)
    if method == "patch":
        response = request(
            f"/api/borrowers/{borrower_id}/",
            {"first_name": "Changed"},
            format="json",
        )
    else:
        response = request(f"/api/borrowers/{borrower_id}/")

    assert response.status_code == 404


@pytest.mark.parametrize("method", ["post", "put", "delete"])
def test_borrower_detail_restricts_unsupported_methods(
    borrower_client, method
):
    borrower = create_borrower(unb_id=f"UNB-METHOD-{method}")
    response = getattr(borrower_client, method)(
        f"/api/borrowers/{borrower.borrower_id}/",
        {},
        format="json",
    )

    assert response.status_code == 405
