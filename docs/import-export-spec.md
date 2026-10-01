# Inventory Import/Export Specification (DRAFT)

Status: draft. Items marked **OPEN** need an answer from the Shop
technicians or the Product Owner before this feature meets our Definition of Done.
The code that implements this spec is `server/equipmanager/inventory_io/`;
the column rules live in `inventory_io/spec.py`, and every rule below has a test.

## 1. Purpose

Technicians currently keep the inventory in Excel files. Import lets them load
that inventory into the EMS once (initialization) and in bulk afterwards.
Export gives them spreadsheets they can keep using for work the EMS does not cover.

## 2. User stories

- As a technician, I can upload the Shop's inventory spreadsheet so the EMS
  starts with the equipment we already have.
- As a technician, I see every problem in my file, with the Excel row number,
  before anything is saved, so I can fix the file and try again.
- As a technician, I am warned when a category or type looks like a typo of an
  existing one, so we do not end up with "Oscilloscope" and "Oscilliscope".
- As a technician, I can export the inventory to Excel, edit it, and import it again.

## 3. Accepted files

| Rule | Value |
|---|---|
| Formats | `.xlsx`, `.csv` (UTF-8 or Windows-1252; comma, semicolon or tab) |
| Rejected | `.xls` (asked to re-save as `.xlsx`), anything else |
| Size limit | 5 MB, 20,000 rows |
| Sheet | First worksheet (**OPEN**: does the real workbook have one sheet per category?) |
| Header row | First non-blank row; blank rows are skipped |
| Uploaded file | Not stored after import (RTIPPA retention) |

## 4. Columns

| Field | Export header | Saved to | Required | Accepted values |
|---|---|---|---|---|
| asset_identifier | Asset ID | Asset.asset_identifier | yes | Text, unique in the file and not already in the system |
| name | Name | Asset.name | yes | Text |
| category | Category | Category.name | yes | Text; merged with existing names (see 6) |
| type | Type | EquipmentType.name | yes | Text; merged with existing types in the same category (see 6) |
| acquisition_date | Acquisition Date | Asset.acquisition_date | yes | Date, not in the future |
| status | Status | Asset.status | yes | Available, On_Loan, Under_Maintenance, Retired |
| borrower_unb_id | Borrower UNB ID | Loan.borrower_id (looked up by Borrower.unb_id) | if On_Loan | Must be on the borrower list |
| checkout_date | Checkout Date | Loan.checkout_date | if On_Loan | Date, not before acquisition, not in the future |
| expected_return_date | Expected Return Date | Loan.expected_return_date | if On_Loan | Date, not before checkout |

Each On_Loan row creates one open Loan (actual_return_date and
return_condition empty). Borrowers must be imported before inventory.
**OPEN**: should importing an Under_Maintenance asset also create a
MaintenanceRecord, and with which technician?

Alternative header wordings ("Asset #", "Equipment Type", "Due Date"...) are
accepted; the list is in `HEADER_ALIASES`. **OPEN**: replace the guessed
aliases with the headers from the real spreadsheet.

Status spellings such as "on loan", "ON-LOAN" and "maintenance" are accepted.
**OPEN**: what words do technicians actually type?

Not imported yet: certification requirements (TypeCertification),
lending history, maintenance records. **OPEN**: are these in the spreadsheet in any form?

## 5. Dates

Accepted: real Excel dates, Excel serial numbers, `YYYY-MM-DD`, `YYYY/MM/DD`,
`4-Mar-2024`, `Mar 4, 2024`. Slash dates like `03/04/2024` are rejected as
ambiguous unless one part is over 12 or the importer is told the order.
**OPEN**: which order does the Shop use?

## 6. Errors, warnings and names

- **Error**: the row is not imported. A file is saved only when it has no
  errors, in one database transaction (all or nothing).
- **Warning**: the row is imported; a person should review it.
- Missing required columns or an unreadable file stop the import.
- Category/type names differing only by case or spacing are merged; the
  existing database spelling wins, otherwise the most common spelling in the file.
  Types are compared only within their category, since each EquipmentType
  belongs to one Category. The same type name in two categories is warned about.
- Matching uses only rows where is_deleted is false. **OPEN**: if an import
  names a soft-deleted category or type, restore it or create a new one?
- Re-importing an Asset ID already in the system is an error (import adds
  assets; it does not update them). **OPEN**: do technicians need bulk update?
- Names similar enough to be a typo (similarity >= 0.8) produce a warning; a
  technician decides whether to merge.
- Overdue loans are valid data, not errors.
- Leftover borrower or loan dates on an asset that is not On_Loan are dropped
  with a warning. **OPEN**: confirm with technicians; this is also data minimization.

## 7. Export

- Same headers as import, so exported files can be re-imported unchanged.
- Dates are real Excel dates formatted `yyyy-mm-dd`.
- Text starting with `=`, `+`, `-` or `@` is never written as a formula
  (CSV/formula injection). In CSV it gets a leading apostrophe, which the
  importer removes.
- Only borrower IDs are exported, no other borrower details. **OPEN**: who may
  export, and should exports be logged? (RTIPPA)

## 8. Acceptance tests

1. Given the Shop's real spreadsheet, when a technician imports it, then every
   asset appears in the EMS or is listed with a row-numbered reason.
2. Given a file with a misspelled type, then the preview warns about it before saving.
3. Given a file with one bad row, then nothing is saved and the bad row is reported.
4. Given an exported file, when it is imported unchanged, then no data changes.
