"""Validating raw spreadsheet rows against the EMS rules."""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, timezone

from . import spec
from .issues import Issue
from .naming import canonical_spellings, similar_pairs, types_by_category
from .normalize import (
    DateParseError,
    clean_text,
    map_header,
    name_key,
    parse_date,
    parse_status,
)
from .reader import FileRejected, read_upload


@dataclass
class AssetRow:
    """One asset that passed validation, ready to be saved."""

    row: int
    asset_identifier: str
    name: str
    category: str
    type: str
    acquisition_date: date
    status: str
    borrower_unb_id: str | None = None
    checkout_date: date | None = None
    expected_return_date: date | None = None

    def as_dict(self) -> dict:
        return {name: getattr(self, name) for name in spec.FIELDS}

    def asset_fields(self) -> dict:
        """Values for the Asset table (category/type are resolved to type_id when saving)."""
        return {
            "asset_identifier": self.asset_identifier,
            "name": self.name,
            "acquisition_date": self.acquisition_date,
            "status": self.status,
        }

    def loan_fields(self) -> dict | None:
        """Values for an open Loan (borrower resolved via Borrower.unb_id), or None."""
        if self.status != spec.ON_LOAN:
            return None
        return {
            "borrower_unb_id": self.borrower_unb_id,
            "checkout_date": self.checkout_date,
            "expected_return_date": self.expected_return_date,
            "actual_return_date": None,
        }


@dataclass
class ImportResult:
    """Everything a preview screen needs: good rows, errors and warnings."""

    rows: list = field(default_factory=list)
    issues: list = field(default_factory=list)
    rows_read: int = 0
    # Category and EquipmentType rows this import would create.
    new_categories: list = field(default_factory=list)
    new_types: list = field(default_factory=list)  # (category name, type name)

    @property
    def errors(self) -> list:
        return [i for i in self.issues if i.severity == "error"]

    @property
    def warnings(self) -> list:
        return [i for i in self.issues if i.severity == "warning"]

    @property
    def ok(self) -> bool:
        """True when every row read is valid. Save only when this is True."""
        return not self.errors


def import_assets(
    file,
    filename: str,
    *,
    existing_categories=(),
    existing_types=(),
    existing_asset_identifiers=(),
    known_borrower_unb_ids=None,
    day_first: bool | None = None,
    sheet_name: str | None = None,
    today: date | None = None,
) -> ImportResult:
    """Read and validate an inventory file without touching the database.

    ``file`` is bytes or a file-like object (e.g. Django's UploadedFile).
    Context from the database (all optional; pass only rows where
    is_deleted is False):

    - ``existing_categories``: Category names.
    - ``existing_types``: (category name, type name) pairs for EquipmentType.
    - ``existing_asset_identifiers``: Asset.asset_identifier values; a row
      reusing one is an error.
    - ``known_borrower_unb_ids``: Borrower.unb_id values. When given, an
      On_Loan row whose borrower is not on the list is an error, because the
      Loan needs a Borrower to point at. When None, borrowers are not checked.
    """
    data = file if isinstance(file, (bytes, bytearray)) else file.read()
    result = ImportResult()
    try:
        sheet = read_upload(bytes(data), filename, sheet_name)
    except FileRejected as rejected:
        result.issues.append(rejected.issue)
        return result

    columns = _map_columns(sheet.headers, result)
    if result.errors:
        return result

    today = today or datetime.now(timezone.utc).astimezone().date()
    taken_ids = {clean_text(i).casefold() for i in existing_asset_identifiers}
    borrowers = None
    if known_borrower_unb_ids is not None:
        borrowers = {clean_text(b).casefold() for b in known_borrower_unb_ids}
    seen_ids = {}
    for number, values in sheet.rows:
        result.rows_read += 1
        cells = {fld: values[i] if i < len(values) else None for fld, i in columns.items()}
        asset = _validate_row(number, cells, result, day_first, today)
        if asset is None:
            continue
        id_key = asset.asset_identifier.casefold()
        if id_key in seen_ids:
            result.issues.append(Issue(
                f"Asset ID '{asset.asset_identifier}' already appears on row {seen_ids[id_key]}.",
                number, "Asset ID",
            ))
            continue
        if id_key in taken_ids:
            # ASSUMPTION: import only adds assets; updating existing ones is a separate story.
            result.issues.append(Issue(
                f"Asset ID '{asset.asset_identifier}' is already in the system.", number, "Asset ID",
            ))
            continue
        if borrowers is not None and asset.borrower_unb_id and asset.borrower_unb_id.casefold() not in borrowers:
            result.issues.append(Issue(
                f"Borrower '{asset.borrower_unb_id}' is not on the borrower list; add them before importing.",
                number, "Borrower UNB ID",
            ))
            continue
        seen_ids[id_key] = number
        result.rows.append(asset)

    _unify_categories(result, existing_categories)
    _unify_types(result, existing_types)
    if result.errors:
        result.new_categories, result.new_types = [], []
    return result


def _map_columns(headers, result: ImportResult) -> dict:
    columns = {}
    for index, header in enumerate(headers):
        text = clean_text(header)
        if not text:
            continue
        fld = map_header(text)
        if fld is None:
            result.issues.append(Issue(f"Column '{text}' is not recognized and will be ignored.", severity="warning"))
        elif fld in columns:
            result.issues.append(Issue(f"Two columns both look like '{spec.EXPORT_HEADERS[fld]}'; using the first one.", severity="warning"))
        else:
            columns[fld] = index
    missing = [spec.EXPORT_HEADERS[f] for f in spec.REQUIRED_FIELDS if f not in columns]
    if missing:
        result.issues.append(Issue(f"Required column(s) missing: {', '.join(missing)}."))
    return columns


def _validate_row(number, cells, result, day_first, today) -> AssetRow | None:
    errors_before = len(result.errors)

    def error(message, fld):
        result.issues.append(Issue(message, number, spec.EXPORT_HEADERS[fld]))

    def warning(message, fld):
        result.issues.append(Issue(message, number, spec.EXPORT_HEADERS[fld], "warning"))

    text = {fld: clean_text(cells.get(fld)) for fld in spec.FIELDS if fld not in spec.DATE_FIELDS}
    for fld in spec.REQUIRED_FIELDS:
        if fld not in spec.DATE_FIELDS and not text[fld]:
            error("This field is required.", fld)

    status = None
    if text["status"]:
        status = parse_status(text["status"])
        if status is None:
            error(f"'{text['status']}' is not a status; use one of {', '.join(spec.STATUSES)}.", "status")

    dates = {}
    for fld in spec.DATE_FIELDS:
        try:
            dates[fld] = parse_date(cells.get(fld), day_first)
        except DateParseError as exc:
            error(str(exc), fld)
            dates[fld] = None
    acquired = dates["acquisition_date"]
    if acquired is None and "acquisition_date" not in _errored_fields(result, number):
        error("This field is required.", "acquisition_date")
    if acquired and acquired > today:
        error("Acquisition date is in the future.", "acquisition_date")

    loan = {"borrower_unb_id": text["borrower_unb_id"] or None, **{f: dates[f] for f in ("checkout_date", "expected_return_date")}}
    if status == spec.ON_LOAN:
        for fld in spec.LOAN_FIELDS:
            if loan[fld] is None and fld not in _errored_fields(result, number):
                error("Required when the status is On_Loan.", fld)
        checkout, due = loan["checkout_date"], loan["expected_return_date"]
        if checkout and due and due < checkout:
            error("Expected return date is before the checkout date.", "expected_return_date")
        if checkout and acquired and checkout < acquired:
            error("Checkout date is before the acquisition date.", "checkout_date")
        if checkout and checkout > today:
            error("Checkout date is in the future.", "checkout_date")
    elif status is not None:
        stale = [spec.EXPORT_HEADERS[f] for f in spec.LOAN_FIELDS if loan[f] is not None]
        if stale:
            # ASSUMPTION: leftover loan details on a returned asset are not imported.
            warning(f"Status is {status}, so {', '.join(stale)} will not be imported.", "status")
        loan = dict.fromkeys(spec.LOAN_FIELDS)

    if len(result.errors) > errors_before:
        return None
    return AssetRow(
        row=number,
        asset_identifier=text["asset_identifier"],
        name=text["name"],
        category=text["category"],
        type=text["type"],
        acquisition_date=acquired,
        status=status,
        **loan,
    )


def _errored_fields(result, number) -> set:
    names = {header: fld for fld, header in spec.EXPORT_HEADERS.items()}
    return {names[i.column] for i in result.errors if i.row == number and i.column in names}


def _respell(result, asset, fld, label, chosen):
    if getattr(asset, fld) != chosen:
        result.issues.append(Issue(
            f"'{getattr(asset, fld)}' will be recorded as '{chosen}'.", asset.row, label, "warning",
        ))
        setattr(asset, fld, chosen)


def _flag_typos(result, kind, names, existing, scope=""):
    for new_name, similar in similar_pairs(names, existing):
        result.issues.append(Issue(
            f"New {kind} '{new_name}'{scope} looks like '{similar}'. Is it a typo?", None, kind.title(), "warning",
        ))


def _unify_categories(result: ImportResult, existing) -> None:
    spellings = canonical_spellings([a.category for a in result.rows], existing)
    for asset in result.rows:
        _respell(result, asset, "category", "Category", spellings[name_key(asset.category)])
    in_file = {a.category for a in result.rows}
    _flag_typos(result, "category", in_file, existing)
    existing_keys = {name_key(n) for n in existing}
    result.new_categories = sorted(n for n in in_file if name_key(n) not in existing_keys)


def _unify_types(result: ImportResult, existing_pairs) -> None:
    """Types are unified within their category (EquipmentType.category_id)."""
    existing = types_by_category(existing_pairs)
    by_category = defaultdict(list)
    for asset in result.rows:
        by_category[name_key(asset.category)].append(asset)

    new_types = []
    for category_key, assets in by_category.items():
        known = existing.get(category_key, [])
        spellings = canonical_spellings([a.type for a in assets], known)
        for asset in assets:
            _respell(result, asset, "type", "Type", spellings[name_key(asset.type)])
        in_file = {a.type for a in assets}
        category = assets[0].category
        _flag_typos(result, "type", in_file, known, f" in {category}")
        known_keys = {name_key(n) for n in known}
        new_types += [(category, n) for n in in_file if name_key(n) not in known_keys]
    result.new_types = sorted(new_types)

    categories_of = defaultdict(set)
    for category, type_name in [*result.new_types, *existing_pairs]:
        categories_of[name_key(type_name)].add(category)
    warned = set()
    for category, type_name in result.new_types:
        others = sorted(categories_of[name_key(type_name)] - {category})
        if others and name_key(type_name) not in warned:
            warned.add(name_key(type_name))
            result.issues.append(Issue(
                f"Type '{type_name}' is in {category} here but also in {', '.join(others)}; "
                "these would be separate types.", None, "Type", "warning",
            ))
