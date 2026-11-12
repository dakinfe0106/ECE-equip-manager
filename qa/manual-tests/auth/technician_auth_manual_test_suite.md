# Manual Test Suite: Technician Authentication (Login & Logout)

**Feature / Module:** Session-Based Authentication (`users` app & `features/auth`)  
**Target Role:** Shop Technician (`TECHNICIAN`)  
**Environment:** Local Full-Stack (`http://localhost:5173` & `http://localhost:8000`)  
**Reviewer:** `Juanita-Christene Adigwe`  
**Date Executed:** `26/10/2026`  
**Branch Tested:** `feat/login-logout-authentication`  

---

## 1. Prerequisites & Test Data Setup

Ensure both servers are running on the exact same host (`localhost`, do not mix with `127.0.0.1`) and check off each test account once prepared via Django Admin (`http://localhost:8000/admin/`) or `python manage.py shell`:

- [x] **Backend Server Running:** `python manage.py runserver` on `http://localhost:8000`
- [x] **Frontend Server Running:** `npm run dev` on `http://localhost:5173`
- [x] **Active Technician Account Created:**
  - **Username:** `tech_active`
  - **Password:** ` pass1234 ` *(Include leading/trailing spaces to test whitespace preservation)*
  - **First / Last Name:** `Morgan` `Sample`
  - **Role:** `TECHNICIAN`
  - **Status:** `is_active = True`
- [x] **Inactive Technician Account Created:**
  - **Username:** `tech_inactive`
  - **Password:** ` pass1234 `
  - **Role:** `TECHNICIAN`
  - **Status:** `is_active = False`
- [x] **No-Name Technician Account Created (Fallback Test):**
  - **Username:** `tech_noname`
  - **Password:** ` pass1234 `
  - **First / Last Name:** *(Leave blank)*
  - **Role:** `TECHNICIAN`
  - **Status:** `is_active = True`

---

## 2. Login UI & Input Masking Tests

### TC-AUTH-001: Standalone Login Page Rendering & Unauthenticated Guard
- [x] Open an incognito/private browser window and navigate to `http://localhost:5173/login`.
- [x] **Expected:** The standalone "Sign in to your workspace" card is displayed.
- [x] **Expected:** The main workspace sidebar navigation is completely hidden.
- [x] **Expected:** Both `Username` and `Password` fields are present and required.
- **Status:** `[x] PASS` / `[ ] FAIL`

### TC-AUTH-002: Password Masking & Visibility Toggle
- [x] Focus on the `Password` input field when it is empty.
- [x] **Expected:** The "Show password" eye icon button is hidden when the input is empty.
- [x] Type `secret123` into the `Password` field.
- [x] **Expected:** Characters are masked (`type="password"`) by default, and the "Show password" button appears.
- [x] Click the "Show password" button (or activate via `Tab` + `Enter`/`Space`).
- [x] **Expected:** The password text `secret123` is revealed (`type="text"`), the button label changes to "Hide password", and the form does **not** submit.
- [x] Click "Hide password" and clear the field.
- [x] **Expected:** The field returns to masked mode and the toggle button disappears when empty.
- **Status:** `[x] PASS` / `[ ] FAIL`

---

## 3. Credential Validation & Error Handling Tests

### TC-AUTH-003: Reject Empty / Whitespace-Only Username
- [x] Enter only spaces (`   `) into the `Username` field, enter any password, and click **Sign in**.
- [x] **Expected:** Client-side validation blocks submission and displays `Enter your username.` in an alert box.
- [x] **Expected:** No network `POST` request is sent to `/api/auth/login/`.
- **Status:** `[x] PASS` / `[ ] FAIL`

### TC-AUTH-004: Reject Invalid Password & Non-Existent Username (Enumeration Protection)
- [x] Enter `tech_active` with an incorrect password `wrongpass` and click **Sign in**.
- [x] **Expected:** API returns `400 Bad Request` and the UI displays `Incorrect username or password.`.
- [x] Enter a non-existent username `ghost_user` with any password and click **Sign in**.
- [x] **Expected:** API returns `400 Bad Request` and the UI displays the exact same generic error: `Incorrect username or password.`.
- **Status:** `[x] PASS` / `[ ] FAIL`

### TC-AUTH-005: Reject Inactive Technician Account
- [x] Enter `tech_inactive` and its valid password ` pass1234 `, then click **Sign in**.
- [x] **Expected:** Login is denied with HTTP `400`.
- [x] **Expected:** The UI displays the generic `Incorrect username or password.` message (does not leak account status).
- **Status:** `[x] PASS` / `[ ] FAIL`

### TC-AUTH-006: Username Trimming vs. Password Whitespace Significance
- [x] Enter ` tech_active ` (with leading/trailing spaces) and `pass1234` (missing the required spaces around the password), then click **Sign in**.
- [x] **Expected:** Login fails (`400`) because password whitespace is significant.
- [x] Keep ` tech_active ` (with spaces) and enter ` pass1234 ` (with exact leading/trailing spaces), then click **Sign in**.
- [x] **Expected:** Username is trimmed automatically, password whitespace is preserved, and login succeeds (`200 OK`).
- **Status:** `[x] PASS` / `[ ] FAIL`

---

## 4. Successful Login, Role Display & Routing Tests

### TC-AUTH-007: Default Redirect & CSRF Token Rotation on Login
- [x] Open DevTools (**Network** tab) and sign in at `http://localhost:5173/login` with `tech_active` / ` pass1234 `.
- [x] **Expected:** Frontend calls `GET /api/auth/csrf/` prior to `POST /api/auth/login/`.
- [x] **Expected:** After `POST /api/auth/login/` returns `200 OK`, the frontend immediately calls `GET /api/auth/csrf/` again to refresh the rotated CSRF token.
- [x] **Expected:** User is redirected to `/equipment-types`.
- [x] **Expected:** No password or auth token is saved in `localStorage` or `sessionStorage`.
- **Status:** `[x] PASS` / `[ ] FAIL`

### TC-AUTH-008: Sidebar Profile & Technician Role Display
- [x] While signed in as `tech_active` (`Morgan Sample`), inspect the bottom of the left sidebar.
- [x] **Expected:** Full name `Morgan Sample` is displayed.
- [x] **Expected:** Avatar badge displays initials `MS`.
- [x] **Expected:** Role label displays `Technician` (from `role_label`).
- [x] Sign out, then sign in as `tech_noname`.
- [x] **Expected:** Sidebar falls back to displaying username `tech_noname` and initial `T`.
- **Status:** `[x] PASS` / `[ ] FAIL`

### TC-AUTH-009: Deep-Link Return Path Preservation (`state.from`)
- [x] While signed out, navigate directly to `http://localhost:5173/categories`.
- [x] **Expected:** User is automatically redirected to `/login`.
- [x] Sign in with `tech_active` / ` pass1234 `.
- [x] **Expected:** Instead of defaulting to `/assets`, the user is redirected back to `/categories`.
- **Status:** `[x] PASS` / `[ ] FAIL`

### TC-AUTH-010: Session Persistence Across Browser Refresh & `/login` Redirect
- [x] While signed in on `/assets`, press `F5` / refresh the browser.
- [x] **Expected:** `GET /api/auth/me/` succeeds (`200 OK`) and the user remains on `/assets` without being logged out.
- [x] Manually change the URL to `http://localhost:5173/login`.
- [x] **Expected:** Signed-in technician is automatically redirected away from `/login` back to `/assets`.
- **Status:** `[x] PASS` / `[ ] FAIL`

---

## 5. Logout & Session Termination Tests

### TC-AUTH-011: Secure Sign Out & Protected Route Guard
- [x] While signed in as `tech_active`, click the **Sign out** button in the sidebar footer.
- [x] **Expected:** `POST /api/auth/logout/` is sent with `X-CSRFToken` and returns `204 No Content`.
- [x] **Expected:** User is immediately redirected to `/login` and the sidebar disappears.
- [x] Click the browser **Back** button or manually navigate to `http://localhost:5173/assets` or `http://localhost:5173/assets/new`.
- [x] **Expected:** Access is blocked and the user is immediately redirected back to `/login`.
- **Status:** `[x] PASS` / `[ ] FAIL`

### TC-AUTH-012: Mid-Session Account Deactivation (Revocation Check)
- [x] Sign in as `tech_active` and verify the `/assets` page loads.
- [x] In another tab or terminal, set `tech_active.is_active = False` in Django Admin/shell and save.
- [x] Return to the EMS tab and navigate to another protected page or trigger an API action (e.g., `/categories`).
- [x] **Expected:** Backend returns `403 Forbidden`, `sessionFetch` triggers a background `/api/auth/me/` check, and the user is automatically kicked back to `/login`.
- [x] *(Cleanup: Set `tech_active.is_active = True` after completing this test).*
- **Status:** `[x] PASS` / `[ ] FAIL`

---

## 6. Automated Quality Gates Sign-Off

Verify all automated suites pass on this branch before merging into the QA regression branch:

- [x] **Frontend Linter:** `npm run lint` (0 errors/warnings)
- [x] **Frontend Unit/MSW Tests:** `npm test -- --run` (All suites including `login.test.tsx` pass)
- [x] **Frontend Build & Typecheck:** `npm run build` (`tsc -b` compiles cleanly)
- [x] **Backend Linter:** `python -m ruff check .` (All checks passed)
- [x] **Django System Check:** `python manage.py check` (0 issues)
- [x] **Migration Drift Check:** `python manage.py makemigrations --check --dry-run` (No missing migrations)
- [x] **Backend Pytest Suite:** `python -m pytest` (All unit, CSRF, and migration tests pass)

---

## 7. Defect & Observation Log

* [x] **No defects found** — Ready for staging integration and merge.
* [ ] **Defects found** (Document below):
  * **Issue 1:** 
  * **Steps to Reproduce:** 
  * **Expected vs. Actual:** 