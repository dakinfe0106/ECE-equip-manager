from datetime import date

import pytest

from inventory_io import import_assets
from inventory_io.tests.helpers import HEADERS, asset, csv_bytes, xlsx_bytes

TODAY = date(2026, 10, 1)


def run(rows, headers=HEADERS, fmt="csv", **kwargs):
    build = csv_bytes if fmt == "csv" else xlsx_bytes
    return import_assets(build(rows, headers), f"inventory.{fmt}", today=TODAY, **kwargs)


def messages(result, severity="error"):
    return [str(i) for i in result.issues if i.severity == severity]


def on_loan(**overrides):
    return asset(**{
        "Status": "On Loan", "Borrower ID": "3712345",
        "Checkout Date": "2026-09-20", "Expected Return Date": "2026-10-04",
        **overrides,
    })


@pytest.mark.parametrize("fmt", ["csv", "xlsx"])
def test_valid_file_imports_cleanly(fmt):
    result = run([asset(), on_loan(**{"Asset ID": "0002"})], fmt=fmt)
    assert result.ok, messages(result)
    assert result.rows_read == 2
    first, second = result.rows
    assert first.acquisition_date == date(2022, 9, 1)
    assert first.borrower_unb_id is None
    assert second.status == "On_Loan"
    assert second.borrower_unb_id == "3712345"
    assert second.expected_return_date == date(2026, 10, 4)


def test_accepts_headers_with_different_wording():
    headers = ["asset #", "Description", "Equipment Category", "Equipment Type", "Date Acquired", "Current Status"]
    row = dict(zip(headers, ["0001", "Fluke DMM", "Test Equipment", "Digital Multimeter", "2023-01-05", "available"]))
    result = run([row], headers=headers)
    assert result.ok, messages(result)
    assert result.rows[0].name == "Fluke DMM"


def test_missing_required_column_stops_the_import():
    headers = [h for h in HEADERS if h != "Status"]
    result = run([asset()], headers=headers)
    assert not result.ok
    assert result.rows == []
    assert messages(result) == ["Required column(s) missing: Status."]


def test_unknown_column_is_a_warning_not_an_error():
    headers = HEADERS + ["Notes"]
    result = run([asset(Notes="sticky key")], headers=headers)
    assert result.ok
    assert any("'Notes' is not recognized" in m for m in messages(result, "warning"))


def test_all_problems_in_a_file_are_reported_at_once():
    result = run([
        asset(Name=""),
        asset(**{"Asset ID": "0002", "Status": "Lost"}),
        asset(**{"Asset ID": "0003", "Acquisition Date": "someday"}),
        asset(**{"Asset ID": "0004"}),
    ])
    assert not result.ok
    assert [i.row for i in result.errors] == [2, 3, 4]
    assert [r.asset_identifier for r in result.rows] == ["0004"]


def test_duplicate_asset_id_is_an_error_on_the_later_row():
    result = run([asset(), asset(Name="Other")])
    assert messages(result) == ["[row 3, Asset ID] Asset ID '0001' already appears on row 2."]


def test_future_acquisition_date_is_an_error():
    result = run([asset(**{"Acquisition Date": "2027-01-01"})])
    assert messages(result) == ["[row 2, Acquisition Date] Acquisition date is in the future."]


def test_ambiguous_dates_can_be_resolved_by_the_caller():
    rows = [asset(**{"Acquisition Date": "03/04/2024"})]
    assert "ambiguous" in messages(run(rows))[0]
    assert run(rows, day_first=True).rows[0].acquisition_date == date(2024, 4, 3)


def test_on_loan_requires_borrower_and_dates():
    result = run([on_loan(**{"Borrower ID": "", "Expected Return Date": ""})])
    assert messages(result) == [
        "[row 2, Borrower UNB ID] Required when the status is On_Loan.",
        "[row 2, Expected Return Date] Required when the status is On_Loan.",
    ]


def test_on_loan_dates_must_be_in_order():
    result = run([on_loan(**{"Expected Return Date": "2026-09-01"})])
    assert messages(result) == [
        "[row 2, Expected Return Date] Expected return date is before the checkout date.",
    ]


def test_overdue_loan_is_still_valid():
    # Overdue is a state the system tracks, not a data error.
    result = run([on_loan(**{"Checkout Date": "2026-08-01", "Expected Return Date": "2026-08-15"})])
    assert result.ok


def test_stale_loan_details_on_available_asset_are_dropped_with_a_warning():
    result = run([asset(**{"Borrower ID": "3712345", "Checkout Date": "2026-01-10"})])
    assert result.ok
    assert result.rows[0].borrower_unb_id is None
    assert result.rows[0].checkout_date is None
    assert "will not be imported" in messages(result, "warning")[0]


def test_names_differing_only_by_case_or_spacing_are_merged():
    result = run([
        asset(Category="Test Equipment"),
        asset(**{"Asset ID": "0002", "Category": "test  equipment"}),
        asset(**{"Asset ID": "0003", "Category": "Test Equipment"}),
    ])
    assert {r.category for r in result.rows} == {"Test Equipment"}
    assert messages(result, "warning") == [
        "[row 3, Category] 'test equipment' will be recorded as 'Test Equipment'.",
    ]


def test_existing_database_spelling_wins():
    result = run([asset(Type="DESKTOP")], existing_types=[("Computer Equipment", "Desktop")])
    assert result.rows[0].type == "Desktop"


def test_probable_typos_are_flagged():
    result = run([
        asset(Type="Oscilloscope"),
        asset(**{"Asset ID": "0002", "Type": "Oscilliscope"}),
    ])
    assert result.ok  # a warning: a human decides whether to merge
    typo_warnings = [m for m in messages(result, "warning") if "typo" in m]
    assert len(typo_warnings) == 1


def test_typo_of_existing_name_is_flagged():
    result = run([asset(Type="Labtop")], existing_types=[("Computer Equipment", "Laptop")])
    assert any("'Labtop' in Computer Equipment looks like 'Laptop'" in m for m in messages(result, "warning"))


def test_unreadable_file_returns_a_file_level_error():
    result = import_assets(b"hello", "inventory.pdf")
    assert not result.ok
    assert result.errors[0].row is None


def test_accepts_file_like_objects():
    import io
    result = import_assets(io.BytesIO(csv_bytes([asset()])), "inventory.csv", today=TODAY)
    assert result.ok


def test_types_are_compared_within_their_category():
    # "Laptop" under another category is not an existing Computer Equipment type.
    result = run([asset(Type="Labtop")], existing_types=[("Test Equipment", "Laptop")])
    assert not any("typo" in m for m in messages(result, "warning"))
    assert result.new_types == [("Computer Equipment", "Labtop")]


def test_same_type_name_in_two_categories_is_flagged_once():
    result = run([
        asset(Category="Computer Equipment", Type="Monitor"),
        asset(**{"Asset ID": "0002", "Category": "Test Equipment", "Type": "Monitor"}),
    ])
    assert result.ok
    assert len([m for m in messages(result, "warning") if "separate types" in m]) == 1
    assert result.new_types == [("Computer Equipment", "Monitor"), ("Test Equipment", "Monitor")]


def test_reports_which_categories_and_types_would_be_created():
    result = run(
        [asset(), asset(**{"Asset ID": "0002", "Category": "Tools", "Type": "Soldering Station"})],
        existing_categories=["Computer Equipment"],
        existing_types=[("Computer Equipment", "Desktop")],
    )
    assert result.new_categories == ["Tools"]
    assert result.new_types == [("Tools", "Soldering Station")]


def test_nothing_is_planned_when_the_file_has_errors():
    result = run([asset(), asset(Name="")])
    assert result.new_categories == []
    assert result.new_types == []


def test_asset_identifier_already_in_the_system_is_an_error():
    result = run([asset()], existing_asset_identifiers=["0001"])
    assert messages(result) == ["[row 2, Asset ID] Asset ID '0001' is already in the system."]


def test_loan_borrower_must_be_on_the_borrower_list_when_one_is_given():
    rows = [on_loan()]
    assert run(rows).ok  # list not given: not checked
    assert run(rows, known_borrower_unb_ids=["3712345"]).ok
    result = run(rows, known_borrower_unb_ids=["3000000"])
    assert "not on the borrower list" in messages(result)[0]


def test_rows_split_into_asset_and_loan_fields():
    loaned, available = run([on_loan(), asset(**{"Asset ID": "0002"})]).rows
    assert loaned.asset_fields() == {
        "asset_identifier": "0001", "name": "Dell Optiplex MC1425",
        "acquisition_date": date(2022, 9, 1), "status": "On_Loan",
    }
    assert loaned.loan_fields() == {
        "borrower_unb_id": "3712345", "checkout_date": date(2026, 9, 20),
        "expected_return_date": date(2026, 10, 4), "actual_return_date": None,
    }
    assert available.loan_fields() is None
