"""Reusable, provisional damage-flag validation logic for future borrower integration.

This module intentionally does not create any database models or migrations.
It is designed to be consumed by the future Borrower model and checkout workflow
without duplicating the Borrower domain or adding a production persistence layer.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any


@dataclass(frozen=True)
class DamageFlagRecord:
    """Representative damage incident record used by the frontend and service layer.

    The contract is intentionally provisional and should be replaced by the final
    Borrower model once the feature is integrated upstream.
    """

    id: str
    borrower_id: int
    borrower_name: str
    equipment_id: int | None = None
    equipment_name: str | None = None
    incident_date: date | None = None
    reason: str = ""
    notes: str = ""
    status: str = "unresolved"
    created_at: str | None = None
    resolved_at: str | None = None
    resolved_by: str | None = None
    reviewed_by: str | None = None
    reviewed: bool = False


@dataclass(frozen=True)
class DamageFlagDraft:
    borrower_id: int
    borrower_name: str
    equipment_id: int
    incident_date: date
    reason: str
    equipment_name: str | None = None
    notes: str = ""
    reviewed: bool = False


def _positive_id(value: Any, field_name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, str)):
        raise TypeError(f"{field_name} must be a positive integer.")

    try:
        parsed_id = int(value.strip()) if isinstance(value, str) else value
    except ValueError as exc:
        raise ValueError(f"{field_name} must be a positive integer.") from exc

    if parsed_id <= 0 or (isinstance(value, str) and not value.strip()):
        raise ValueError(f"{field_name} must be a positive integer.")
    return parsed_id


def _incident_date(value: Any) -> date:
    if isinstance(value, datetime):
        raise TypeError("Incident date must be a date, not a timestamp.")
    if isinstance(value, date):
        return value
    if not isinstance(value, str):
        raise TypeError("Incident date is required and must use YYYY-MM-DD format.")

    try:
        parsed_date = date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError("Incident date must use YYYY-MM-DD format and be a valid date.") from exc

    if parsed_date.isoformat() != value:
        raise ValueError("Incident date must use YYYY-MM-DD format.")
    return parsed_date


def validate_damage_flag_input(payload: Mapping[str, Any]) -> DamageFlagDraft:
    """Validate a technician-submitted damage flag before it is accepted.

    This intentionally rejects missing required data without requiring a database
    model or migration. The rule is explicit: a flag is only valid after the
    incident has been reviewed and confirmed as negligent damage.
    """

    if "reviewed_by" in payload:
        raise ValueError("Reviewer identity must come from the authenticated server.")

    borrower_id = _positive_id(payload.get("borrower_id"), "Borrower")

    borrower_name = payload.get("borrower_name")
    if not isinstance(borrower_name, str) or not borrower_name.strip():
        raise ValueError("Borrower name is required.")

    equipment_id = _positive_id(payload.get("equipment_id"), "Equipment")
    equipment_name = payload.get("equipment_name")
    if equipment_name is not None and not isinstance(equipment_name, str):
        raise ValueError("Equipment name must be text.")

    incident_date = _incident_date(payload.get("incident_date"))

    reason = payload.get("reason")
    if not isinstance(reason, str) or not reason.strip():
        raise ValueError("Reason is required.")

    notes = payload.get("notes", "")
    if not isinstance(notes, str):
        raise TypeError("Notes must be text.")

    if payload.get("reviewed") is not True:
        raise ValueError("Negligence review confirmation is required.")

    return DamageFlagDraft(
        borrower_id=borrower_id,
        borrower_name=borrower_name.strip(),
        equipment_id=equipment_id,
        equipment_name=equipment_name.strip() if equipment_name else None,
        incident_date=incident_date,
        reason=reason.strip(),
        notes=notes.strip(),
        reviewed=True,
    )


def count_unresolved_flags(flags: Sequence[DamageFlagRecord | Mapping[str, Any]]) -> int:
    """Count unresolved incidents without relying on database queries."""

    count = 0
    for flag in flags:
        status = flag.get("status") if isinstance(flag, Mapping) else getattr(flag, "status", "")
        if str(status).lower() == "unresolved":
            count += 1
    return count


def resolve_damage_flag(
    flag: DamageFlagRecord,
    *,
    resolved_by: str | None = None,
    resolved_at: str | None = None,
) -> DamageFlagRecord:
    """Resolve an incident and preserve its history.

    ``resolved_by`` must be supplied by the authenticated server context, not request data.
    """

    if flag.status == "resolved":
        return flag

    return DamageFlagRecord(
        id=flag.id,
        borrower_id=flag.borrower_id,
        borrower_name=flag.borrower_name,
        equipment_id=flag.equipment_id,
        equipment_name=flag.equipment_name,
        incident_date=flag.incident_date,
        reason=flag.reason,
        notes=flag.notes,
        status="resolved",
        created_at=flag.created_at,
        resolved_at=resolved_at or flag.resolved_at,
        resolved_by=resolved_by or flag.resolved_by,
        reviewed_by=flag.reviewed_by,
        reviewed=flag.reviewed,
    )


def create_damage_flag_record(
    draft: DamageFlagDraft,
    *,
    flag_id: str,
    created_at: str | None = None,
    reviewed_by: str | None = None,
) -> DamageFlagRecord:
    """Create a provisional damage-flag record for future persistence.

    This intentionally does not write to the database. It preserves all of the
    incident details needed to later integrate with the real Borrower model.
    ``reviewed_by`` must come from the authenticated server context, not request data.
    """

    return DamageFlagRecord(
        id=flag_id,
        borrower_id=draft.borrower_id,
        borrower_name=draft.borrower_name,
        equipment_id=draft.equipment_id,
        equipment_name=draft.equipment_name,
        incident_date=draft.incident_date,
        reason=draft.reason,
        notes=draft.notes,
        status="unresolved",
        created_at=created_at,
        resolved_at=None,
        resolved_by=None,
        reviewed_by=reviewed_by,
        reviewed=draft.reviewed,
    )


def damaged_return_does_not_auto_create_flag(
    return_status: str | None,
    *,
    reviewed: bool = False,
) -> bool:
    """Explicitly protect against a damaged return auto-counting as negligence.

    A damaged return never creates a flag by itself. A technician must separately
    review and record the incident; the return's condition does not automate that.
    """

    return return_status is not None and str(return_status).lower() in {"damaged", "damaged_return"}


def borrower_is_eligible(
    *,
    standing: str | None = None,
    is_eligible: bool | None = None,
) -> bool | None:
    """Return the system-provided eligibility value without inferring policy.

    Standing is intentionally unused: warning or restriction thresholds have not
    been approved. Missing eligibility remains unknown rather than being treated
    as either eligible or ineligible.
    """

    return is_eligible


def can_record_damage_flag(payload: Mapping[str, Any]) -> bool:
    """Convenience function used by API or UI validation before submission."""

    try:
        validate_damage_flag_input(payload)
    except (TypeError, ValueError):
        return False
    return True
