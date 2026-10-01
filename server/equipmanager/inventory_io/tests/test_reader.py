import pytest

from inventory_io import spec
from inventory_io.reader import FileRejected, read_upload
from inventory_io.tests.helpers import asset, csv_bytes, xlsx_bytes


def test_reads_csv_and_reports_spreadsheet_row_numbers():
    data = csv_bytes([asset(), {}, asset(**{"Asset ID": "0002"})])
    sheet = read_upload(data, "inventory.csv")
    assert sheet.headers[0] == "Asset ID"
    assert [number for number, _ in sheet.rows] == [2, 4]  # blank row 3 skipped


def test_reads_xlsx():
    sheet = read_upload(xlsx_bytes([asset()]), "Inventory.XLSX")
    assert sheet.rows[0][1][0] == "0001"


def test_reads_csv_saved_by_excel_with_bom_and_semicolons():
    data = "\ufeffAsset ID;Name\r\n0001;Caf\u00e9 kit\r\n".encode("utf-8")
    sheet = read_upload(data, "x.csv")
    assert sheet.headers == ["Asset ID", "Name"]
    assert sheet.rows[0][1] == ["0001", "Caf\u00e9 kit"]


def test_reads_windows_1252_csv():
    data = "Asset ID,Name\r\n0001,Caf\u00e9 kit\r\n".encode("cp1252")
    assert read_upload(data, "x.csv").rows[0][1][1] == "Caf\u00e9 kit"


@pytest.mark.parametrize("data, filename, message", [
    (b"", "x.csv", "empty"),
    (b"a,b\n", "x.txt", "Only .xlsx and .csv"),
    (b"a,b\n", "x.xls", "save the file as .xlsx"),
    (b"not a zip", "x.xlsx", "not an Excel workbook"),
    (b"PK\x03\x04junk", "x.xlsx", "could not be opened"),
    (b"PK\x03\x04junk", "x.csv", "rename it to .xlsx"),
    (b"\n\n", "x.csv", "no header row"),
])
def test_rejects_unusable_files(data, filename, message):
    with pytest.raises(FileRejected, match=message):
        read_upload(data, filename)


def test_rejects_oversized_files(monkeypatch):
    monkeypatch.setattr(spec, "MAX_FILE_BYTES", 10)
    with pytest.raises(FileRejected, match="larger than"):
        read_upload(b"Asset ID,Name\n0001,x\n", "x.csv")
