
from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework.test import APIClient

from .models import Asset, Category, EquipmentType


@pytest.fixture
def inventory_type(db):
    category = Category.objects.create(name="Tools")
    return EquipmentType.objects.create(
        category=category,
        name="Power tools",
        description="Portable power tools",
    )


@pytest.fixture
def asset_record(inventory_type):
    return Asset.objects.create(
        type=inventory_type,
        asset_identifier="SHOP-001",
        name="Cordless drill",
        acquisition_date=date(2024, 3, 15),
    )


@pytest.fixture
def authenticated_client(db):
    user = get_user_model().objects.create_user(
        username="shop-tech",
        password="test-password",
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def test_asset_list_returns_assets_with_type_and_category_details(
    authenticated_client, asset_record
):
    response = authenticated_client.get(
        "/api/assets/",
    )

    assert response.status_code == 200
    assert response.data["count"] == 1
    assert response.data["next"] is None
    assert response.data["previous"] is None
    assert response.data["results"] == [
        {
            "asset_id": asset_record.asset_id,
            "asset_identifier": "SHOP-001",
            "name": "Cordless drill",
            "acquisition_date": "2024-03-15",
            "status": "Available",
            "equipment_type": {
                "type_id": asset_record.type.type_id,
                "name": "Power tools",
                "description": "Portable power tools",
                "category": {
                    "category_id": asset_record.type.category.category_id,
                    "name": "Tools",
                },
            },
        },
    ]


def test_asset_list_search_matches_identifier_substring_case_insensitively(
    authenticated_client, asset_record, inventory_type
):
    second_asset = Asset.objects.create(
        type=inventory_type,
        asset_identifier="SHOP-010",
        name="Circular saw",
    )
    response = authenticated_client.get(
        "/api/assets/",
        {"asset_identifier": "  shop-0  "},
    )

    assert response.status_code == 200
    assert response.data["count"] == 2
    assert [asset["asset_identifier"] for asset in response.data["results"]] == [
        asset_record.asset_identifier,
        second_asset.asset_identifier,
    ]


def test_full_asset_identifier_matches_one_result(
    authenticated_client, asset_record, inventory_type
):
    Asset.objects.create(
        type=inventory_type,
        asset_identifier="SHOP-010",
        name="Circular saw",
    )
    response = authenticated_client.get(
        "/api/assets/",
        {"asset_identifier": "shop-001"},
    )

    assert response.status_code == 200
    assert response.data["count"] == 1
    assert response.data["results"][0]["asset_identifier"] == asset_record.asset_identifier


@pytest.mark.parametrize("deleted_record", ["asset", "equipment_type", "category"])
def test_asset_list_hides_soft_deleted_inventory(
    authenticated_client, asset_record, deleted_record
):
    records = {
        "asset": asset_record,
        "equipment_type": asset_record.type,
        "category": asset_record.type.category,
    }
    record = records[deleted_record]
    record.is_deleted = True
    record.save(update_fields=["is_deleted"])

    response = authenticated_client.get(
        "/api/assets/",
        {"asset_identifier": asset_record.asset_identifier},
    )

    assert response.status_code == 200
    assert response.data["count"] == 0
    assert response.data["results"] == []


def test_asset_list_requires_authentication():
    response = APIClient().get(
        "/api/assets/",
    )

    assert response.status_code == 403


def test_asset_list_allows_credentials_for_configured_frontend_origin():
    response = APIClient().get(
        "/api/assets/",
        HTTP_ORIGIN="http://localhost:5173",
    )

    assert response["Access-Control-Allow-Origin"] == "http://localhost:5173"
    assert response["Access-Control-Allow-Credentials"] == "true"
    assert "csrftoken" in response.cookies


def test_asset_list_paginates_twenty_records_per_page(
    authenticated_client, inventory_type
):
    Asset.objects.bulk_create(
        [
            Asset(
                type=inventory_type,
                asset_identifier=f"SHOP-{index:03d}",
                name=f"Equipment {index}",
            )
            for index in range(1, 23)
        ]
    )

    first_page = authenticated_client.get("/api/assets/")
    second_page = authenticated_client.get("/api/assets/?page=2")

    assert first_page.status_code == 200
    assert first_page.data["count"] == 22
    assert len(first_page.data["results"]) == 20
    assert first_page.data["next"] is not None
    assert first_page.data["previous"] is None
    assert second_page.status_code == 200
    assert len(second_page.data["results"]) == 2
    assert second_page.data["next"] is None
    assert second_page.data["previous"] is not None


def test_asset_identifier_is_case_sensitive_unique_including_soft_deleted(
    db, asset_record
):
    asset_record.is_deleted = True
    asset_record.save(update_fields=["is_deleted"])

    lowercase_identifier = Asset.objects.create(
        type=asset_record.type,
        asset_identifier="shop-001",
        name="Lowercase identifier asset",
    )
    assert lowercase_identifier.asset_identifier == "shop-001"

    with pytest.raises(IntegrityError), transaction.atomic():
        Asset.objects.create(
            type=asset_record.type,
            asset_identifier=" SHOP-001 ",
            name="Duplicate drill",
        )


def test_asset_search_prefers_exact_case_before_case_insensitive_substring(
    authenticated_client, asset_record, inventory_type
):
    lowercase_asset = Asset.objects.create(
        type=inventory_type,
        asset_identifier="shop-001",
        name="Lowercase identifier asset",
    )

    exact_response = authenticated_client.get(
        "/api/assets/",
        {"asset_identifier": "SHOP-001"},
    )
    fallback_response = authenticated_client.get(
        "/api/assets/",
        {"asset_identifier": "SHOP-00"},
    )

    assert exact_response.data["count"] == 1
    assert exact_response.data["results"][0]["asset_identifier"] == "SHOP-001"
    assert fallback_response.data["count"] == 2
    assert {
        asset["asset_identifier"] for asset in fallback_response.data["results"]
    } == {asset_record.asset_identifier, lowercase_asset.asset_identifier}


def test_model_save_normalizes_inventory_text(db):
    category = Category.objects.create(name="  Lab Gear  ")
    equipment_type = EquipmentType.objects.create(
        category=category,
        name="  Measurement Equipment  ",
        description="  Precision tools  ",
    )
    asset = Asset.objects.create(
        type=equipment_type,
        asset_identifier="  LAB-001  ",
        name="  Multimeter  ",
    )

    assert category.name == "Lab Gear"
    assert equipment_type.name == "Measurement Equipment"
    assert equipment_type.description == "Precision tools"
    assert asset.asset_identifier == "LAB-001"
    assert asset.name == "Multimeter"


def test_database_constraints_reject_untrimmed_inventory_strings(
    inventory_type,
):
    with pytest.raises(IntegrityError), transaction.atomic():
        Category.objects.bulk_create([Category(name="  New category  ")])

    with pytest.raises(IntegrityError), transaction.atomic():
        EquipmentType.objects.bulk_create(
            [EquipmentType(category=inventory_type.category, name="  New type  ")]
        )

    with pytest.raises(IntegrityError), transaction.atomic():
        Asset.objects.bulk_create(
            [
                Asset(
                    type=inventory_type,
                    asset_identifier="  SHOP-002  ",
                    name="New drill",
                )
            ]
        )

    with pytest.raises(IntegrityError), transaction.atomic():
        Asset.objects.bulk_create(
            [
                Asset(
                    type=inventory_type,
                    asset_identifier="SHOP-002",
                    name="  New drill  ",
                )
            ]
        )


def test_database_constraints_reject_empty_required_inventory_strings(
    inventory_type,
):
    with pytest.raises(IntegrityError), transaction.atomic():
        Category.objects.bulk_create([Category(name="")])

    with pytest.raises(IntegrityError), transaction.atomic():
        EquipmentType.objects.bulk_create(
            [EquipmentType(category=inventory_type.category, name="")]
        )

    with pytest.raises(IntegrityError), transaction.atomic():
        Asset.objects.bulk_create(
            [Asset(type=inventory_type, asset_identifier="", name="New drill")]
        )

    with pytest.raises(IntegrityError), transaction.atomic():
        Asset.objects.bulk_create(
            [Asset(type=inventory_type, asset_identifier="SHOP-002", name="")]
        )


def test_asset_update_changes_permitted_fields_without_creating_a_duplicate(
    authenticated_client, asset_record
):
    response = authenticated_client.patch(
        f"/api/assets/{asset_record.asset_id}/",
        {
            "name": "  Updated cordless drill  ",
            "acquisition_date": "2024-04-02",
        },
        format="json",
    )

    assert response.status_code == 200
    assert response.data["asset_identifier"] == "SHOP-001"
    assert response.data["name"] == "Updated cordless drill"
    assert response.data["status"] == Asset.Status.AVAILABLE
    assert response.data["acquisition_date"] == "2024-04-02"
    asset_record.refresh_from_db()
    assert Asset.objects.count() == 1
    assert asset_record.name == "Updated cordless drill"


def test_asset_status_cannot_be_changed_through_general_update(
    authenticated_client, asset_record
):
    response = authenticated_client.patch(
        f"/api/assets/{asset_record.asset_id}/",
        {"status": Asset.Status.ON_LOAN},
        format="json",
    )

    assert response.status_code == 400
    assert response.data == {
        "status": "Asset status must be changed through its dedicated workflow."
    }
    asset_record.refresh_from_db()
    assert asset_record.status == Asset.Status.AVAILABLE


def test_asset_update_accepts_csrf_from_configured_frontend_origin(db, asset_record):
    get_user_model().objects.create_user(
        username="shop-tech",
        password="test-password",
    )
    client = APIClient(enforce_csrf_checks=True)
    assert client.login(username="shop-tech", password="test-password")

    list_response = client.get(
        "/api/assets/",
        HTTP_ORIGIN="http://localhost:5173",
    )
    csrf_token = list_response.cookies["csrftoken"].value
    response = client.patch(
        f"/api/assets/{asset_record.asset_id}/",
        {"name": "Updated cordless drill"},
        format="json",
        HTTP_ORIGIN="http://localhost:5173",
        HTTP_X_CSRFTOKEN=csrf_token,
    )

    assert response.status_code == 200


def test_asset_identifier_cannot_be_changed_by_update(
    authenticated_client, asset_record
):
    response = authenticated_client.patch(
        f"/api/assets/{asset_record.asset_id}/",
        {"asset_identifier": "SHOP-002", "name": "Updated cordless drill"},
        format="json",
    )

    assert response.status_code == 400
    asset_record.refresh_from_db()
    assert asset_record.asset_identifier == "SHOP-001"
    assert asset_record.name == "Cordless drill"
