"""Validating raw spreadsheet rows against the EMS rules."""

from dataclasses import dataclass, field
from datetime import date

from . import spec
from .issues import Issue
from .naming import canonical_spellings, similar_pairs
from .normalize import DateParseError, clean_text, map_header, parse_date, parse_status
from .reader import FileRejected, read_upload


@dataclass
class AssetRow:
    """One asset that passed validation, ready to be saved."""

    row: int
    asset_id: str
    name: str
    category: str
    type: str
    acquisition_date: date
    status: str
    borrower_id: str | None = None
    checkout_date: date | None = None
    expected_return_date: date | None = None

    def as_dict(self) -> dict:
        return {name: getattr(self, name) for name in spec.FIELDS}


@dataclass
class ImportResult:
    """Everything a preview screen needs: good rows, errors and warnings."""

    rows: list = field(default_factory=list)
    issues: list = field(default_factory=list)
    rows_read: int = 0

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
    day_first: bool | None = None,
    sheet_name: str | None = None,
    today: date | None = None,
) -> ImportResult:
    """Read and validate an inventory file without touching the database.

    ``file`` is bytes or a file-like object (e.g. Django's UploadedFile).
    Pass the category/type names already in the database so near-duplicates
    of them are caught.
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

    today = today or date.today()
    seen_ids = {}
    for number, values in sheet.rows:
        result.rows_read += 1
        cells = {fld: values[i] if i < len(values) else None for fld, i in columns.items()}
        asset = _validate_row(number, cells, result, day_first, today)
        if asset is None:
            continue
        id_key = asset.asset_id.casefold()
        if id_key in seen_ids:
            result.issues.append(Issue(
                f"Asset ID '{asset.asset_id}' already appears on row {seen_ids[id_key]}.",
                number, "Asset ID",
            ))
            continue
        seen_ids[id_key] = number
        result.rows.append(asset)

    _unify_names(result, "category", "Category", existing_categories)
    _unify_names(result, "type", "Type", existing_types)
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

    loan = {"borrower_id": text["borrower_id"] or None, **{f: dates[f] for f in ("checkout_date", "expected_return_date")}}
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
        asset_id=text["asset_id"],
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


def _unify_names(result: ImportResult, fld: str, label: str, existing) -> None:
    names = [getattr(asset, fld) for asset in result.rows]
    spellings = canonical_spellings(names, existing)
    for asset in result.rows:
        chosen = spellings[clean_text(getattr(asset, fld)).casefold()]
        if getattr(asset, fld) != chosen:
            result.issues.append(Issue(
                f"'{getattr(asset, fld)}' will be recorded as '{chosen}'.", asset.row, label, "warning",
            ))
            setattr(asset, fld, chosen)
    in_file = {getattr(asset, fld) for asset in result.rows}
    for new_name, similar in similar_pairs(in_file, existing):
        result.issues.append(Issue(
            f"New {fld} '{new_name}' looks like '{similar}'. Is it a typo?", None, label, "warning",
        ))
