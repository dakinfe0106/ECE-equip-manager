# Backend Implementation Guide

**Status:** Sections without a _Proposed_ label are agreed conventions and are binding. Items marked _Proposed_ and the [pending decisions](#9-pending-decisions) need team agreement first: when a task depends on one, raise it in the plan instead of implementing it silently.

This guide explains how to build a backend feature inside one Django app. It adds code-level conventions and does not repeat other documents:

| Topic | Source |
| --- | --- |
| Workflow, required checks, Git | [AGENTS.md](../AGENTS.md) |
| Stack, app boundaries, API conventions, auth concepts, deletion policy | [Architecture.md](Architecture.md) |
| Tables, constraints, business rules, roles | [database.md](database.md) |
| Setup, adding an endpoint, trying a protected endpoint | [README.md](README.md#adding-an-endpoint) |
| Definition of Done | [Quality.md](Quality.md) |

If this guide conflicts with `database.md` or `Architecture.md`, raise the conflict instead of choosing one silently.

## 1. Current state

- `inventory` provides authenticated category and equipment-type lookups and creation, paginated asset listing/search, asset creation, asset detail/update endpoints, and a category summary list and per-category equipment-type list for the Categories page. Asset status remains server-controlled; newly created assets start as `Available`.
- `lending` provides the documented `Borrower` model, authenticated list/detail endpoints, and persistent reviewed damage incidents with edit auditing. `GET /api/borrowers/<borrower_id>/` returns identity, the separate legacy negligent-damage boolean, unresolved reviewed incident count, warning level, and damage-based eligibility. Borrower-scoped damage-flag endpoints list history, record reviewed incidents, edit existing incidents, and resolve them with a reason. Only Technicians and Administrators may use these endpoints. Checkout enforces overdue-loan and damage-based standing. Borrower detail still reports damage-based eligibility only; certification verification, borrower creation/editing, returns, and extensions remain pending.
- `maintenance` provides role-protected maintenance record list/create/detail endpoints and an active-technician lookup; creating a record updates asset status transactionally.
- `lending` also provides `Loan` and read-only `GET /api/loans/` with the Issue #110 contract below. POST checkout is implemented as described below; return and extension workflows remain unimplemented.
- `users.User(AbstractUser)` is the custom `AUTH_USER_MODEL`; its required `role` stores `TECHNICIAN`, `FACULTY`, or `ADMINISTRATOR`. Django admin creation/edit forms expose the role, and `createsuperuser` prompts for it through `REQUIRED_FIELDS`. Existing accounts receive `ADMINISTRATOR` in migration `users.0002`; new accounts have no default role. Role assignment does not grant staff/superuser flags or Django permissions.
- DRF defaults are `SessionAuthentication` and `IsAuthenticated`. Inventory endpoints enforce the role policy in [database.md section 5](database.md#5-permissions-scope). The paginated asset list supports case-insensitive search across Asset ID and name, plus combined category and equipment-type filters.
- `/api/health/` is a plain Django view, so DRF authentication does not apply to it.
- The `users` app provides CSRF, login, logout, and current-user endpoints for application-managed sessions (see [section 6](#6-authentication-endpoints)).

## 2. App layout

### Issue #110: loan listing contract


`GET /api/loans/` returns an unpaginated JSON array ordered by `loan_id`.
Each item contains exactly `loan_id`, `asset_id`, `asset_identifier`,
`equipment_name`, `borrower_id`, `borrower_unb_id`, `borrower_name`,
`checkout_date`, `expected_return_date`, `actual_return_date`,
`return_condition`, and `status`. Asset identifier is `Asset.asset_identifier`;
equipment name is `Asset.name`; borrower UNB ID is `Borrower.unb_id`; borrower
name joins the existing first and last names and trims the result. Dates use
YYYY-MM-DD. Return date and condition are null for open loans; returned
conditions are `Intact` or `Damaged`.


The endpoint permits authenticated active Technicians and Administrators through
`LoanReadPermissions`; Faculty and unsupported roles are denied. POST uses the same role checks. PUT, PATCH, and DELETE remain unsupported.
Existing borrower endpoints are unchanged.

Supported query parameters (combined with AND):

- `status=on_loan|overdue|returned`: On Loan includes every open loan, including
  overdue loans. Overdue requires an open loan due before `timezone.localdate()`;
  returned requires a populated actual return date. The response status is mutually
  exclusive: returned first, otherwise overdue, otherwise on_loan. Due today is
  not overdue. A single business date is used throughout each request.
- `expected_return_from=YYYY-MM-DD` and `expected_return_to=YYYY-MM-DD`: inclusive
  expected-return bounds, individually or together. Invalid dates or reversed
  bounds return 400.
- `asset_status=available|on_loan|under_maintenance|retired`: filters the related
  asset's current stored status, independently of loan status. Overdue is not an
  asset status. Invalid loan or asset statuses return 400.
- `search`: trimmed, case-insensitive substring search across borrower first name,
  last name, full name, UNB ID, asset name, and asset identifier. Blank search
  applies no restriction.

Loan history remains visible when related borrowers, assets, types, or categories
are soft-deleted. Return, extension, and deletion workflows are not included.
The configured timezone remains unchanged; the timezone decision below is pending.

### Issue #113: equipment checkout

`POST /api/loans/` accepts only `asset_id` (positive integer), `borrower_id`
(positive integer), and `expected_return_date` (YYYY-MM-DD). Unknown fields,
including `checkout_date`, return 400. The server sets checkout date with
`timezone.localdate()`. Due today is allowed; earlier dates return 400.

`LoanCheckoutSerializer` validates HTTP input. `checkout_asset()` in
`lending/services.py` owns the atomic transaction; `LoanList.create()` converts
missing records to 404 and `CheckoutRuleError` to field errors with 400.
The service locks the borrower first (the same row used by damage-flag services),
then the asset. It rejects soft-deleted borrowers, assets, types, and categories;
assets not Available; existing open loans on the asset; borrower overdue open
loans; and damage-ineligible borrowers using `damage_flag_summary()`.
Only unresolved reviewed persistent incidents count: fewer than three permits
checkout; three or more denies it. The legacy boolean is not authoritative.

Loan insertion and setting `Asset.status = On_Loan` succeed or roll back together.
The existing `lending_loan_one_open_loan_per_asset` database constraint remains
unchanged; a violation of that specific constraint becomes a 400 asset error.
Unrelated integrity errors propagate. No model or migration changes are needed.
A successful checkout returns 201 with the same twelve fields as the GET loan
representation, null return fields, and calculated `on_loan` status. GET search,
filters, ordering, and permissions remain unchanged. Session writes require CSRF.

**Unresolved Issue #113 dependency:** Certification, BorrowerCertification, and
TypeCertification are documented but not implemented. This endpoint performs no
certification verification and does not claim full eligibility or full Issue #113
acceptance. The issue's unexpired-certification requirement also needs agreement
with the current schema's no-automatic-expiry convention. No certification data,
flags, or success claims are fabricated.

Each app uses only the files it needs:

| File | Contains |
| --- | --- |
| `models.py` | Fields, `TextChoices`, `Meta.constraints`, simple model properties. No multi-step workflows. |
| `serializers.py` | Input validation and output shape for the API. |
| `services.py` | Business operations that change several rows or must lock rows: checkout, return, starting and completing maintenance, retirement, reactivation, imports, and damage-flag record/edit/resolve operations. |
| `views.py` | HTTP layer only: permissions, parse input with a serializer, call the ORM or a service, return a response. |
| `permissions.py` | DRF permission classes for the app. |
| `urls.py` | Explicit `path()` entries for the app's resources. |
| `admin.py` | Django admin registration for local debugging. |
| `tests.py` | Tests for the app's behavior (see [section 8](#8-testing)). |

Cross-app imports are allowed where ownership requires them. For example, `lending.services` uses `inventory.models.Asset`. Keep the import in one direction where possible and do not move models to avoid an import.

## 3. Models, views, URLs, and serializers

### Models

- Name the primary key as [database.md](database.md#1-conventions) shows, for example `category_id = models.AutoField(primary_key=True)`. `users.User` keeps Django's default `id`. URLs capture the key as `pk`.
- Join models use `pk = models.CompositePrimaryKey('borrower_id', 'certification_id')`. Django admin cannot register models with a composite primary key, so manage these links through the parent records.
- Reference users through `settings.AUTH_USER_MODEL`, for example the maintenance technician foreign key.
- Trim strings at every entry point before saving:
  - API: DRF `CharField` trims by default. The exception is a password field: use `trim_whitespace=False` to preserve the exact credential. Login usernames are trimmed.
  - Django admin: form fields strip whitespace by default.
  - Services and imports: call `normalize_text()` from `equipmanager/text.py`. Add this shared helper (not a business app) with the first model that has string fields:

    ```python
    def normalize_text(value: str) -> str:
        return value.strip()
    ```

- Add database constraints as the final guard. Name them `<app>_<model>_<purpose>`:

  ```python
  from django.db import models
  from django.db.models import Q
  from django.db.models.functions import Lower, Trim


  class Category(models.Model):
      category_id = models.AutoField(primary_key=True)
      name = models.CharField(max_length=255)
      is_deleted = models.BooleanField(default=False)

      class Meta:
          constraints = [
              models.UniqueConstraint(Lower('name'), name='inventory_category_name_ci_unique'),
              models.CheckConstraint(
                  condition=Q(name=Trim('name')) & ~Q(name=''),
                  name='inventory_category_name_trimmed_nonempty',
              ),
          ]
  ```

  - Every required string gets the trimmed, nonempty `CheckConstraint`. Optional strings that default to `""` do not.
  - Case-insensitive names use `UniqueConstraint(Lower('name'), ...)`. For `EquipmentType`, scope it to the category: `UniqueConstraint(Lower('name'), 'category', name=...)`.
  - Do not add a condition to these unique constraints. Soft-deleted rows keep their names reserved.
  - Store the value with the case the user entered. Do not lowercase it.

### Views

- Use DRF generic class-based views for plain resource CRUD: `ListCreateAPIView` and `RetrieveUpdateDestroyAPIView`.
- Loans and maintenance records are history and have no `DELETE` (see [section 5](#5-soft-deletion)). Use `ListCreateAPIView` and `RetrieveUpdateAPIView` for them, never `RetrieveUpdateDestroyAPIView`.
- Use an `APIView` for actions that are not simple CRUD, such as returning a loan or restoring a record.
- Name views after the resource: `CategoryList`, `CategoryDetail`, `LoanReturn`.
- Do not override `PUT` to mean a partial update. Use `PATCH` for partial updates.

### URLs

_Proposed_ resource paths, derived from `database.md` tables:

| App | Paths |
| --- | --- |
| `inventory` | `categories/`, `equipment-types/`, `assets/`, `certifications/` |
| `lending` | `borrowers/`, `loans/` |
| `maintenance` | `maintenance-records/` |
| `users` | `auth/`, `users/` |

- Detail routes use `<int:pk>/`, for example `assets/<int:pk>/`.
- Actions are `POST` sub-paths of the record, for example `loans/<int:pk>/return/` and `categories/<int:pk>/restore/`.
- Creating a loan (`POST /api/loans/`) is the checkout operation.
- Every path must be unique across all four apps because they share `/api/`.

### Serializers

- Use `ModelSerializer` for resources. List `fields` explicitly; never use `fields = '__all__'`.
- Mark server-controlled fields as read-only: the primary key, `status`, `is_deleted`, loan return fields, and maintenance end dates.
- Use a separate small serializer for an action's input, for example `LoanReturnSerializer` with `return_condition` and `actual_return_date`.
- DRF `CharField` trims whitespace and rejects blank values by default. Keep both defaults for required strings (see [Models](#models)).
- Check uniqueness in the serializer against **all** rows, including soft-deleted ones, using the scope `database.md` defines for each field:
  - `Category.name` and `Certification.name`: `name__iexact` across the whole table.
  - `EquipmentType.name`: `name__iexact` within the same category only. The same type name may exist in