from datetime import date, datetime

import pytest

from inventory_io.normalize import (
    DateParseError, clean_text, map_header, parse_date, parse_status,
)


@pytest.mark.parametrize("header, field", [
    ("Asset ID", "asset_id"),
    ("  asset_id ", "asset_id"),
    ("Asset #", "asset_id"),
    ("EQUIPMENT TYPE", "type"),
    ("Student/Employee Id", "borrower_id"),
    ("Due-Date", "expected_return_date"),
    ("Colour", None),
])
def test_map_header(header, field):
    assert map_header(header) == field


@pytest.mark.parametrize("raw, status", [
    ("Available", "Available"),
    ("on loan", "On_Loan"),
    ("ON-LOAN", "On_Loan"),
    ("Under Maintenance", "Under_Maintenance"),
    (" retired ", "Retired"),
    ("Lost", None),
    ("", None),
])
def test_parse_status(raw, status):
    assert parse_status(raw) == status


@pytest.mark.parametrize("raw, expected", [
    (None, None),
    ("", None),
    (datetime(2024, 3, 4, 10, 30), date(2024, 3, 4)),
    (date(2024, 3, 4), date(2024, 3, 4)),
    ("2024-03-04", date(2024, 3, 4)),
    ("2024-03-04 00:00:00", date(2024, 3, 4)),
    ("2024/03/04", date(2024, 3, 4)),
    ("4-Mar-2024", date(2024, 3, 4)),
    ("Mar 4, 2024", date(2024, 3, 4)),
    (45355, date(2024, 3, 4)),        # Excel serial number
    ("45355", date(2024, 3, 4)),
    ("25/03/2024", date(2024, 3, 25)),  # day > 12, so day comes first
    ("03/25/2024", date(2024, 3, 25)),  # month/day
])
def test_parse_date(raw, expected):
    assert parse_date(raw) == expected


def test_ambiguous_slash_date_is_rejected_unless_told_how_to_read_it():
    with pytest.raises(DateParseError, match="ambiguous"):
        parse_date("03/04/2024")
    assert parse_date("03/04/2024", day_first=True) == date(2024, 4, 3)
    assert parse_date("03/04/2024", day_first=False) == date(2024, 3, 4)


@pytest.mark.parametrize("raw", ["next tuesday", "2024-02-30", "31/02/2024", 0])
def test_bad_dates_are_rejected(raw):
    with pytest.raises(DateParseError):
        parse_date(raw)


def test_clean_text_collapses_whitespace_and_excel_floats():
    assert clean_text("  Dell   Latitude\n5420 ") == "Dell Latitude 5420"
    assert clean_text(1425.0) == "1425"
    assert clean_text(None) == ""


def test_clean_text_undoes_export_formula_escaping():
    assert clean_text("'=SUM(A1)") == "=SUM(A1)"
    assert clean_text("'Twas a kit") == "'Twas a kit"
