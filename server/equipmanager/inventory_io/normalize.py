"""Turning messy cell values into clean Python values."""

import re
from datetime import date, datetime, timedelta

from . import spec

_SEPARATORS = re.compile(r"[\s_\-#]+")
_WHITESPACE = re.compile(r"\s+")

# Cells starting with these characters are formulas to Excel. On export we
# prefix them with an apostrophe; on import we strip that prefix again.
FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")

# Excel stores dates as days since 1899-12-30 (the 1900 leap-year bug included).
_EXCEL_EPOCH = date(1899, 12, 30)


def clean_text(value) -> str:
    """Return a trimmed string with internal whitespace collapsed ('' for None)."""
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        value = int(value)  # an Excel cell holding 1425 arrives as 1425.0
    text = _WHITESPACE.sub(" ", str(value)).strip()
    if text.startswith("'") and text[1:2] in FORMULA_PREFIXES:
        text = text[1:]  # undo our own export escaping
    return text


def header_key(header) -> str:
    """Normalize a header for alias lookup: 'Asset #' -> 'asset'."""
    return _SEPARATORS.sub(" ", clean_text(header).lower()).strip()


def map_header(header) -> str | None:
    """Return the canonical field for a header, or None if it is unknown."""
    key = header_key(header)
    if key in spec.HEADER_ALIASES:
        return spec.HEADER_ALIASES[key]
    return spec.HEADER_ALIASES.get(key.replace(" ", ""))


def parse_status(value) -> str | None:
    """Return the canonical status, or None if the value is not recognized."""
    key = _SEPARATORS.sub("_", clean_text(value).lower()).strip("_")
    return spec.STATUS_ALIASES.get(key)


def name_key(value) -> str:
    """Key under which category/type names are considered the same name."""
    return clean_text(value).casefold()


class DateParseError(ValueError):
    pass


_UNAMBIGUOUS_FORMATS = ("%Y-%m-%d", "%Y/%m/%d", "%d-%b-%Y", "%d %b %Y", "%b %d %Y", "%B %d %Y", "%d %B %Y")


def parse_date(value, day_first: bool | None = None) -> date | None:
    """Parse a cell into a date. Returns None for an empty cell.

    Accepts real dates (openpyxl gives datetimes), Excel serial numbers,
    ISO dates and spelled-out months. Slash dates like 03/04/2026 are
    ambiguous (March 4 or April 3?): they are rejected unless ``day_first``
    says how to read them, or one part is greater than 12.
    """
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, (int, float)):
        return _from_excel_serial(value)

    text = clean_text(value).replace(",", "")
    if re.fullmatch(r"\d{5}(\.\d+)?", text):
        return _from_excel_serial(float(text))
    text = text.split(" ")[0] if re.match(r"\d{4}-\d{2}-\d{2} \d", text) else text

    for fmt in _UNAMBIGUOUS_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            pass

    match = re.fullmatch(r"(\d{1,2})[/.](\d{1,2})[/.](\d{4})", text)
    if match:
        first, second, year = (int(part) for part in match.groups())
        if day_first is None:
            if first > 12:
                day_first = True
            elif second > 12:
                day_first = False
            else:
                raise DateParseError(
                    f"'{text}' is ambiguous (day/month or month/day?); use YYYY-MM-DD"
                )
        day, month = (first, second) if day_first else (second, first)
        try:
            return date(year, month, day)
        except ValueError as exc:
            raise DateParseError(f"'{text}' is not a real date") from exc

    raise DateParseError(f"'{text}' is not a recognized date; use YYYY-MM-DD")


def _from_excel_serial(serial: float) -> date:
    if not 1 <= serial < 2_958_466:  # 9999-12-31
        raise DateParseError(f"{serial} is not a valid date")
    return _EXCEL_EPOCH + timedelta(days=int(serial))
