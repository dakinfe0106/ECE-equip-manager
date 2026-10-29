
from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.urls import reverse
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
        role='TECHNICIAN',
        username="shop-tech",
        password="test-password",
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def test_dashboard_returns_zero_counts_for_authenticated_session(db):
    user = get_user_model().objects.create_user(username="dashboard-tech", role="TECHNICIAN")
    client = APIClient(enforce_csrf_checks=True)
    client.force_login(user)

    response = client.get("/api/dashboard/")

    assert response.status_code == 200
    assert response.json() == {
        "total_assets": 0,
        "available_assets": 0,
        "on_loan_assets": 0,
        "under_maintenance_assets": 0,
    }


def test_dashboard_requires_authentication():
    assert APIClient().get("/api/dashboard/").status_code == 403


def test_dashboard_counts_mixed_statuses(authenticated_client, inventory_type):
    statuses = (
        [Asset.Status.AVAILABLE] * 21
        + [Asset.Status.ON_LOAN] * 2
        + [Asset.Status.UNDER_MAINTENANCE] * 3
        + [Asset.Status.RETIRED] * 4
    )
    Asset.objects.bulk_create([
        Asset(
            type=inventory_type,
            asset_identifier=f"DASH-{index}",
            name=f"Dashboard asset {index}",
            status=asset_status,
        )
        for index, asset_status in enumerate(statuses)
    ])

    response = authenticated_client.get("/api/dashboard/")

    assert response.status_code == 200
    assert response.json() == {
        "total_assets": 26,
        "available_assets": 21,
        "on_loan_assets": 2,
        "under_maintenance_assets": 3,
    }


@pytest.mark.parametrize("excluded_record", ["retired", "asset", "equipment_type", "category"])
@pytest.mark.parametrize("asset_status", [
    Asset.Status.AVAILABLE,
    Asset.Status.ON_LOAN,
    Asset.Status.UNDER_MAINTENANCE,
])
def test_dashboard_excludes_ineligible_inventory(
    authenticated_client, asset_record, excluded_record, asset_status
):
    asset_record.status = asset_status
    asset_record.save(update_fields=["status"])
    if excluded_record == "retired":
        asset_record.status = Asset.Status.RETIRED
        asset_record.save(update_fields=["status"])
    else:
        record = {
            "asset": asset_record,
            "equipment_type": asset_record.type,
            "category": asset_record.type.category,
        }[excluded_record]
        record.is_deleted = True
        record.save(update_fields=["is_deleted"])

    response = authenticated_client.get("/api/dashboard/")

    assert response.status_code == 200
    assert response.json() == {
        "total_assets": 0,
        "available_assets": 0,
        "on_loan_assets": 0,
        "under_maintenance_assets": 0,
    }


def test_dashboard_reflects_persisted_status_changes(authenticated_client, asset_record):
    for asset_status in Asset.Status.values:
        asset_record.status = asset_status
        asset_record.save(update_fields=["status"])

        response = authenticated_client.get("/api/dashboard/")

        assert response.status_code == 200
        assert response.json() == {
            "total_assets": int(asset_status != Asset.Status.RETIRED),
            "available_assets": int(asset_status == Asset.Status.AVAILABLE),
            "on_loan_assets": int(asset_status == Asset.Status.ON_LOAN),
            "under_maintenance_assets": int(asset_status == Asset.Status.UNDER_MAINTENANCE),
        }


@pytest.mark.parametrize("method", ["post", "put", "patch", "delete"])
def test_dashboard_rejects_write_methods(authenticated_client, asset_record, method):
    response = getattr(authenticated_client, method)("/api/dashboard/", {}, format="json")

    assert response.status_code == 405
    asset_record.refresh_from_db()
    assert asset_record.status == Asset.Status.AVAILABLE
    assert Asset.objects.count() == 1


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


def test_asset_list_search_matches_name_case_insensitively(
    authenticated_client, asset_record
):
    response = authenticated_client.get("/api/assets/", {"search": "  CORDLESS DR  "})

    assert response.status_code == 200
    assert response.data["count"] == 1
    assert response.data["results"][0]["asset_id"] == asset_record.asset_id


def test_asset_list_search_matches_identifier_or_name(
    authenticated_client, asset_record, inventory_type
):
    Asset.objects.create(
        type=inventory_type,
        asset_identifier="SHOP-010",
        name="Circular saw",
    )

    by_identifier = authenticated_client.get("/api/assets/", {"search": "shop-010"})
    by_name = authenticated_client.get("/api/assets/", {"search": "CIRCULAR"})

    assert by_identifier.data["count"] == 1
    assert by_identifier.data["results"][0]["asset_identifier"] == "SHOP-010"
    assert by_name.data["count"] == 1
    assert by_name.data["results"][0]["name"] == "Circular saw"


def test_asset_list_combines_search_category_and_equipment_type_filters(
    authenticated_client, asset_record, inventory_type
):
    other_category = Category.objects.create(name="Electronics")
    other_type = EquipmentType.objects.create(
        category=other_category,
        name="Oscilloscope",
    )
    Asset.objects.create(
        type=other_type,
        asset_identifier="SHOP-002",
        name="Cordless drill",
    )

    response = authenticated_client.get(
        "/api/assets/",
        {
            "search": "cordless",
            "category_id": inventory_type.category_id,
            "equipment_type_id": inventory_type.type_id,
        },
    )

    assert response.status_code == 200
    assert response.data["count"] == 1
    assert response.data["results"][0]["asset_id"] == asset_record.asset_id


def test_asset_list_category_and_equipment_type_filters_work_independently(
    authenticated_client, asset_record, inventory_type
):
    other_type = EquipmentType.objects.create(
        category=inventory_type.category,
        name="Hand tools",
    )
    other_asset = Asset.objects.create(
        type=other_type,
        asset_identifier="SHOP-002",
        name="Hammer",
    )

    category_results = authenticated_client.get(
        "/api/assets/",
        {"category_id": inventory_type.category_id},
    )
    type_results = authenticated_client.get(
        "/api/assets/",
        {"equipment_type_id": other_type.type_id},
    )
    no_results = authenticated_client.get(
        "/api/assets/",
        {"equipment_type_id": 99999},
    )

    assert category_results.data["count"] == 2
    assert {row["asset_id"] for row in category_results.data["results"]} == {
        asset_record.asset_id,
        other_asset.asset_id,
    }
    assert type_results.data["count"] == 1
    assert type_results.data["results"][0]["asset_id"] == other_asset.asset_id
    assert no_results.data["count"] == 0


@pytest.mark.parametrize(
    ("query", "field"),
    [
        ({"category_id": "not-an-id"}, "category_id"),
        ({"equipment_type_id": "not-an-id"}, "equipment_type_id"),
    ],
)
def test_asset_list_rejects_invalid_filter_ids(authenticated_client, query, field):
    response = authenticated_client.get("/api/assets/", query)

    assert response.status_code == 400
    assert field in response.data


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


def test_authenticated_user_with_unsupported_role_is_denied(db):
    user = get_user_model().objects.create_user(
        role='FACULTY',
        username="unassigned-user",
        password="test-password",
    )
    user.role = "UNSUPPORTED"
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get("/api/assets/")

    assert response.status_code == 403


def test_faculty_can_view_inventory_but_cannot_create_assets(
    db, inventory_type
):
    user = get_user_model().objects.create_user(
        role='FACULTY',
        username="faculty-user",
        password="test-password",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    list_response = client.get("/api/assets/")
    create_response = client.post(
        "/api/assets/",
        {
            "asset_identifier": "FACULTY-CANNOT-CREATE",
            "name": "Restricted asset",
            "equipment_type_id": inventory_type.type_id,
        },
        format="json",
    )

    assert list_response.status_code == 200
    assert create_response.status_code == 403


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


def test_asset_identifier_is_case_insensitive_unique_including_soft_deleted(
    db, asset_record
):
    asset_record.is_deleted = True
    asset_record.save(update_fields=["is_deleted"])

    for duplicate_identifier in (" SHOP-001 ", "shop-001", "Shop-001"):
        with pytest.raises(IntegrityError), transaction.atomic():
            Asset.objects.create(
                type=asset_record.type,
                asset_identifier=duplicate_identifier,
                name="Duplicate drill",
            )


def test_asset_search_matches_identifier_case_insensitively(
    authenticated_client, asset_record
):
    for query in ("SHOP-001", "shop-001", "Shop-00"):
        response = authenticated_client.get(
            "/api/assets/",
            {"asset_identifier": query},
        )

        assert response.data["count"] == 1
        assert response.data["results"][0]["asset_identifier"] == "SHOP-001"


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
        role='TECHNICIAN',
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


def test_category_list_returns_only_active_categories(authenticated_client, inventory_type):
    deleted_category = Category.objects.create(name="Retired category", is_deleted=True)

    response = authenticated_client.get("/api/categories/")

    assert response.status_code == 200
    assert response.data == [
        {"category_id": inventory_type.category.category_id, "name": "Tools"}
    ]
    assert deleted_category.category_id not in [item["category_id"] for item in response.data]


def test_equipment_type_list_filters_by_category_and_hides_deleted_records(
    authenticated_client, inventory_type
):
    another_category = Category.objects.create(name="Electronics")
    another_type = EquipmentType.objects.create(
        category=another_category,
        name="Computer",
    )
    EquipmentType.objects.create(
        category=inventory_type.category,
        name="Old type",
        is_deleted=True,
    )

    response = authenticated_client.get(
        "/api/equipment-types/",
        {"category_id": inventory_type.category.category_id},
    )

    assert response.status_code == 200
    assert [item["type_id"] for item in response.data] == [inventory_type.type_id]
    assert response.data[0]["category_id"] == inventory_type.category.category_id
    assert another_type.type_id not in [item["type_id"] for item in response.data]


def test_equipment_type_list_rejects_a_non_numeric_category_id(authenticated_client):
    response = authenticated_client.get(
        "/api/equipment-types/",
        {"category_id": "not-a-number"},
    )

    assert response.status_code == 400
    assert "category_id" in response.data


def test_asset_create_trims_fields_and_defaults_status_to_available(
    authenticated_client, inventory_type
):
    response = authenticated_client.post(
        "/api/assets/",
        {
            "asset_identifier": "  SHOP-NEW-001  ",
            "name": "  Digital multimeter  ",
            "equipment_type_id": inventory_type.type_id,
            "acquisition_date": "2025-06-10",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["asset_identifier"] == "SHOP-NEW-001"
    assert response.data["name"] == "Digital multimeter"
    assert response.data["status"] == Asset.Status.AVAILABLE
    assert response.data["equipment_type"]["type_id"] == inventory_type.type_id
    created_asset = Asset.objects.get(asset_id=response.data["asset_id"])
    assert created_asset.acquisition_date == date(2025, 6, 10)


def test_asset_create_rejects_duplicate_identifier_even_if_deleted(
    authenticated_client, asset_record
):
    asset_record.is_deleted = True
    asset_record.save(update_fields=["is_deleted"])

    response = authenticated_client.post(
        "/api/assets/",
        {
            "asset_identifier": " SHOP-001 ",
            "name": "Duplicate drill",
            "equipment_type_id": asset_record.type_id,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "asset_identifier" in response.data


def test_asset_create_rejects_case_variant_identifier(
    authenticated_client, asset_record
):
    response = authenticated_client.post(
        "/api/assets/",
        {
            "asset_identifier": "shop-001",
            "name": "Case variant drill",
            "equipment_type_id": asset_record.type_id,
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.data["asset_identifier"] == [
        "An asset with this Asset ID already exists."
    ]
    assert Asset.objects.count() == 1


def test_asset_create_rejects_inactive_equipment_type(
    authenticated_client, inventory_type
):
    inventory_type.is_deleted = True
    inventory_type.save(update_fields=["is_deleted"])

    response = authenticated_client.post(
        "/api/assets/",
        {
            "asset_identifier": "SHOP-NEW-002",
            "name": "Digital multimeter",
            "equipment_type_id": inventory_type.type_id,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "equipment_type_id" in response.data


def test_asset_create_does_not_allow_client_to_set_status(
    authenticated_client, inventory_type
):
    response = authenticated_client.post(
        "/api/assets/",
        {
            "asset_identifier": "SHOP-NEW-003",
            "name": "Digital multimeter",
            "equipment_type_id": inventory_type.type_id,
            "status": Asset.Status.RETIRED,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "status" in response.data


def test_asset_create_requires_authentication(inventory_type):
    response = APIClient().post(
        "/api/assets/",
        {
            "asset_identifier": "SHOP-NEW-004",
            "name": "Digital multimeter",
            "equipment_type_id": inventory_type.type_id,
        },
        format="json",
    )

    assert response.status_code == 403


def test_asset_create_accepts_valid_csrf_session(
    db, inventory_type
):
    get_user_model().objects.create_user(
        role='TECHNICIAN',
        username="shop-tech",
        password="test-password",
    )
    client = APIClient(enforce_csrf_checks=True)
    assert client.login(username="shop-tech", password="test-password")
    categories_response = client.get(
        "/api/categories/",
        HTTP_ORIGIN="http://localhost:5173",
    )
    csrf_token = categories_response.cookies["csrftoken"].value

    response = client.post(
        "/api/assets/",
        {
            "asset_identifier": "SHOP-CSRF-001",
            "name": "CSRF protected asset",
            "equipment_type_id": inventory_type.type_id,
        },
        format="json",
        HTTP_ORIGIN="http://localhost:5173",
        HTTP_X_CSRFTOKEN=csrf_token,
    )

    assert response.status_code == 201


@pytest.fixture
def api_client(db):
    """An API client logged in as a synthetic user."""
    user = get_user_model().objects.create_user(
        role='TECHNICIAN',
        username="category-tech",
        password="not-a-real-password",
    )
    client = APIClient()
    client.force_login(user)
    return client


@pytest.fixture
def anonymous_client(db):
    return APIClient()


def make_category(name, *, is_deleted=False):
    return Category.objects.create(name=name, is_deleted=is_deleted)


def make_type(category, name, *, description="", is_deleted=False):
    return EquipmentType.objects.create(
        category=category,
        name=name,
        description=description,
        is_deleted=is_deleted,
    )


def names(response):
    return [item["name"] for item in response.json()]


def test_category_list_requires_authentication(anonymous_client):
    response = anonymous_client.get(reverse("category-summary-list"))

    assert response.status_code == 403


def test_category_list_returns_the_fields_shown_on_the_categories_screen(api_client):
    category = make_category("Tools")

    response = api_client.get(reverse("category-summary-list"))

    assert response.status_code == 200
    assert response.json() == [
        {
            "category_id": category.category_id,
            "name": "Tools",
            "is_deleted": False,
            "equipment_type_count": 0,
        }
    ]


def test_category_list_shows_active_categories_only_by_default(api_client):
    make_category("Tools")
    make_category("Old Stock", is_deleted=True)

    response = api_client.get(reverse("category-summary-list"))

    assert names(response) == ["Tools"]


def test_category_list_is_ordered_by_id_ascending(api_client):
    first = make_category("power")
    second = make_category("Computing")
    third = make_category("Tools")

    response = api_client.get(reverse("category-summary-list"))

    ids = [item["category_id"] for item in response.json()]
    assert ids == [first.category_id, second.category_id, third.category_id]
    assert ids == sorted(ids)
    assert names(response) == ["power", "Computing", "Tools"]


def test_category_list_deleted_true_shows_soft_deleted_categories_only(api_client):
    make_category("Tools")
    make_category("Old Stock", is_deleted=True)

    response = api_client.get(reverse("category-summary-list"), {"deleted": "true"})

    assert response.status_code == 200
    assert names(response) == ["Old Stock"]
    assert response.json()[0]["is_deleted"] is True


def test_category_list_deleted_all_shows_active_and_soft_deleted_categories(
    api_client,
):
    make_category("Tools")
    make_category("Old Stock", is_deleted=True)

    response = api_client.get(reverse("category-summary-list"), {"deleted": "all"})

    assert names(response) == ["Tools", "Old Stock"]


def test_category_list_rejects_an_unknown_deleted_value_with_a_field_error(
    api_client,
):
    response = api_client.get(reverse("category-summary-list"), {"deleted": "maybe"})

    assert response.status_code == 400
    assert "deleted" in response.json()


def test_category_list_search_ignores_surrounding_whitespace(api_client):
    make_category("Lab Gear")
    make_category("Tools")

    response = api_client.get(reverse("category-summary-list"), {"search": "  gear "})

    assert names(response) == ["Lab Gear"]


def test_category_list_search_with_no_match_is_empty(api_client):
    make_category("Tools")

    response = api_client.get(reverse("category-summary-list"), {"search": "zzz"})

    assert response.status_code == 200
    assert response.json() == []


def test_category_list_search_applies_within_the_selected_deleted_filter(api_client):
    make_category("Power")
    make_category("Power Tools", is_deleted=True)

    active = api_client.get(reverse("category-summary-list"), {"search": "power"})
    deleted = api_client.get(
        reverse("category-summary-list"), {"search": "power", "deleted": "true"}
    )
    everything = api_client.get(
        reverse("category-summary-list"), {"search": "power", "deleted": "all"}
    )

    assert names(active) == ["Power"]
    assert names(deleted) == ["Power Tools"]
    assert names(everything) == ["Power", "Power Tools"]


def test_category_list_type_count_includes_active_types_only(api_client):
    category = make_category("Lab Gear")
    make_type(category, "Oscilloscope")
    make_type(category, "Multimeter")
    make_type(category, "Retired Probe", is_deleted=True)
    make_category("Tools")

    response = api_client.get(reverse("category-summary-list"))

    counts = {item["name"]: item["equipment_type_count"] for item in response.json()}
    assert counts == {"Lab Gear": 2, "Tools": 0}


def test_category_equipment_types_require_authentication(anonymous_client):
    category = make_category("Tools")

    response = anonymous_client.get(
        reverse("category-equipment-type-list", args=[category.category_id])
    )

    assert response.status_code == 403


def test_category_equipment_types_lists_active_types_of_that_category_by_id(
    api_client,
):
    lab_gear = make_category("Lab Gear")
    tools = make_category("Tools")
    scope = make_type(lab_gear, "Oscilloscope", description="Bench scope")
    make_type(lab_gear, "Multimeter")
    make_type(lab_gear, "Retired Probe", is_deleted=True)
    make_type(tools, "Screwdriver")

    response = api_client.get(
        reverse("category-equipment-type-list", args=[lab_gear.category_id])
    )

    assert response.status_code == 200
    assert names(response) == ["Oscilloscope", "Multimeter"]
    first = response.json()[0]
    assert first["type_id"] == scope.type_id
    assert first["description"] == "Bench scope"
    assert first["category"] == {
        "category_id": lab_gear.category_id,
        "name": "Lab Gear",
    }


def test_category_equipment_types_is_empty_for_a_category_without_types(api_client):
    category = make_category("Tools")

    response = api_client.get(
        reverse("category-equipment-type-list", args=[category.category_id])
    )

    assert response.status_code == 200
    assert response.json() == []


def test_category_equipment_types_of_a_soft_deleted_category_still_show_active_types(
    api_client,
):
    category = make_category("Old Stock", is_deleted=True)
    make_type(category, "Spare Cable")

    response = api_client.get(
        reverse("category-equipment-type-list", args=[category.category_id])
    )

    assert response.status_code == 200
    assert names(response) == ["Spare Cable"]


def test_category_equipment_types_returns_404_for_an_unknown_category(api_client):
    response = api_client.get(reverse("category-equipment-type-list", args=[999999]))

    assert response.status_code == 404
