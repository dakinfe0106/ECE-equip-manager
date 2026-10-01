"""Import and export of EMS inventory spreadsheets.

This package deliberately has no dependency on Django models. It turns an
uploaded .csv/.xlsx file into validated, normalized rows (plus a list of
problems found), and turns rows back into a spreadsheet. A thin adapter that
saves validated rows to the database belongs with the models, so this code
survives whatever data model the team settles on.

Typical use:

    from inventory_io import import_assets
    result = import_assets(uploaded_file, filename="inventory.xlsx")
    if result.ok:
        ...  # show preview, then save result.rows in one transaction
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
