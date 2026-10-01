"""Import and export of EMS inventory spreadsheets.

This package deliberately has no dependency on Django models. It turns an
uploaded .csv/.xlsx file into validated, normalized rows (plus a list of
problems found), and turns rows back into a spreadsheet. A thin adapter that
saves validated rows to the database belongs with the models, so this code
survives whatever data model the team settles on.

Typical use:

    from inventory_io import import_assets
    result = import_assets(
        uploaded_file, filename="inventory.xlsx",
        existing_categories=[...], existing_types=[(category, type), ...],
        existing_asset_identifiers=[...], known_borrower_unb_ids=[...],
    )
    if result.ok:
        # Show the preview, then in one transaction create
        # result.new_categories, result.new_types, an Asset per row
        # (row.asset_fields()) and a Loan per row.loan_fields() that is not None.
        ...
"""

from .exporter import export_assets_csv, export_assets_xlsx, export_table_xlsx
from .importer import ImportResult, import_assets
from .issues import Issue

__all__ = [
    "ImportResult",
    "Issue",
    "export_assets_csv",
    "export_assets_xlsx",
    "export_table_xlsx",
    "import_assets",
]
