"""Problems found while importing, reported with spreadsheet row numbers."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Issue:
    """One problem in an uploaded file.

    ``row`` is the row number a technician sees in Excel (the header is row 1),
    or ``None`` for problems with the file as a whole. ``severity`` is
    ``"error"`` (row will not be imported) or ``"warning"`` (row is imported,
    but someone should look at it).
    """

    message: str
    row: int | None = None
    column: str | None = None
    severity: str = "error"

    def __str__(self) -> str:
        where = []
        if self.row is not None:
            where.append(f"row {self.row}")
        if self.column:
            where.append(self.column)
        prefix = f"[{', '.join(where)}] " if where else ""
        return f"{prefix}{self.message}"
