
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
        equipment_type=inventory_type,
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
                "type_id": asset_record.equipment_type.type_id,
                "name": "Power tools",
                "description": "Portable power tools",
                "category": {
                    "category_id": asset_record.equipment_type.category.category_id,
                    "name": "Tools",
                },
            },
        },
    ]


def test_asset_list_search_matches_identifier_substring_case_insensitively(
    authenticated_client, asset_record, inventory_type
):
    second_asset = Asset.objects.create(
        equipment_type=inventory_type,
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
        equipment_type=inventory_type,
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
        "equipment_type": asset_record.equipment_type,
        "category": asset_record.equipment_type.category,
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


def test_asset_list_paginates_twenty_records_per_page(
    authenticated_client, inventory_type
):
    Asset.objects.bulk_create(
        [
            Asset(
                equipment_type=inventory_type,
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


def test_asset_identifier_is_case_insensitive_unique_including_soft_deleted(
    db, asset_record
):
    asset_record.is_deleted = True
    asset_record.save(update_fields=["is_deleted"])

    with pytest.raises(IntegrityError), transaction.atomic():
        Asset.objects.create(
            equipment_type=asset_record.equipment_type,
            asset_identifier=" shop-001 ",
            name="Duplicate drill",
        )
