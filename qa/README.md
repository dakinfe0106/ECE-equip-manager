# QA Onboarding & Standard Operating Procedure (SOP)

**ECE Equipment Management System (EMS) — Quality Assurance Department**

## Step 1: Fetch and Switch to the Branch

1. Run `git fetch origin` to update all remote repository references.
2. Switch to the feature branch: `git switch <branch-name>`.
3. Pull the latest changes to ensure you have the newest commits: `git pull`.

## Step 2: Set Up the Local Environment

- **Frontend:** Navigate to the `frontend/` folder and run `npm ci` to sync exact package dependencies.
- **Backend:** Activate your Python virtual environment and apply database migrations via `python manage.py migrate`.

## Step 3: Run Automated Quality Gates

| Scope | Tool | Exact CLI Command | Passing Criteria |
|---|---|---|---|
| **Frontend Linter** | ESLint | `npm run lint` | Zero warnings/errors |
| **Frontend Tests** | Vitest | `npm test -- --run` | All unit/auth tests pass |
| **Frontend Build** | Vite / TS | `npm run build` | Clean compilation (`tsc -b`) |
| **Backend Linter** | Ruff | `python -m ruff check .` | Zero code violations |
| **Django Check** | Django | `python manage.py check` | System health OK |
| **Migration Check** | Django | `python manage.py makemigrations --check --dry-run` | No missing migrations |
| **Backend Tests** | Pytest | `python -m pytest` | All backend tests pass |

## Step 4: Validate Developer-Written Unit Tests

Review unit and integration tests written by developers using Vitest/MSW and Pytest.

Verify:
- Thorough test coverage of the implemented functionality.
- Appropriate negative assertions and error-handling scenarios.
- Tests validate actual business logic without bypassing core rules.
- Edge cases and expected failure scenarios are covered.

## Step 5: Test Acceptance Criteria from Project Board

Examine the task ticket on the GitHub Project board and rigorously verify every explicit user story and acceptance criterion.

Examples include:
- Password visibility and hiding.
- Appropriate error messages and error display.
- Correct page redirection.
- Expected application behaviour for valid and invalid inputs.

## Step 6: Verify Standards Compliance

- **Design Alignment:** Confirm the UI faithfully adheres to project standards, using semantic `@theme` tokens and Tailwind utility classes rather than inline or raw CSS.
- **Data Integrity:** Ensure inputs are properly trimmed, errors return correct HTTP status codes (`400` for validation and `403` for authorization failures), and database constraints are respected.

## Step 7: Perform Integration Testing on a Local QA Staging Branch
1. Create or switch to a local-only QA staging branch synchronized with `main` (`git checkout -B qa-staging origin/main`).
2. Merge the feature branch locally (`git merge <feature-branch>`) to verify full-stack integration and check for merge conflicts against `main`.
3. Run Django (`http://localhost:8000`) and Vite (`http://localhost:5173`) simultaneously to verify API connectivity, CSRF tokens, and session authentication.
4. **Do not push merged feature code from this staging branch to GitHub[cite: 7].** Once testing is complete, reset `qa-staging` back to `main` and record your test results in your `test/qa-baseline` Markdown file[cite: 2, 7].

## Step 8: Manual Test Tracking and Regression Collation

- **Manual Test Tracking:** Maintain a detailed log of all manual test cases executed for each task inside `qa/manual-tests/<domain>/`.
- **Structured Markdown Files:** Maintain standardized Markdown (`.md`) test suites using the `TC-<DOMAIN>-001` naming convention for repeatable verification.
- **Regression Collation Branch:** Collate all manual test records onto the dedicated QA branch and execute full regression testing across previously implemented system functionality before approving PR merges into `main`.

---

## QA Completion Checklist

Before recommending a feature for merging into `main`, confirm that:

- [ ] The correct feature branch has been checked out and updated.
- [ ] The local development environment is configured.
- [ ] All automated quality gates pass.
- [ ] Developer-written tests have been reviewed.
- [ ] All ticket acceptance criteria have been verified.
- [ ] Design and data integrity standards are satisfied.
- [ ] Full-stack integration testing has been completed.
- [ ] Manual test results have been documented.
- [ ] Regression testing has been completed.
- [ ] Any identified defects have been documented and communicated.

**Final Approval:** A feature is ready for QA sign-off only when all applicable checks have passed and outstanding defects have been documented and communicated.