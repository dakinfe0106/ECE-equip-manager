"""The import/export column specification.

Everything a technician's spreadsheet is expected to contain lives here, so
changing the spec means editing this file (and its tests), not the parser.
Items marked ASSUMPTION are guesses that must be confirmed against the real
Shop spreadsheet and with the technicians; see docs/import-export-spec.md.
"""

# Canonical field name -> header written on export.
# Field names follow the data model: Asset.asset_identifier is the Shop's own
# ID (Asset.asset_id is the database key and never appears in a spreadsheet),
# and a borrower is identified by Borrower.unb_id.
EXPORT_HEADERS = {
    "asset_identifier": "Asset ID",
    "name": "Name",
    "category": "Category",
    "type": "Type",
    "acquisition_date": "Acquisition Date",
    "status": "Status",
    "borrower_unb_id": "Borrower UNB ID",
    "checkout_date": "Checkout Date",
    "expected_return_date": "Expected Return Date",
}

FIELDS = tuple(EXPORT_HEADERS)

REQUIRED_FIELDS = ("asset_identifier", "name", "category", "type", "acquisition_date", "status")
LOAN_FIELDS = ("borrower_unb_id", "checkout_date", "expected_return_date")
DATE_FIELDS = ("acquisition_date", "checkout_date", "expected_return_date")

# Normalized header text -> canonical field. Headers are normalized by
# lowercasing and collapsing spaces, underscores, hyphens and "#".
# ASSUMPTION: aliases are guesses until we see the real spreadsheet.
HEADER_ALIASES = {
    "asset id": "asset_identifier",
    "asset": "asset_identifier",
    "asset no": "asset_identifier",
    "asset number": "asset_identifier",
    "id": "asset_identifier",
    "unique identifier": "asset_identifier",
    "asset identifier": "asset_identifier",
    "name": "name",
    "asset name": "name",
    "description": "name",
    "descriptive name": "name",
    "category": "category",
    "equipment category": "category",
    "type": "type",
    "equipment type": "type",
    "acquisition date": "acquisition_date",
    "acquired": "acquisition_date",
    "date acquired": "acquisition_date",
    "status": "status",
    "current status": "status",
    "borrower id": "borrower_unb_id",
    "borrower": "borrower_unb_id",
    "student id": "borrower_unb_id",
    "student/employee id": "borrower_unb_id",
    "borrower unb id": "borrower_unb_id",
    "unb id": "borrower_unb_id",
    "checkout date": "checkout_date",
    "checked out": "checkout_date",
    "date out": "checkout_date",
    "expected return date": "expected_return_date",
    "expected return": "expected_return_date",
    "return date": "expected_return_date",
    "due date": "expected_return_date",
}

AVAILABLE = "Available"
ON_LOAN = "On_Loan"
UNDER_MAINTENANCE = "Under_Maintenance"
RETIRED = "Retired"
STATUSES = (AVAILABLE, ON_LOAN, UNDER_MAINTENANCE, RETIRED)

# Normalized status text -> canonical status.
# These are the values stored in Asset.status.
STATUS_ALIASES = {
    "available": AVAILABLE,
    "in": AVAILABLE,
    "on_loan": ON_LOAN,
    "onloan": ON_LOAN,
    "loaned": ON_LOAN,
    "out": ON_LOAN,
    "under_maintenance": UNDER_MAINTENANCE,
    "maintenance": UNDER_MAINTENANCE,
    "in_maintenance": UNDER_MAINTENANCE,
    "retired": RETIRED,
}

# Limits that protect the server from oversized uploads.
MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_ROWS = 20_000

# Two different category/type names this similar are flagged as possible typos.
# 0.8 catches "Labtop"/"Laptop" and "Power Supply"/"Power Supplies"; it also
# flags "Projector"/"Protector", which is fine for a warning a human reviews.
SIMILAR_NAME_THRESHOLD = 0.8
