"""Reusable, provisional damage-flag validation logic for future borrower integration.

This module intentionally does not create any database models or migrations.
It is designed to be consumed by the future Borrower model and checkout workflow
without duplicating the Borrower domain or adding a production persistence layer.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Sequence


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
    incident_date: date | str | None = None
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
    equipment_id: int | None = None
    equipment_name: str | None = None
    incident_date: date | str | None = None
    reason: str = ""
    notes: str = ""
    reviewed_by: str | None = None
    reviewed: bool = False


def validate_damage_flag_input(payload: Mapping[str, Any]) -> DamageFlagDraft:
    """Validate a technician-submitted damage flag before it is accepted.

    This intentionally rejects missing required data without requiring a database
    model or migration. The rule is explicit: a flag is only valid after the
    incident has been reviewed and confirmed as negligent damage.
    """

    borrower_id = payload.get("borrower_id")
    if borrower_id in (None, ""):
        raise ValueError("Borrower is required.")

    borrower_name = payload.get("borrower_name")
    if not isinstance(borrower_name, str) or not borrower_name.strip():
        raise ValueError("Borrower name is required.")

    equipment_id = payload.get("equipment_id")
    equipment_name = payload.get("equipment_name")
    if equipment_id is not None and equipment_id != "":
        try:
            equipment_id = int(equipment_id)
        except (TypeError, ValueError) as exc:  # pragma: no cover - defensive branch
            raise ValueError("Equipment selection is invalid.") from exc
    else:
        equipment_id = None

    incident_date = payload.get("incident_date")
    if not incident_date:
        raise ValueError("Incident date is required.")

    reason = payload.get("reason")
    if not isinstance(reason, str) or not reason.strip():
        raise ValueError("Reason is required.")

    notes = payload.get("notes")
    notes = notes if isinstance(notes, str) else ""

    reviewed = bool(payload.get("reviewed"))
    if not reviewed:
        raise ValueError("Negligence review confirmation is required.")

    reviewed_by = payload.get("reviewed_by")
    if reviewed_by is not None and reviewed_by != "":
        reviewed_by = str(reviewed_by)

    return DamageFlagDraft(
        borrower_id=int(borrower_id),
        borrower_name=borrower_name.strip(),
        equipment_id=equipment_id,
        equipment_name=(equipment_name.strip() if isinstance(equipment_name, str) else None),
        incident_date=incident_date,
        reason=reason.strip(),
        notes=notes.strip(),
        reviewed_by=reviewed_by,
        reviewed=True,
    )


def count_unresolved_flags(flags: Sequence[DamageFlagRecord | Mapping[str, Any]]) -> int:
    """Count unresolved incidents without relying on database queries."""

    count = 0
    for flag in flags:
        status = flag.get("status") if isinstance(flag, Mapping) else getattr(flag, "status", "")
        if str(status).lower() != "resolved":
            count += 1
    return count


def resolve_damage_flag(
    flag: DamageFlagRecord,
    *,
    resolved_by: str | None = None,
    resolved_at: str | None = None,
) -> DamageFlagRecord:
    """Resolve an existing incident while preserving the original history."""

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
        resolved_at=resolved_at or flag.resolved_at or "now",
        resolved_by=resolved_by or flag.resolved_by,
        reviewed_by=flag.reviewed_by,
        reviewed=flag.reviewed,
    )


def create_damage_flag_record(
    draft: DamageFlagDraft,
    *,
    flag_id: str,
    created_at: str | None = None,
) -> DamageFlagRecord:
    """Create a provisional damage-flag record for future persistence.

    This intentionally does not write to the database. It preserves all of the
    incident details needed to later integrate with the real Borrower model.
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
        created_at=created_at or "now",
        resolved_at=None,
        resolved_by=None,
        reviewed_by=draft.reviewed_by,
        reviewed=draft.reviewed,
    )


def damaged_return_does_not_auto_create_flag(
    return_status: str | None,
    *,
    reviewed: bool = False,
) -> bool:
    """Explicitly protect against a damaged return auto-counting as negligence.

    A damaged return is not automatically negligent. A technician must review and
    record the incident explicitly before the event should affect borrower standing.
    """

    if not reviewed:
        return True

    return return_status is not None and str(return_status).lower() not in {"damaged", "damaged_return"}


def borrower_is_eligible(*, standing: str | None = None, is_eligible: bool | None = None) -> bool:
    """Return whether a borrower is eligible to borrow.

    Eligibility is intentionally system-controlled and must not be inferred from an
    unapproved warning policy. If the upstream Borrower feature does not provide an
    explicit eligibility value, the borrower's eligibility remains unknown and is
    treated as false.
    """

    if is_eligible is not None:
        return bool(is_eligible)

    return False


def can_record_damage_flag(payload: Mapping[str, Any]) -> bool:
    """Convenience function used by API or UI validation before submission."""

    try:
        validate_damage_flag_input(payload)
    except ValueError:
        return False
    return True
