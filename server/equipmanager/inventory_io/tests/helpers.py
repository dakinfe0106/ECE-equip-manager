"""Builders for in-memory test spreadsheets."""

import io

from openpyxl import Workbook

HEADERS = [
    "Asset ID", "Name", "Category", "Type", "Acquisition Date", "Status",
    "Borrower ID", "Checkout Date", "Expected Return Date",
]


def asset(**overrides):
    """A valid Available asset row; override any column by keyword."""
    row = {
        "Asset ID": "0001",
        "Name": "Dell Optiplex MC1425",
        "Category": "Computer Equipment",
        "Type": "Desktop",
        "Acquisition Date": "2022-09-01",
        "Status": "Available",
        "Borrower ID": "",
        "Checkout Date": "",
        "Expected Return Date": "",
    }
    row.update(overrides)
    return row


def csv_bytes(rows, headers=HEADERS):
    lines = [",".join(headers)]
    for row in rows:
        lines.append(",".join(_quote(row.get(h, "")) for h in headers))
    return ("\r\n".join(lines) + "\r\n").encode("utf-8")


def xlsx_bytes(rows, headers=HEADERS):
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(headers)
    for row in rows:
        sheet.append([row.get(h) for h in headers])
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def _quote(value):
    text = "" if value is None else str(value)
    if any(c in text for c in ',"\n'):
        text = '"' + text.replace('"', '""') + '"'
    return text
