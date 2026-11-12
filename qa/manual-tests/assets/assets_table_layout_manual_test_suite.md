# Manual Test Suite: Assets Table Layout Redesign

**Feature / Module:** Assets Inventory Table & UI Design Tokens (`features/assets` & `components/ui`)  
**Target Role:** Equipment Manager / Shop Technician / Faculty  
**Environment:** Local Full-Stack (`http://localhost:5173` & `http://localhost:8000`)  
**Reviewer:** `Juanita-Christene Adigwe`  
**Date Executed:** `27/10/2026`  
**Branch Tested:** `feature/assets-page-design`  

---

## 1. Prerequisites & Test Data Setup

Ensure both servers are running on `localhost` and check off each prerequisite data item so all table columns and badge states can be visually verified:

- [x] **Backend Server Running:** `python manage.py runserver` on `http://localhost:8000`
- [x] **Frontend Server Running:** `npm run dev` on `http://localhost:5173`
- [x] **Authenticated Session Active:** Signed in as an active Shop Technician (`tech_active`) or Administrator.
- [x] **Test Assets Seeded (Across All 4 Statuses):**
  - **Available Asset:** e.g., `ECE-OSC-001` (`Rigol DS1054Z`, Category: `Test & Measurement`, Type: `Oscilloscope`, Status: `Available`)
  - **On Loan Asset:** At least one asset with status `On_Loan` (or verified via UI/DevTools)
  - **Under Maintenance Asset:** At least one asset with status `Under_Maintenance`
  - **Retired Asset:** At least one asset with status `Retired`

---

## 2. Page Header, View Controls & Navigation Tests

### TC-ASSET-001: Page Intro Heading, Description & Action Slot Alignment
- [x] Navigate to `http://localhost:5173/assets` (and also verify `http://localhost:5173/` renders the Assets page).
- [x] **Expected:** The top `PageIntro` header displays the bold title `Assets` (`#page-title`).
- [x] **Expected:** Below the title, the description reads `Manage inventory and view equipment by category or equipment type.`.
- [x] **Expected:** The top-right actions area displays the `View by` control (defaulting to `List`) and the primary `+ Add Asset` button aligned side-by-side.
- **Status:** `[x] PASS` / `[ ] FAIL`

---

## 3. Search Toolbar & Filter Control Layout Tests

### TC-ASSET-002: "Include Archived" Top Bar Placement
- [x] Inspect the top section of the main white `Panel` container directly above the search and filter toolbar.
- [x] **Expected:** A dedicated header bar with a bottom divider border (`border-b border-divider`) is rendered at the top of the panel.
- [x] **Expected:** The `Include Archived` checkbox and its label are positioned on the left side of this top bar, matching the UI mockup.
- **Status:** `[x] PASS` / `[ ] FAIL`

### TC-ASSET-003: Redesigned Search Input & Filter Control Placement
- [x] Inspect the search and filter toolbar inside the main white `Panel` container (`AssetSearchToolbar`).
- [x] **Expected:** The legacy `Show: Active Records` dropdown and the legacy visible blue `Search` button have been completely removed.
- [x] **Expected:** The search form renders on the left with a magnifying glass icon and search input field, with a screen-reader-only (`sr-only`) submit button to preserve `Enter` key submission.
- [x] **Expected:** The `Filters` button (with funnel icon and filter badge, e.g., `All`) is positioned on the right side of the toolbar, aligned with the search input.
- **Status:** `[x] PASS` / `[ ] FAIL`

---

## 4. Redesigned Table Structure, Badges & Row Interaction Tests

### TC-ASSET-004: Mockup Table Columns & Removal of Legacy Columns
- [x] Inspect the table header (`<thead>`) and body rows (`<tbody>`) inside `AssetTable`.
- [x] **Expected:** The table displays sticky uppercase headers with exact mockup column names in order: `Asset ID`, `Asset Name`, `Category`, `Equipment Type`, and `Status`.
- [x] **Expected:** The legacy numeric `ID` (`01`, `02`) column and `Acquisition Date` column are completely removed from the table.
- [x] **Expected:** Each row renders `asset_identifier` in monospace primary blue (`font-mono text-primary`), `name` in bold body font (`font-[650] text-body`), `category.name`, `equipment_type.name`, and the status badge.
- **Status:** `[x] PASS` / `[ ] FAIL`

### TC-ASSET-005: Status Badge Visual Tones & Human-Readable Labels (`AssetStatusBadge`)
- [x] Inspect the `Status` column across rows (or via unit test / mocked states) for all 4 `AssetStatus` values.
- [x] **Expected:** Every badge renders as a pill (`rounded-full`) with a `5px` colored indicator dot and human-readable label (no raw underscores):
  - `Available` renders as `Available` with green success tokens (`bg-success-soft text-success`).
  - `On_Loan` renders as `On Loan` with amber warning tokens (`bg-warning-soft text-warning`).
  - `Under_Maintenance` renders as `Under Maintenance` with red danger tokens (`bg-danger-soft text-danger`).
  - `Retired` renders as `Retired` with gray neutral tokens (`bg-neutral-soft text-neutral`).
- **Status:** `[ ] PASS` / `[ ] FAIL`

### TC-ASSET-006: Row Click vs. Asset ID Button Selection (`stopPropagation` Check)
- [x] Click directly on the blue monospace `Asset ID` button text (e.g., `ECE-OSC-001`) inside a table row.
- [x] **Expected:** The row highlights with `bg-primary-soft` (`row-selected`) and the `AssetDetails` dialog opens without flickering or double-toggling (`event.stopPropagation()` works).
- [x] Click anywhere else on a table row (e.g., on the `Category` or `Equipment Type` cell).
- [x] **Expected:** The row displays a pointer cursor (`cursor-pointer`) and cleanly toggles the `AssetDetails` dialog and row highlight.
- **Status:** `[x] PASS` / `[ ] FAIL`

---

## 5. Empty, Loading, Pagination & Responsive Layout Tests

### TC-ASSET-007: Pagination Bar & Empty/No-Match Table Layout
- [x] Inspect the `AssetPagination` bar at the bottom of the `Panel` container.
- [x] **Expected:** Displays the item summary (`Showing X–Y of Z assets`) on the left and pagination controls (`Previous`, `Page X of Y`, `Next`) on the right, separated from the table by a top divider border (`border-t border-divider`).
- [x] Search for a non-existent Asset ID (e.g., `NO-MATCH-999`) and press `Enter`.
- [x] **Expected:** The empty/no-match state row spans all 5 columns (`colSpan={5}`) with centered muted text (`No matching asset was found.`).
- **Status:** `[x] PASS` / `[ ] FAIL`

### TC-ASSET-008: Responsive Breakpoints (`1440px`, `760px`, and `520px`)
- [x] Open Browser DevTools (`F12`), toggle the Device Toolbar (`Ctrl + Shift + M`), and test viewport widths at `1440px`, `760px`, and `375px` (`< 520px`).
- [x] **Expected (`1440px` Desktop):** Full table layout, header controls, and sidebar display with generous padding (`px-[34px]`) and zero horizontal page overflow.
- [x] **Expected (`<= 760px` Tablet):** Outer page padding reduces cleanly (`px-4 pt-6 pb-10`) and the `Assets` heading scales down to `23px`.
- [x] **Expected (`<= 520px` Mobile):**
  - `PageIntro` action controls (`View by` and `+ Add Asset`) stack underneath the title and stretch (`flex-1`).
  - `AssetSearchToolbar` stacks vertically (`flex-col`), expanding the search input to `w-full` above the `Filters` button.
  - `AssetTable` scrolls horizontally inside its `Panel` wrapper without breaking the viewport width.
  - `AssetPagination` wraps cleanly (`flex-wrap`).
- **Status:** `[x] PASS` / `[ ] FAIL`

---

## 6. Automated Quality Gates Sign-Off

Verify all automated suites pass on this branch before merging into the QA regression branch:

- [x] **Frontend Linter:** `npm run lint` (0 errors/warnings)
- [x] **Frontend Unit/Layout Tests:** `npm test -- --run` (All suites including `assetsLayout.test.tsx`, `assetsRouting.test.tsx`, and `routing.test.tsx` pass)
- [x] **Frontend Build & Typecheck:** `npm run build` (`tsc -b` compiles cleanly with no unused types/imports)
- [x] **Backend Linter:** `python -m ruff check .` (All checks passed)
- [x] **Django System Check:** `python manage.py check` (0 issues)
- [x] **Migration Drift Check:** `python manage.py makemigrations --check --dry-run` (No missing migrations)
- [x] **Backend Pytest Suite:** `python -m pytest` (All backend tests pass)

---

## 7. Defect & Observation Log

- [x] **No defects found** — Ready for staging integration and merge.
- [ ] **Defects found** (Document below):
  * **Issue 1:** 
  * **Steps to Reproduce:** 
  * **Expected vs. Actual:**