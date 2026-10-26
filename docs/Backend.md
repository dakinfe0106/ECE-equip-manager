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

- `inventory` provides authenticated category and equipment-type lookups, paginated asset listing/search, asset creation, asset detail/update endpoints, and a category summary list and per-category equipment-type list for the Categories page. Asset status remains server-controlled; newly created assets start as `Available`.
- The `lending` and `maintenance` apps are mounted under `/api/` but do not yet expose business endpoints.
- `users.User(AbstractUser)` is the custom `AUTH_USER_MODEL`; it has no extra role fields. Session login, logout, current-user, and CSRF endpoints are implemented in `users`.
- DRF defaults are `SessionAuthentication` and `IsAuthenticated`. Inventory endpoints also require Django model permissions, including `view_` permissions for reads. Pagination is configured for the asset list; filtering is implemented for Asset ID search.
- `/api/health/` is a plain Django view, so DRF authentication does not apply to it.
- The frontend uses the session endpoints and effective permission list to protect routes and hide unavailable actions. Django remains the authorization authority.

## 2. App layout

Each app uses only the files it needs:

| File | Contains |
| --- | --- |
| `models.py` | Fields, `TextChoices`, `Meta.constraints`, simple model properties. No multi-step workflows. |
| `serializers.py` | Input validation and output shape for the API. |
| `services.py` | Business operations that change several rows or must lock rows: checkout, return, starting and completing maintenance, retirement, reactivation, imports. |
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
  - API: DRF `CharField` trims by default. Never set `trim_whitespace=False`.
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
  - `EquipmentType.name`: `name__iexact` within the same category only. The same type name may exist in another category.
  - `Asset.asset_identifier`: unique by exact normalized value across the whole table.
- Keep the database constraint as the final guard. Two concurrent requests can both pass the serializer check, so any view that saves directly (including generic CRUD views) must wrap the save in `transaction.atomic()`, catch `IntegrityError` from that unique constraint, and raise a DRF `ValidationError` so the race returns `400`, not `500`.

## 4. Business logic and transactions

Rules from [database.md section 4](database.md#4-operating-rules) live in `services.py` so the API, admin actions, and imports apply them the same way.

- Write services as functions with keyword-only arguments.
- Use `@transaction.atomic` on every service that writes more than one row.
- Lock the rows being checked with `select_for_update()` inside the transaction.
- Services do not use HTTP-layer exceptions. DRF `ValidationError` and `Http404` are only converted to responses inside DRF views, so admin actions and imports would get a `500` or an unhandled traceback. Instead:
  - _Proposed:_ raise `BusinessRuleError` for rule violations. It is a small exception class in `equipmanager/exceptions.py` (shared configuration, not a business app) that carries a field-to-messages dict.
  - Let `Model.DoesNotExist` propagate for a missing record.
  - The view converts `BusinessRuleError` to DRF `ValidationError` (`400`) and `DoesNotExist` to `NotFound` (`404`). Admin actions and imports catch the same exceptions and report the failing record or row.
- Validate inputs the database also checks, such as date ordering, before writing. Check constraints are the final guard, not the source of user-facing messages.
- Catch `IntegrityError` only for the constraint you expect, such as "one open loan per asset", and convert it to `BusinessRuleError`. Identify it by constraint name and re-raise anything else, so other violations are not reported with the wrong message. A race must not become a `500`.
- Use `timezone.localdate()` for business dates such as "today" for checkout and overdue checks. With `USE_TZ = True`, `timezone.now().date()` is the UTC date, whatever `TIME_ZONE` is set to.

```python
# lending/services.py (illustrative)
from django.db import IntegrityError, transaction

from equipmanager.exceptions import BusinessRuleError
from inventory.models import Asset

from .models import Loan

OPEN_LOAN_CONSTRAINT = 'lending_loan_one_open_loan_per_asset'  # name= on the UniqueConstraint


@transaction.atomic
def checkout_asset(*, asset_id, borrower, checkout_date, expected_return_date):
    # Raises Asset.DoesNotExist; the view turns it into 404.
    asset = (
        Asset.objects.select_for_update(of=('self',))
        .select_related('type__category')
        .get(pk=asset_id)
    )
    if (
        asset.is_deleted
        or asset.type.is_deleted
        or asset.type.category.is_deleted
        or asset.status != Asset.Status.AVAILABLE
    ):
        raise BusinessRuleError({'asset': ['This asset is not available for checkout.']})
    if expected_return_date < checkout_date:
        raise BusinessRuleError({'expected_return_date': ['Must be on or after the checkout date.']})
    # ... borrower standing and certification checks from database.md ...
    try:
        loan = Loan.objects.create(
            asset=asset,
            borrower=borrower,
            checkout_date=checkout_date,
            expected_return_date=expected_return_date,
        )
    except IntegrityError as exc:
        constraint = getattr(getattr(exc.__cause__, 'diag', None), 'constraint_name', None)
        if constraint == OPEN_LOAN_CONSTRAINT:
            raise BusinessRuleError({'asset': ['This asset already has an open loan.']}) from exc
        raise
    asset.status = Asset.Status.ON_LOAN
    asset.save(update_fields=['status'])
    return loan
```

The view validates input with a serializer, calls the service, converts its exceptions as above, and returns the result serialized with the resource serializer and `201 Created`.

## 5. Soft deletion

Applies to `Category`, `EquipmentType`, `Asset`, `Borrower`, and the user model (see pending decisions), as listed in `database.md`.

_Proposed_ implementation:

- Add a shared queryset in `equipmanager/soft_delete.py` when the first soft-deletable model is built. It is an abstract helper, not a business app.

  ```python
  from django.db import models


  class SoftDeleteQuerySet(models.QuerySet):
      def active(self):
          return self.filter(is_deleted=False)

      def deleted(self):
          return self.filter(is_deleted=True)
  ```

- Models declare `objects = SoftDeleteQuerySet.as_manager()`. The default manager still returns every row, so uniqueness checks, restores, and history lookups see deleted records. Views must call `.active()` explicitly; tests must cover that deleted records are hidden.
- `DELETE /api/<resource>/<pk>/` sets `is_deleted = True` and returns `204`. Override `perform_destroy`; never call `instance.delete()`.
- Check the dependency rules in `database.md` before deleting, for example a category with active types cannot be deleted.
- `POST /api/<resource>/<pk>/restore/` clears `is_deleted`. Restoring never creates a new row.
- `database.md` does not say what happens when the parent of the record being restored is still soft-deleted, for example restoring a type whose category is deleted. Until that is decided (see [pending decisions](#9-pending-decisions)), reject that restore with `400` so a deleted category never ends up with an active type.
- For users, soft deletion must also block login. See [section 6](#6-authentication-endpoints).
- _Proposed:_ `GET /api/<resource>/?deleted=true` lists soft-deleted records for users allowed to restore them.
- In `admin.py`, disable deletion for soft-deletable models by returning `False` from `has_delete_permission`. Admin deletion would bypass the policy.

Loans and maintenance records are history. They have no `DELETE` endpoint.

## 6. Authentication endpoints

Authentication endpoints in the `users` app:

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/api/auth/csrf/` | Public. Sets the `csrftoken` cookie and returns the token. |
| `POST` | `/api/auth/login/` | Public, CSRF-protected. Body `{username, password}`. Returns `200` with the current user or `400` for invalid credentials. |
| `POST` | `/api/auth/logout/` | Authenticated and CSRF-protected. Ends the session and returns `204`. |
| `GET` | `/api/auth/me/` | Authenticated. Returns the user ID, username, and effective Django permissions; anonymous requests return `403`. |

Notes for the implementation:

- Use `django.contrib.auth.authenticate()`, `login()`, and `logout()`. Do not write password handling.
- DRF skips CSRF checks for anonymous requests, and `APIView.as_view()` returns a CSRF-exempt view. Putting `@csrf_protect` on the class, on `post()`, or around `as_view()` in `urls.py` does **not** work. Use `@method_decorator(csrf_protect, name='dispatch')` on the login view class, and test it with `APIClient(enforce_csrf_checks=True)`.
- `login()` rotates the CSRF token. The frontend must fetch a new token after logging in.
- Inactive users (`is_active = False`) cannot log in. Use this to revoke access for temporary staff.
- A soft-deleted user must not be able to log in either. Django's login only checks `is_active`, so soft-deleting a user must also set `is_active = False` (and restoring sets it back) in the same transaction. Whether `is_active` should replace `is_deleted` for users is a [pending decision](#9-pending-decisions).
- The backend enables credentialed CORS for the configured frontend origin. Frontend session requests use `credentials: 'include'` and send `X-CSRFToken` on unsafe methods.

## 7. Permissions

- Every view keeps authentication on. A public view must set `permission_classes = [AllowAny]` and explain why in a comment.
- A data migration creates Django Groups named `Technician`, `Faculty`, and `Administrator`, with inventory permissions based on [database.md section 5](database.md#5-permissions-scope). The Administrator group also receives user model permissions for account management.
- Check permissions, not role names, as [Architecture.md section 9](Architecture.md#9-authentication-and-authorization) requires. Assign users to the relevant group; an Administrator who needs the Django admin site must also have Django's `is_staff` flag. The custom user admin allows administrators to assign only the approved groups and prevents them from granting staff, superuser, or direct user permissions.
- Do **not** use plain `DjangoModelPermissions`. It lets every authenticated user make `GET` requests, so Faculty could read borrowers, loans, maintenance records, and users, which `database.md` section 5 does not allow (Faculty may only view inventory and analytics).
- Inventory CRUD and lookup views use `users.permissions.ModelPermissionsWithView`, which also requires the `view_` permission for reads. Writes need the matching `add_`, `change_`, or `delete_` permission.

- Actions that are not CRUD use custom permissions, for example `lending.return_loan`, declared in the model's `Meta.permissions`.

## 8. Testing

- Put an app's feature tests in its `tests.py`. When the file grows too large, replace it with a `tests/` package of `test_*.py` files.
- Keep project-wide tests (health, settings, auth defaults) in `server/equipmanager/tests/`.
- Use `rest_framework.test.APIClient` and log in with `force_login(user)`. Create test data with the ORM in pytest fixtures. _Proposed:_ share common fixtures in `server/equipmanager/conftest.py`. No new test libraries without team approval.
- The test client skips CSRF checks by default. Auth tests must use `APIClient(enforce_csrf_checks=True)` to cover CSRF.

Each endpoint needs tests for:

1. Anonymous request returns `403`.
2. A user without the permission returns `403`, for reads as well as writes. A user with it succeeds.
3. Invalid input returns `400` with the field error.
4. The business rules from `database.md` that apply to it, including rejected state changes.
5. Soft-deleted records are hidden from lists and blocked from new operations. Restore works.
6. A failed multi-step operation leaves no partial writes.
7. Database constraints reject invalid states directly, for example a second open loan for the same asset raises `IntegrityError`. pytest-django runs each test in a transaction, and a failed statement aborts it, so wrap the failing write in its own savepoint:

   ```python
   with pytest.raises(IntegrityError), transaction.atomic():
       Loan.objects.create(...)
   ```

8. For checkout, return, maintenance, retirement, and reactivation: concurrent requests cannot both succeed, as `database.md` section 6 requires. Use `@pytest.mark.django_db(transaction=True)` and run two requests in separate threads, each with its own connection, then check that exactly one succeeded.

## 9. Pending decisions

| Decision | Options | Blocks |
| --- | --- | --- |
| `SystemUser` fields on `users.User` | Add `role`/`unb_id` to `users.User`, or a profile with a one-to-one link. Either way, SystemUser is implemented on `users.User` and foreign keys use `settings.AUTH_USER_MODEL` | Permissions, user management |
| `TIME_ZONE` | Currently `UTC`. `America/Moncton` matches the Shop. Under UTC the date rolls over at 8 p.m. local time in AST and 9 p.m. in ADT, so loans would show as overdue a day early. Changing `TIME_ZONE` only helps if code uses `timezone.localdate()` (see [section 4](#4-business-logic-and-transactions)) | Overdue rules, analytics |
| User soft deletion vs `is_active` | Keep both flags and set `is_active = False` whenever `is_deleted = True` (current guidance), or use `is_active` as the users' only soft-delete flag and update `database.md` | User management, login |
| Restoring a child of a soft-deleted parent | Reject the restore until the parent is restored (current guidance), or restore the parent automatically | Restore endpoints |
| Service error handling | Views convert `BusinessRuleError` per view (current guidance), or a custom DRF exception handler in shared settings | Every service-backed endpoint |
| Pagination | Enable `PageNumberPagination` before the first list endpoint, or add later | All list endpoints |
| Filtering and search | Manual query parameters (proposed), or add `django-filter` | List endpoints |
| UI design fields not in the schema | Serial number, borrower eligibility and terms, damage-flag count, maintenance and damage notes, and who may archive. See [UI-Design.md §7](UI-Design.md#7-where-the-design-differs-from-the-data-model) | Asset, borrower, loan, and maintenance features |
| Analytics and Excel export | Which app owns the endpoints for the four analytics in the Project Overview, and whether Excel files are generated by Django or in the browser | Analytics pages, export |
| Resource names | `assets/` (matches `database.md`) vs `equipment/` (Architecture.md examples) | URLs, frontend routes. Once decided, also update the examples in `docs/README.md` ("Adding an Endpoint", "Trying a Protected Endpoint") and the comment in `inventory/urls.py` |

Update this guide when a decision is made or when the first feature establishes a pattern, and link to that feature's code as the reference example.
