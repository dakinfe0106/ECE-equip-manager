from datetime import date

import pytest

from lending.damage_flags import (
    borrower_is_eligible,
    can_record_damage_flag,
    count_unresolved_flags,
    create_damage_flag_record,
    damaged_return_does_not_auto_create_flag,
    resolve_damage_flag,
    validate_damage_flag_input,
)


@pytest.fixture
def valid_payload():
    return {
        "borrower_id": 42,
        "borrower_name": "Jordan Smith",
        "equipment_id": 7,
        "equipment_name": "Cordless drill",
        "incident_date": "2026-01-12",
        "reason": "Returned with cracked housing",
        "notes": "Parts were missing when checked in.",
        "reviewed": True,
    }


def test_validate_damage_flag_requires_review_confirmation(valid_payload):
    payload = dict(valid_payload)
    payload["reviewed"] = False

    with pytest.raises(ValueError, match="review"):
        validate_damage_flag_input(payload)


def test_validate_damage_flag_requires_reason(valid_payload):
    payload = dict(valid_payload)
    payload["reason"] = "   "

    with pytest.raises(ValueError, match="Reason"):
        validate_damage_flag_input(payload)


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("borrower_id", 0, "Borrower"),
        ("borrower_id", True, "Borrower"),
        ("equipment_id", None, "Equipment"),
        ("equipment_id", "not-an-id", "Equipment"),
        ("equipment_id", -1, "Equipment"),
        ("incident_date", "2026-02-30", "Incident date"),
        ("incident_date", "20260112", "YYYY-MM-DD"),
        ("incident_date", None, "Incident date"),
        ("reviewed", "false", "review"),
        ("reviewed", 1, "review"),
        ("reviewed", False, "review"),
    ],
)
def test_validate_damage_flag_rejects_invalid_required_values(valid_payload, field, value, message):
    payload = dict(valid_payload)
    payload[field] = value

    with pytest.raises((TypeError, ValueError), match=message):
        validate_damage_flag_input(payload)


@pytest.mark.parametrize(
    ("field", "message"),
    [
        ("borrower_id", "Borrower"),
        ("borrower_name", "Borrower name"),
        ("equipment_id", "Equipment"),
        ("incident_date", "Incident date"),
        ("reason", "Reason"),
        ("reviewed", "review"),
    ],
)
def test_validate_damage_flag_rejects_missing_required_values(valid_payload, field, message):
    payload = dict(valid_payload)
    del payload[field]

    with pytest.raises((TypeError, ValueError), match=message):
        validate_damage_flag_input(payload)


def test_validate_damage_flag_parses_iso_date_and_positive_equipment_id(valid_payload):
    draft = validate_damage_flag_input(valid_payload)

    assert draft.incident_date == date(2026, 1, 12)
    assert draft.equipment_id == 7


def test_validate_damage_flag_rejects_frontend_reviewer_identity(valid_payload):
    payload = {**valid_payload, "reviewed_by": "untrusted-user"}

    with pytest.raises(ValueError, match="authenticated server"):
        validate_damage_flag_input(payload)


def test_create_damage_flag_record_preserves_history(valid_payload):
    draft = validate_damage_flag_input(valid_payload)
    flag = create_damage_flag_record(
        draft,
        flag_id="flag-1",
        created_at="2026-01-12T09:00:00Z",
        reviewed_by="authenticated-tech",
    )

    assert flag.status == "unresolved"
    assert flag.borrower_name == "Jordan Smith"
    assert flag.reviewed is True
    assert flag.reviewed_by == "authenticated-tech"


def test_count_unresolved_flags_excludes_resolved_records(valid_payload):
    draft = validate_damage_flag_input(valid_payload)
    unresolved = create_damage_flag_record(draft, flag_id="flag-1")
    resolved = resolve_damage_flag(unresolved, resolved_by="tech-02", resolved_at="2026-01-13T10:00:00Z")

    assert count_unresolved_flags([unresolved, resolved]) == 1


def test_resolve_damage_flag_keeps_original_incident_details(valid_payload):
    draft = validate_damage_flag_input(valid_payload)
    flag = create_damage_flag_record(draft, flag_id="flag-2", reviewed_by="authenticated-tech")
    resolved = resolve_damage_flag(flag, resolved_by="tech-05", resolved_at="2026-02-01T12:00:00Z")

    assert resolved.status == "resolved"
    assert resolved.reason == flag.reason
    assert resolved.notes == flag.notes
    assert resolved.reviewed is True
    assert resolved.reviewed_by == flag.reviewed_by


def test_damaged_return_does_not_auto_create_flag_for_unreviewed_incident():
    assert damaged_return_does_not_auto_create_flag("damaged", reviewed=False) is True
    assert damaged_return_does_not_auto_create_flag("damaged", reviewed=True) is True
    assert damaged_return_does_not_auto_create_flag("intact", reviewed=True) is False


def test_can_record_damage_flag_accepts_valid_payload(valid_payload):
    assert can_record_damage_flag(valid_payload) is True


def test_can_record_damage_flag_rejects_missing_confirmation(valid_payload):
    payload = dict(valid_payload)
    payload["reviewed"] = False
    assert can_record_damage_flag(payload) is False


def test_borrower_eligibility_requires_explicit_system_value():
    assert borrower_is_eligible(is_eligible=True) is True
    assert borrower_is_eligible(is_eligible=False) is False
    assert borrower_is_eligible(standing='Overdue') is None
    assert borrower_is_eligible(standing='Damage flag') is None
    assert borrower_is_eligible(standing=None, is_eligible=None) is None
