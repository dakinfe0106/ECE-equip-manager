from io import BytesIO

from django.http import HttpResponse
from openpyxl import Workbook

EXCEL_CONTENT_TYPE = (
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
)


def excel_response(*, filename, sheet_title, headers, rows):
    workbook = Workbook(write_only=True)
    worksheet = workbook.create_sheet(title=sheet_title[:31])
    worksheet.append(headers)
    for row in rows:
        worksheet.append([_safe_cell(value) for value in row])

    buffer = BytesIO()
    workbook.save(buffer)
    response = HttpResponse(buffer.getvalue(), content_type=EXCEL_CONTENT_TYPE)
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def _safe_cell(value):
    if isinstance(value, str) and value.lstrip(" \t\r\n").startswith(
        ("=", "+", "-", "@")
    ):
        return f"'{value}"
    return value
