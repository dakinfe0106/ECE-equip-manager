# Manual Test Suite: Asset Details Modal, Editing & Validation

**Feature / Module:** Asset Details Modal, Inline Editing & Unsaved Changes Guard (`features/assets`)  
**Target Role:** Equipment Manager / Shop Technician / Administrator  
**Environment:** Local Full-Stack (`http://localhost:5173` & `http://localhost:8000`)  
**Reviewer:** `Juanita-Christene Adigwe`  
**Date Executed:**   
**Branch Tested:** 

---

## 1. Prerequisites & Test Data Setup

Ensure both servers are running on `localhost` and check off each prerequisite item before executing the test cases:

- [ ] **Backend Server Running:** `python manage.py runserver` on `http://localhost:8000`
- [ ] **Frontend Server Running:** `npm run dev` on `http://localhost:5173`
- [ ] **Authenticated Session Active:** Signed in as an active Shop Technician (`tech_active`) or Administrator.
- [ ] **Target Test Asset Seeded:**
  - **Asset ID:** `ECE-OSC-001`
  - **Asset Name:** `Rigol DS1054Z`
  - **Category:** `Test & Measurement`
  - **Equipment Type:** `Oscilloscope`
  - **Status:** `Available`
  - **Acquisition Date:** `2022-09-01`

---

## 2. Asset Details Modal Display & Read-Only Structure (#67)

### TC-DETAIL-001: Opening Modal via Table Row & Asset ID Selection
- [ ] Navigate to `http://localhost:5173/assets`.
- [ ] Click directly on the blue `Asset ID` button (`ECE-OSC-001`) in the table row.
- [ ] **Expected:** The Asset Details modal opens smoothly, and the underlying table row highlights (`row-selected`).
- [ ] Close the modal, then click elsewhere on the same table row (e.g., on the `Category` or `Status` cell).
- [ ] **Expected:** Clicking anywhere on the row also opens the Asset Details modal for that exact asset without double-toggling.
- **Status:** `[ ] PASS` / `[ ] FAIL`

### TC-DETAIL-002: Modal Layout, Backend Data Binding & Read-Only Fields
- [ ] With the modal open for `ECE-OSC-001`, inspect all displayed fields against the UI mockup and `docs/UI-Design.md`.
- [ ] **Expected:** Modal header and layout visually align with the new ECE Equipment Manager UI mockup.
- [ ] **Expected:** Live backend data is displayed accurately (not hardcoded placeholder values).
- [ ] **Expected:** `Asset ID` (`ECE-OSC-001`), `Status` badge (`Available`), `Category` (`Test & Measurement`), and `Equipment Type` (`Oscilloscope`) are clearly presented as **read-only** and cannot be modified in the general edit form.
- [ ] **Expected:** Editable fields (`Asset Name` and `Acquisition Date`) are prefilled with the existing asset values (`Rigol DS1054Z` and `2022-09-01`) and visually distinguished from read-only metadata.
- **Status:** `[ ] PASS` / `[ ] FAIL`

### TC-DETAIL-003: Lending & Maintenance History Controls Presence
- [ ] Inspect the history sections/links inside the Asset Details modal.
- [ ] **Expected:** Lending history and Maintenance history controls/sections are rendered in their designated mockup locations.
- [ ] **Expected:** History links or controls behave appropriately (navigating where corresponding routes exist or displaying the expected section structure).
- **Status:** `[ ] PASS` / `[ ] FAIL`

### TC-DETAIL-004: Loading & Error States When Fetching Details
- [ ] Open Browser DevTools (`F12` -> **Network** tab), throttle network speed (e.g., `Slow 3G`), and select an asset row.
- [ ] **Expected:** The modal displays a clear loading state while fetching `/api/assets/<id>/`.
- [ ] Simulate a failed detail fetch (e.g., set Network to `Offline` or block `/api/assets/<id>/`) and select an asset.
- [ ] **Expected:** An appropriate error message is displayed inside the modal without crashing the page. *(Restore Network to `No throttling` afterward).*
- **Status:** `[ ] PASS` / `[ ] FAIL`

### TC-DETAIL-005: Normal Modal Closing Behaviour (No Unsaved Changes)
- [ ] Open the Asset Details modal for `ECE-OSC-001` **without** modifying any input fields.
- [ ] Click the modal Close (`×`) button or `Cancel` button.
- [ ] **Expected:** The modal closes immediately without triggering an unsaved-changes confirmation prompt, and the table row selection highlight clears.
- **Status:** `[ ] PASS` / `[ ] FAIL`

---

## 3. Editing Asset Information & Backend Persistence (#68)

### TC-DETAIL-006: Updating Permitted Fields (`name` & `acquisition_date`)
- [ ] Open the Asset Details modal for `ECE-OSC-001`.
- [ ] Change `Asset Name` from `Rigol DS1054Z` to `Rigol DS1054Z - Calibrated` and update `Acquisition Date` to `2023-01-15`.
- [ ] Open DevTools (**Network** tab) and click **Save Changes**.
- [ ] **Expected:** A `PATCH /api/assets/<asset_id>/` request is sent containing `X-CSRFToken` and the updated payload (`name` and `acquisition_date`), returning `200 OK`.
- [ ] **Expected:** Success feedback (toast/banner) is displayed, and the unsaved-changes state is cleared.
- **Status:** `[ ] PASS` / `[ ] FAIL`

### TC-DETAIL-007: Live Table Synchronization & Reopen Persistence
- [ ] After saving changes in `TC-DETAIL-006`, inspect the main Assets table row for `ECE-OSC-001`.
- [ ] **Expected:** The Assets table immediately reflects the updated name `Rigol DS1054Z - Calibrated` without requiring a manual browser reload.
- [ ] Close the modal, reopen `ECE-OSC-001`, and press `F5` to refresh the browser.
- [ ] **Expected:** Both `Rigol DS1054Z - Calibrated` and `2023-01-15` persist accurately from the backend database.
- **Status:** `[ ] PASS` / `[ ] FAIL`

### TC-DETAIL-008: Failed Update Error Feedback
- [ ] Open the modal for `ECE-OSC-001`, modify `Asset Name`, and simulate a backend failure in DevTools (e.g., block request or go `Offline`), then click **Save Changes**.
- [ ] **Expected:** The failed request displays a clear error alert/message in the modal.
- [ ] **Expected:** The modal remains open with the user's typed input preserved so they do not lose their work.
- **Status:** `[ ] PASS` / `[ ] FAIL`

---

## 4. Form Validation & Unsaved Changes Confirmation (#69)

### TC-DETAIL-009: Required Field & Whitespace Validation (`Asset Name`)
- [ ] Open the modal for `ECE-OSC-001`, clear the `Asset Name` field completely (or enter only whitespace `   `), and click **Save Changes**.
- [ ] **Expected:** Form submission is prevented (`PATCH` request is blocked or rejected).
- [ ] **Expected:** A clear validation message is displayed explaining what needs to be corrected, styled according to the UI mockup.
- **Status:** `[ ] PASS` / `[ ] FAIL`

### TC-DETAIL-010: Invalid Input Format Validation (`Acquisition Date`)
- [ ] Enter an invalid date value (if supported by the input control) or test boundary validation on `Acquisition Date`, then attempt to save.
- [ ] **Expected:** Invalid submission is prevented and clear field-level validation feedback is shown.
- **Status:** `[ ] PASS` / `[ ] FAIL`

### TC-DETAIL-011: Unsaved Changes Detection & Confirmation Prompt
- [ ] Open the modal for `ECE-OSC-001` and modify `Asset Name` to `Temporary Unsaved Name` (do **not** click Save Changes).
- [ ] Attempt to close the modal via the `Cancel` button or the Close (`×`) button.
- [ ] **Expected:** Closing is intercepted and an unsaved-changes confirmation prompt/dialog appears matching the UI mockup design.
- **Status:** `[ ] PASS` / `[ ] FAIL`

### TC-DETAIL-012: "Continue Editing" Action on Unsaved Changes Prompt
- [ ] With the unsaved-changes confirmation prompt visible from `TC-DETAIL-011`, choose the option to **Continue Editing** (stay on form).
- [ ] **Expected:** The confirmation prompt dismisses, the Asset Details modal remains open, and the modified value (`Temporary Unsaved Name`) is still intact in the input field.
- **Status:** `[ ] PASS` / `[ ] FAIL`

### TC-DETAIL-013: "Discard Changes" & Cancel Non-Persistence
- [ ] Click `Cancel` or Close (`×`) again to trigger the unsaved-changes confirmation prompt, and choose **Discard Changes**.
- [ ] **Expected:** The modal closes without sending a `PATCH` request.
- [ ] **Expected:** The Assets table still displays the original saved name (`Rigol DS1054Z - Calibrated`).
- [ ] Reopen the modal for `ECE-OSC-001`.
- [ ] **Expected:** The form displays the original saved values (`Rigol DS1054Z - Calibrated`), confirming unsaved edits were cleanly discarded.
- **Status:** `[ ] PASS` / `[ ] FAIL`

---

## 5. Automated Quality Gates Sign-Off

Verify all automated suites pass on this branch before merging into the QA regression branch:

- [ ] **Frontend Linter:** `npm run lint` (0 errors/warnings)
- [ ] **Frontend Unit/Integration Tests:** `npm test -- --run` (All suites pass, including modal view, edit, validation, and unsaved-changes tests)
- [ ] **Frontend Build & Typecheck:** `npm run build` (`tsc -b` compiles cleanly)
- [ ] **Backend Linter:** `python -m ruff check .` (All checks passed)
- [ ] **Django System Check:** `python manage.py check` (0 issues)
- [ ] **Migration Drift Check:** `python manage.py makemigrations --check --dry-run` (No missing migrations)
- [ ] **Backend Pytest Suite:** `python -m pytest` (All backend tests pass)

---

## 6. Defect & Observation Log

- [ ] **No defects found** — Ready for staging integration and merge.
- [ ] **Defects found** (Document below):
  * **Issue 1:** 
  * **Steps to Reproduce:** 
  * **Expected vs. Actual:** 