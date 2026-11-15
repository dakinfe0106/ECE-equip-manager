from datetime import date

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from inventory.models import Asset, Category, EquipmentType
from lending.models import Borrower, DamageFlag, DamageFlagEditAudit


@pytest.fixture
def damage_flag_client(db):
    technician = get_user_model().objects.create_user(
        username="damage-tech",
        role="TECHNICIAN",
    )
    client = APIClient()
    client.force_authenticate(user=technician)
    return client


@pytest.fixture
def damage_flag_asset(db):
    category = Category.objects.create(name="Tools")
    equipment_type = EquipmentType.objects.create(
        category=category,
        name="Power tools",
    )
    return Asset.objects.create(
        type=equipment_type,
        asset_identifier="DRILL-001",
        name="Cordless drill",
    )


def create_borrower(*, unb_id="UNB-DAMAGE", **kwargs):
    return Borrower.objects.create(
        unb_id=unb_id,
        first_name="Jordan",
        last_name="Smith",
        **kwargs,
    )


def create_flag(*, borrower, asset, reviewer, status=DamageFlag.Status.UNRESOLVED):
    flag = DamageFlag.objects.create(
        borrower=borrower,
        asset=asset,
        incident_date=date(2026, 10, 19),
        reason="Housing cracked",
        reviewed_by=reviewer,
        reviewed_at="2026-10-19T10:00:00Z",
    )
    if status == DamageFlag.Status.RESOLVED:
        flag.status = status
        flag.resolved_by = reviewer
        flag.resolved_at = "2026-10-20T10:00:00Z"
        flag.resolution_reason = "Reviewed and closed."
        flag.save()
    return flag


def test_damage_flag_list_returns_history_and_backend_summary(
    damage_flag_client, damage_flag_asset
):
    borrower = create_borrower(negligent_damage_flag=True)
    reviewer = get_user_model().objects.get(username="damage-tech")
    unresolved = create_flag(
        borrower=borrower,
        asset=damage_flag_asset,
        reviewer=reviewer,
    )
    resolved = create_flag(
        borrower=borrower,
        asset=damage_flag_asset,
        reviewer=reviewer,
        status=DamageFlag.Status.RESOLVED,
    )

    response = damage_flag_client.get(
        f"/api/borrowers/{borrower.borrower_id}/damage-flags/"
    )

    assert response.status_code == 200
    assert response.data["count"] == 2
    assert {row["damage_flag_id"] for row in response.data["results"]} == {
        unresolved.damage_flag_id,
        resolved.damage_flag_id,
    }
    assert response.data["summary"] == {
        "unresolved_count": 1,
        "warning_level": "first_warning",
        "damage_eligible": True,
    }
    assert response.data["results"][0]["reviewed"] is True
    assert response.data["results"][0]["borrower_id"] == borrower.borrower_id
    assert response.data["results"][0]["equipment_id"] == damage_flag_asset.asset_id


def test_record_requires_review_and_uses_authenticated_reviewer(
    damage_flag_client, damage_flag_asset
):
    borrower = create_borrower()
    payload = {
        "equipment_id": damage_flag_asset.asset_id,
        "incident_date": "2026-10-19",
        "reason": "  Housing cracked  ",
        "notes": "  Reviewed by technician. ",
        "reviewed": True,
    }

    response = damage_flag_client.post(
        f"/api/borrowers/{borrower.borrower_id}/damage-flags/",
        payload,
        format="json",
    )

    assert response.status_code == 201
    flag = DamageFlag.objects.get()
    assert flag.borrower == borrower
    assert flag.asset == damage_flag_asset
    assert flag.reason == "Housing cracked"
    assert flag.notes == "Reviewed by technician."
    assert flag.reviewed_by.username == "damage-tech"
    assert flag.reviewed_at is not None
    assert response.data["damage_flag"]["status"] == "unresolved"
    assert response.data["summary"] == {
        "unresolved_count": 1,
        "warning_level": "first_warning",
        "damage_eligible": True,
    }

    payload["reviewed"] = False
    response = damage_flag_client.post(
        f"/api/borrowers/{borrower.borrower_id}/damage-flags/",
        payload,
        format="json",
    )

    assert response.status_code == 400
    assert "reviewed" in response.data
    assert DamageFlag.objects.count() == 1


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("incident_date", "2026-02-30"),
        ("reason", " "),
        ("equipment_id", 999999),
    ],
)
def test_record_rejects_invalid_incident_fields(
    damage_flag_client, damage_flag_asset, field, value
):
    borrower = create_borrower()
    payload = {
        "equipment_id": damage_flag_asset.asset_id,
        "incident_date": "2026-10-19",
        "reason": "Housing cracked",
        "reviewed": True,
    }
    payload[field] = value

    response = damage_flag_client.post(
        f"/api/borrowers/{borrower.borrower_id}/damage-flags/",
        payload,
        format="json",
    )

    assert response.status_code == 400
    assert field in response.data
    assert DamageFlag.objects.count() == 0


def test_record_rejects_client_controlled_identity_and_metadata(
    damage_flag_client, damage_flag_asset
):
    borrower = create_borrower()
    response = damage_flag_client.post(
        f"/api/borrowers/{borrower.borrower_id}/damage-flags/",
        {
            "equipment_id": damage_flag_asset.asset_id,
            "incident_date": "2026-10-19",
            "reason": "Housing cracked",
            "reviewed": True,
            "borrower_id": borrower.borrower_id,
            "status": "resolved",
            "reviewed_by": 999,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "borrower_id" in response.data
    assert DamageFlag.objects.count() == 0


def test_edit_updates_same_incident_and_records_authenticated_audit(
    damage_flag_client, damage_flag_asset
):
    borrower = create_borrower()
    editor = get_user_model().objects.get(username="damage-tech")
    flag = create_flag(borrower=borrower, asset=damage_flag_asset, reviewer=editor)
    response = damage_flag_client.patch(
        f"/api/borrowers/{borrower.borrower_id}/damage-flags/{flag.damage_flag_id}/",
        {
            "reason": "Corrected reason",
            "notes": "Corrected notes",
            "incident_date": "2026-10-18",
        },
        format="json",
    )

    flag.refresh_from_db()
    audit = DamageFlagEditAudit.objects.get()
    assert response.status_code == 200
    assert DamageFlag.objects.count() == 1
    assert flag.damage_flag_id == response.data["damage_flag"]["damage_flag_id"]
    assert flag.borrower_id == borrower.borrower_id
    assert flag.status == DamageFlag.Status.UNRESOLVED
    assert flag.reviewed_by == editor
    assert flag.reason == "Corrected reason"
    assert flag.notes == "Corrected notes"
    assert flag.incident_date == date(2026, 10, 18)
    assert audit.damage_flag == flag
    assert audit.edited_by == editor
    assert set(audit.changed_fields) == {"reason", "notes", "incident_date"}
    assert audit.edited_at is not None
    assert response.data["summary"]["unresolved_count"] == 1


def test_edit_preserves_resolved_status_and_does_not_change_warning_count(
    damage_flag_client, damage_flag_asset
):
    borrower = create_borrower()
    technician = get_user_model().objects.get(username="damage-tech")
    flag = create_flag(
        borrower=borrower,
        asset=damage_flag_asset,
        reviewer=technician,
        status=DamageFlag.Status.RESOLVED,
    )

    response = damage_flag_client.patch(
        f"/api/borrowers/{borrower.borrower_id}/damage-flags/{flag.damage_flag_id}/",
        {"reason": "Corrected resolved incident"},
        format="json",
    )

    flag.refresh_from_db()
    assert response.status_code == 200
    assert flag.status == DamageFlag.Status.RESOLVED
    assert flag.resolved_by == technician
    assert flag.resolved_at is not None
    assert response.data["summary"]["unresolved_count"] == 0
    assert response.data["summary"]["damage_eligible"] is True


def test_noop_edit_does_not_create_empty_audit_record(
    damage_flag_client, damage_flag_asset
):
    borrower = create_borrower()
    technician = get_user_model().objects.get(username="damage-tech")
    flag = create_flag(borrower=borrower, asset=damage_flag_asset, reviewer=technician)

    response = damage_flag_client.patch(
        f"/api/borrowers/{borrower.borrower_id}/damage-flags/{flag.damage_flag_id}/",
        {"reason": flag.reason},
        format="json",
    )

    assert response.status_code == 200
    assert DamageFlagEditAudit.objects.count() == 0


def test_edit_can_keep_a_soft_deleted_incident_asset_without_reactivating_it(
    damage_flag_client, damage_flag_asset
):
    borrower = create_borrower()
    technician = get_user_model().objects.get(username="damage-tech")
    flag = create_flag(borrower=borrower, asset=damage_flag_asset, reviewer=technician)
    damage_flag_asset.is_deleted = True
    damage_flag_asset.save(update_fields=("is_deleted",))

    response = damage_flag_client.patch(
        f"/api/borrowers/{borrower.borrower_id}/damage-flags/{flag.damage_flag_id}/",
        {
            "equipment_id": damage_flag_asset.asset_id,
            "reason": "Corrected reason",
        },
        format="json",
    )

    assert response.status_code == 200
    assert response.data["damage_flag"]["equipment_id"] == damage_flag_asset.asset_id
    assert response.data["damage_flag"]["reason"] == "Corrected reason"


def test_resolve_requires_reason_and_keeps_history(
    damage_flag_client, damage_flag_asset
):
    borrower = create_borrower()
    technician = get_user_model().objects.get(username="damage-tech")
    flag = create_flag(borrower=borrower, asset=damage_flag_asset, reviewer=technician)
    url = (
        f"/api/borrowers/{borrower.borrower_id}/damage-flags/"
        f"{flag.damage_flag_id}/"
    )

    missing_reason = damage_flag_client.post(url, {}, format="json")
    assert missing_reason.status_code == 400

    response = damage_flag_client.post(
        url,
        {"resolution_reason": "  Corrected after review. "},
        format="json",
    )

    flag.refresh_from_db()
    assert response.status_code == 200
    assert DamageFlag.objects.count() == 1
    assert flag.status == DamageFlag.Status.RESOLVED
    assert flag.resolved_by == technician
    assert flag.resolved_at is not None
    assert flag.resolution_reason == "Corrected after review."
    assert response.data["summary"] == {
        "unresolved_count": 0,
        "warning_level": "no_warning",
        "damage_eligible": True,
    }

    repeated = damage_flag_client.post(
        url,
        {"resolution_reason": "Already resolved."},
        format="json",
    )
    assert repeated.status_code == 400
    assert DamageFlag.objects.count() == 1


@pytest.mark.parametrize(
    ("count", "warning_level", "damage_eligible"),
    [
        (0, "no_warning", True),
        (1, "first_warning", True),
        (2, "final_warning", True),
        (3, "ineligible", False),
        (4, "ineligible", False),
    ],
)
def test_borrower_detail_calculates_only_unresolved_incident_status(
    damage_flag_client,
    damage_flag_asset,
    count,
    warning_level,
    damage_eligible,
):
    borrower = create_borrower(negligent_damage_flag=True)
    technician = get_user_model().objects.get(username="damage-tech")
    for index in range(count):
        create_flag(
            borrower=borrower,
            asset=damage_flag_asset,
            reviewer=technician,
        )
    create_flag(
        borrower=borrower,
        asset=damage_flag_asset,
        reviewer=technician,
        status=DamageFlag.Status.RESOLVED,
    )

    response = damage_flag_client.get(f"/api/borrowers/{borrower.borrower_id}/")

    assert response.status_code == 200
    assert response.data["negligent_damage_flag"] is True
    assert response.data["unresolved_damage_flag_count"] == count
    assert response.data["damage_warning_level"] == warning_level
    assert response.data["damage_eligible"] is damage_eligible
    assert "is_eligible" not in response.data


def test_damage_flag_endpoints_reject_unauthorized_or_out_of_scope_records(
    damage_flag_asset,
):
    faculty = get_user_model().objects.create_user(
        username="damage-faculty",
        role="FACULTY",
    )
    borrower = create_borrower()
    technician = get_user_model().objects.create_user(
        username="damage-owner",
        role="TECHNICIAN",
    )
    flag = create_flag(borrower=borrower, asset=damage_flag_asset, reviewer=technician)
    client = APIClient()

    assert client.get(
        f"/api/borrowers/{borrower.borrower_id}/damage-flags/"
    ).status_code == 403

    client.force_authenticate(user=faculty)
    assert client.get(
        f"/api/borrowers/{borrower.borrower_id}/damage-flags/"
    ).status_code == 403
    assert client.patch(
        f"/api/borrowers/{borrower.borrower_id}/damage-flags/{flag.damage_flag_id}/",
        {"reason": "No access"},
        format="json",
    ).status_code == 403

    client.force_authenticate(user=technician)
    assert client.get("/api/borrowers/999999/damage-flags/").status_code == 404
    assert client.patch(
        f"/api/borrowers/{borrower.borrower_id}/damage-flags/999999/",
        {"reason": "Missing"},
        format="json",
    ).status_code == 404

    other_borrower = create_borrower(unb_id="UNB-OTHER")
    assert client.patch(
        f"/api/borrowers/{other_borrower.borrower_id}/damage-flags/{flag.damage_flag_id}/",
        {"reason": "Wrong borrower"},
        format="json",
    ).status_code == 404

    borrower.is_deleted = True
    borrower.save(update_fields=("is_deleted",))
    assert client.get(
        f"/api/borrowers/{borrower.borrower_id}/damage-flags/"
    ).status_code == 404
    assert client.post(
        f"/api/borrowers/{borrower.borrower_id}/damage-flags/",
        {},
        format="json",
    ).status_code == 404
