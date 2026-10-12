import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from .models import Category, EquipmentType

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    """An API client logged in as a synthetic user."""
    user = get_user_model().objects.create_user(username="tech", password="not-a-real-password")
    client = APIClient()
    client.force_login(user)
    return client


@pytest.fixture
def anonymous_client():
    return APIClient()


def make_category(name, *, is_deleted=False):
    return Category.objects.create(name=name, is_deleted=is_deleted)


def make_type(category, name, *, description="", is_deleted=False):
    return EquipmentType.objects.create(
        category=category, name=name, description=description, is_deleted=is_deleted
    )


def names(response):
    return [item["name"] for item in response.json()]


class TestCategoryListAuthentication:
    def test_anonymous_request_is_rejected_with_403(self, anonymous_client):
        response = anonymous_client.get(reverse("category-list"))

        assert response.status_code == 403


class TestCategoryList:
    def test_returns_the_fields_shown_on_the_categories_screen(self, api_client):
        category = make_category("Tools")

        response = api_client.get(reverse("category-list"))

        assert response.status_code == 200
        assert response.json() == [
            {
                "category_id": category.category_id,
                "name": "Tools",
                "is_deleted": False,
                "equipment_type_count": 0,
            }
        ]

    def test_returns_an_empty_list_when_there_are_no_categories(self, api_client):
        response = api_client.get(reverse("category-list"))

        assert response.status_code == 200
        assert response.json() == []

    def test_lists_active_categories_only_by_default(self, api_client):
        make_category("Tools")
        make_category("Old Stock", is_deleted=True)

        response = api_client.get(reverse("category-list"))

        assert names(response) == ["Tools"]

    def test_sorts_by_name_ignoring_case(self, api_client):
        make_category("power")
        make_category("Computing")
        make_category("Tools")

        response = api_client.get(reverse("category-list"))

        assert names(response) == ["Computing", "power", "Tools"]

    def test_deleted_true_lists_soft_deleted_categories_only(self, api_client):
        make_category("Tools")
        make_category("Old Stock", is_deleted=True)

        response = api_client.get(reverse("category-list"), {"deleted": "true"})

        assert response.status_code == 200
        assert names(response) == ["Old Stock"]
        assert response.json()[0]["is_deleted"] is True

    def test_deleted_all_lists_active_and_soft_deleted_categories(self, api_client):
        make_category("Tools")
        make_category("Old Stock", is_deleted=True)

        response = api_client.get(reverse("category-list"), {"deleted": "all"})

        assert names(response) == ["Old Stock", "Tools"]

    def test_deleted_false_lists_active_categories(self, api_client):
        make_category("Tools")
        make_category("Old Stock", is_deleted=True)

        response = api_client.get(reverse("category-list"), {"deleted": "false"})

        assert names(response) == ["Tools"]

    def test_unknown_deleted_value_returns_400_with_a_field_error(self, api_client):
        response = api_client.get(reverse("category-list"), {"deleted": "maybe"})

        assert response.status_code == 400
        assert "deleted" in response.json()

    def test_search_matches_part_of_the_name_ignoring_case(self, api_client):
        make_category("Lab Gear")
        make_category("Computing")
        make_category("Communication")

        response = api_client.get(reverse("category-list"), {"search": "COM"})

        assert names(response) == ["Communication", "Computing"]

    def test_search_ignores_surrounding_whitespace(self, api_client):
        make_category("Lab Gear")
        make_category("Tools")

        response = api_client.get(reverse("category-list"), {"search": "  gear "})

        assert names(response) == ["Lab Gear"]

    def test_blank_search_returns_everything(self, api_client):
        make_category("Lab Gear")
        make_category("Tools")

        response = api_client.get(reverse("category-list"), {"search": "   "})

        assert names(response) == ["Lab Gear", "Tools"]

    def test_search_with_no_match_returns_an_empty_list(self, api_client):
        make_category("Tools")

        response = api_client.get(reverse("category-list"), {"search": "zzz"})

        assert response.status_code == 200
        assert response.json() == []

    def test_search_treats_percent_and_underscore_as_plain_characters(self, api_client):
        make_category("Tools")
        make_category("100% Cotton")
        make_category("A_B")

        percent = api_client.get(reverse("category-list"), {"search": "%"})
        underscore = api_client.get(reverse("category-list"), {"search": "_"})

        assert names(percent) == ["100% Cotton"]
        assert names(underscore) == ["A_B"]

    def test_search_applies_within_the_selected_deleted_filter(self, api_client):
        make_category("Power")
        make_category("Power Tools", is_deleted=True)

        active = api_client.get(reverse("category-list"), {"search": "power"})
        deleted = api_client.get(
            reverse("category-list"), {"search": "power", "deleted": "true"}
        )
        everything = api_client.get(
            reverse("category-list"), {"search": "power", "deleted": "all"}
        )

        assert names(active) == ["Power"]
        assert names(deleted) == ["Power Tools"]
        assert names(everything) == ["Power", "Power Tools"]

    def test_equipment_type_count_includes_active_types_only(self, api_client):
        category = make_category("Lab Gear")
        make_type(category, "Oscilloscope")
        make_type(category, "Multimeter")
        make_type(category, "Retired Probe", is_deleted=True)
        make_category("Tools")

        response = api_client.get(reverse("category-list"))

        counts = {item["name"]: item["equipment_type_count"] for item in response.json()}
        assert counts == {"Lab Gear": 2, "Tools": 0}


class TestCategoryDetail:
    def test_anonymous_request_is_rejected_with_403(self, anonymous_client):
        category = make_category("Tools")

        response = anonymous_client.get(reverse("category-detail", args=[category.category_id]))

        assert response.status_code == 403

    def test_returns_one_category_with_its_active_type_count(self, api_client):
        category = make_category("Lab Gear")
        make_type(category, "Oscilloscope")
        make_type(category, "Retired Probe", is_deleted=True)

        response = api_client.get(reverse("category-detail", args=[category.category_id]))

        assert response.status_code == 200
        assert response.json() == {
            "category_id": category.category_id,
            "name": "Lab Gear",
            "is_deleted": False,
            "equipment_type_count": 1,
        }

    def test_a_soft_deleted_category_can_still_be_viewed(self, api_client):
        category = make_category("Old Stock", is_deleted=True)

        response = api_client.get(reverse("category-detail", args=[category.category_id]))

        assert response.status_code == 200
        assert response.json()["is_deleted"] is True

    def test_unknown_category_returns_404(self, api_client):
        response = api_client.get(reverse("category-detail", args=[999999]))

        assert response.status_code == 404


class TestCategoryEquipmentTypeList:
    def test_anonymous_request_is_rejected_with_403(self, anonymous_client):
        category = make_category("Tools")

        response = anonymous_client.get(
            reverse("category-equipment-type-list", args=[category.category_id])
        )

        assert response.status_code == 403

    def test_lists_the_active_types_of_that_category_sorted_by_name(self, api_client):
        lab_gear = make_category("Lab Gear")
        tools = make_category("Tools")
        make_type(lab_gear, "Oscilloscope", description="Bench scope")
        make_type(lab_gear, "Multimeter")
        make_type(lab_gear, "Retired Probe", is_deleted=True)
        make_type(tools, "Screwdriver")

        response = api_client.get(
            reverse("category-equipment-type-list", args=[lab_gear.category_id])
        )

        assert response.status_code == 200
        assert names(response) == ["Multimeter", "Oscilloscope"]
        scope = response.json()[1]
        assert scope["type_id"] == EquipmentType.objects.get(name="Oscilloscope").type_id
        assert scope["description"] == "Bench scope"
        assert scope["category"] == {"category_id": lab_gear.category_id, "name": "Lab Gear"}

    def test_a_category_without_types_returns_an_empty_list(self, api_client):
        category = make_category("Tools")

        response = api_client.get(
            reverse("category-equipment-type-list", args=[category.category_id])
        )

        assert response.status_code == 200
        assert response.json() == []

    def test_a_soft_deleted_category_still_shows_its_active_types(self, api_client):
        category = make_category("Old Stock", is_deleted=True)
        make_type(category, "Spare Cable")

        response = api_client.get(
            reverse("category-equipment-type-list", args=[category.category_id])
        )

        assert response.status_code == 200
        assert names(response) == ["Spare Cable"]

    def test_unknown_category_returns_404(self, api_client):
        response = api_client.get(reverse("category-equipment-type-list", args=[999999]))

        assert response.status_code == 404
