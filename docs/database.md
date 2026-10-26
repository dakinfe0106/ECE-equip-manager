# EMS Database Schema

**Project:** UNB ECE Equipment Management System (SWE4103, Fall 2026)
**Database:** PostgreSQL ·
**Purpose:** Shared schema and implementation reference for developers and coding agents.

## 1. Conventions

- Primary keys: use the name shown in each table (for example `category_id`), declared as `models.AutoField(primary_key=True)` (`int`). Join tables use a composite primary key of their two foreign keys. SystemUser uses the `id` of `users.User` (see [SystemUser](#systemuser)).
- Foreign keys: required (`null=False`) and `on_delete=PROTECT`, unless specifically noted. Django names the column `<field>_id` (for example, `category = ForeignKey(Category, ...)` creates the column `category_id` referencing `Category.category_id`).
- Names: `varchar(255)`; UNB IDs and asset identifiers: `varchar(100)`; descriptions: `text`; status/role/choice values: bounded `varchar` sized for the longest choice.
- String normalization:
  - Every entry point (API, Django admin, services, and imports) trims leading and trailing whitespace before saving.
  - Required strings must be nonempty after trimming. A database check constraint rejects empty or untrimmed values as the final guard.
  - Optional strings (`EquipmentType.description`, `Borrower.last_name`) are trimmed on input and may be empty.
  - Values keep the case they were entered in. Where a column is unique ignoring case, a unique constraint on `Lower(<column>)` enforces it.
  - Application validation produces user-facing errors; constraints are the final guard. See [Backend.md](Backend.md#models) for the implementation pattern.
- `NULL` is only allowed where explicitly marked **Yes**.
- `is_deleted` defaults to `False`; soft-deleted records remain in storage and should be excluded from normal active lists and new operations.
- Dates use `date`, not timestamps, as in the supplied model. No automatic expiry for certifications.

## 2. Tables

`PK` = primary key; `FK` = foreign key. All columns are non-nullable unless marked **Yes**. Defaults shown explicitly. "Trimmed, nonempty" means the string normalization rule in section 1, including its check constraint.

### Category

| Column      | Type         | Nullable | Constraints/default                                              |
| ----------- | ------------ | -------- | ---------------------------------------------------------------- |
| category_id | int          | No       | PK                                                               |
| name        | varchar(255) | No       | Trimmed, nonempty; unique ignoring case, including soft-deleted |
| is_deleted  | boolean      | No       | Default `False`                                                  |

### EquipmentType

| Column      | Type         | Nullable | Constraints/default                                                              |
| ----------- | ------------ | -------- | -------------------------------------------------------------------------------- |
| type_id     | int          | No       | PK                                                                               |
| category_id | int          | No       | FK → Category.category_id (`PROTECT`)                                                     |
| name        | varchar(255) | No       | Trimmed, nonempty; unique within category ignoring case, including soft-deleted |
| description | text         | No       | Default empty string `""`; trimmed                                               |
| is_deleted  | boolean      | No       | Default `False`                                                                  |

### Asset

| Column           | Type         | Nullable | Constraints/default                                         |
| ---------------- | ------------ | -------- | ----------------------------------------------------------- |
| asset_id         | int          | No       | PK                                                          |
| type_id          | int          | No       | FK → EquipmentType.type_id (`PROTECT`)                           |
| asset_identifier | varchar(100) | No       | Trimmed, nonempty; globally unique by exact value, including soft-deleted |
| name             | varchar(255) | No       | Trimmed, nonempty                                           |
| acquisition_date | date         | **Yes**  | Optional for imported/older assets                          |
| status           | varchar(20)  | No       | Default `Available`; choices below                          |
| is_deleted       | boolean      | No       | Default `False`                                             |

**Asset statuses:** `Available`, `On_Loan`, `Under_Maintenance`, `Retired`.

Asset ID search trims surrounding whitespace and matches identifiers by case-insensitive substring. An exact-case full identifier takes precedence when case variants exist. Asset results are paginated at 20 per page. Results exclude assets whose asset, equipment type, or category is soft-deleted.

### Borrower

| Column                | Type         | Nullable | Constraints/default                                  |
| --------------------- | ------------ | -------- | ---------------------------------------------------- |
| borrower_id           | int          | No       | PK                                                   |
| first_name            | varchar(255) | No       | Trimmed, nonempty                                    |
| last_name             | varchar(255) | No       | Default empty string `""` (optional input); trimmed  |
| unb_id                | varchar(100) | No       | Trimmed, nonempty; unique within Borrower            |
| negligent_damage_flag | boolean      | No       | Default `False`                                      |
| is_deleted            | boolean      | No       | Default `False`                                      |

### Certification

| Column | Type         | Nullable | Constraints/default                     |
| ------ | ------------ | -------- | --------------------------------------- |
| certification_id | int          | No       | PK                                      |
| name   | varchar(255) | No       | Trimmed, nonempty; unique ignoring case |

### BorrowerCertification

| Column           | Type   | Nullable | Constraints/default                |
| ---------------- | ------ | -------- | ---------------------------------- |
| borrower_id      | int    | No       | FK → Borrower.borrower_id (`PROTECT`)       |
| certification_id | int    | No       | FK → Certification.certification_id (`PROTECT`)  |

**Key:** composite primary key `(borrower_id, certification_id)`.

### TypeCertification

| Column           | Type   | Nullable | Constraints/default                |
| ---------------- | ------ | -------- | ---------------------------------- |
| type_id          | int    | No       | FK → EquipmentType.type_id (`PROTECT`)  |
| certification_id | int    | No       | FK → Certification.certification_id (`PROTECT`)  |

**Key:** composite primary key `(type_id, certification_id)`. Certification requirements are defined **per equipment type**, not per individual asset.

### Loan

| Column               | Type        | Nullable | Constraints/default                                     |
| -------------------- | ----------- | -------- | ------------------------------------------------------- |
| loan_id              | int         | No       | PK                                                      |
| asset_id             | int         | No       | FK → Asset.asset_id (`PROTECT`)                               |
| borrower_id          | int         | No       | FK → Borrower.borrower_id (`PROTECT`)                            |
| checkout_date        | date        | No       | Required                                                |
| expected_return_date | date        | No       | Required; ≥ checkout_date                               |
| actual_return_date   | date        | **Yes**  | `NULL` while active; if populated, ≥ checkout_date      |
| return_condition     | varchar(20) | **Yes**  | `NULL` while active; `Intact` / `Damaged` when returned |

**Constraints:** One active loan per asset, enforced with a partial unique constraint on `asset_id` where `actual_return_date IS NULL`. Enforce that `actual_return_date` and `return_condition` are either both `NULL` or both populated. Authorized technicians may extend `expected_return_date` on an active loan.

### MaintenanceRecord

| Column           | Type        | Nullable | Constraints/default                                                         |
| ---------------- | ----------- | -------- | --------------------------------------------------------------------------- |
| maintenance_id   | int         | No       | PK                                                                          |
| asset_id         | int         | No       | FK → Asset.asset_id (`PROTECT`)                                                   |
| technician_id    | bigint      | No       | FK → SystemUser, implemented as `settings.AUTH_USER_MODEL` (`PROTECT`)      |
| maintenance_type | varchar(30) | No       | Choices below                                                               |
| priority         | varchar(10) | No       | Choices below                                                               |
| start_date       | date        | No       | Required                                                                    |
| end_date         | date        | **Yes**  | `NULL` while active; if populated, ≥ start_date                             |

**Maintenance types:** `Inspection`, `Preventative-care`, `Repair`, `Calibration`, `Cleaning`, `Software Service`.
**Priorities:** `Low`, `Medium`, `High`, `Urgent`.

**Constraint:** One active maintenance record per asset; partial unique constraint on `asset_id` where `end_date IS NULL`.

### SystemUser

SystemUser is the logical record for people who sign in to the application. It is implemented on the custom user model `users.User` (`settings.AUTH_USER_MODEL`), whose primary key is `id`. Reference it through `settings.AUTH_USER_MODEL` or `get_user_model()`; do not create a second model for authentication. Whether the columns below become fields on `users.User` or a one-to-one profile, and how they map to Django's built-in user fields, is a [pending decision](Backend.md#9-pending-decisions).

| Column     | Type         | Nullable | Constraints/default                        |
| ---------- | ------------ | -------- | ------------------------------------------ |
| id         | bigint       | No       | PK                                         |
| name       | varchar(255) | No       | Trimmed, nonempty                          |
| unb_id     | varchar(100) | No       | Trimmed, nonempty; unique within SystemUser |
| role       | varchar(20)  | No       | `TECHNICIAN`, `FACULTY`, `ADMINISTRATOR`   |
| is_deleted | boolean      | No       | Default `False`                            |

`Borrower.unb_id` and `SystemUser.unb_id` are **independently** unique; the same person may appear in both tables. The approved Technician, Faculty, and Administrator access roles are represented by Django Groups; user authentication and permission enforcement use Django's authentication/authorization facilities, not role labels alone.

## 3. Relationships

- Category **1 → many** EquipmentType.
- EquipmentType **1 → many** Asset.
- EquipmentType **many ↔ many** Certification through TypeCertification.
- Borrower **many ↔ many** Certification through BorrowerCertification.
- Asset **1 → many** Loan; Borrower **1 → many** Loan.
- Asset **1 → many** MaintenanceRecord; SystemUser **1 → many** MaintenanceRecord (as technician).

## 4. Operating rules

### Checkout and return

1. New checkout requires an active, non-soft-deleted borrower without a negligent-damage flag or an **overdue open loan**; the borrower must have every certification required by the equipment type.
2. The asset, its equipment type, and its category must not be soft-deleted. An asset must be `Available` to be checked out; `Retired` assets require explicit reactivation first.
3. Checkout creates a Loan and sets Asset.status = `On_Loan` in a single database transaction. Returning it fills the return date/condition and makes the asset `Available`, or initiates maintenance directly if damaged or otherwise required.
4. A borrower who later becomes ineligible may keep and return an existing loan, but may not start new loans.
5. Loan rows are historical records: never remove them through ordinary user-facing deletion actions. Extensions update expected return date, without altering checkout history.

### Maintenance and retirement

1. Starting maintenance requires an asset not currently on loan; set status to `Under_Maintenance` and create an open record in one transaction.
2. Only one maintenance record can be open for an asset; completing it fills `end_date` and makes the asset `Available` unless a separate permitted transition is needed.
3. Retirement makes an asset unavailable for checkout. Reactivation is an explicit authorized operation; do not confuse retirement with soft deletion.
4. Use `transaction.atomic()` and row locks (`select_for_update()`) for checkout, return, maintenance, retirement, and reactivation to guard concurrent requests. Also retain database unique constraints.

### Naming, deletion, and restoration

1. Trim whitespace from all string input as described in section 1. Uniqueness for category, equipment type, and certification names is case-insensitive. Name and identifier reservations continue across soft deletion.
2. Soft-delete `Category`, `EquipmentType`, `Asset`, `Borrower`, and `SystemUser`; do not cascade soft-deletion through related tables.
3. Prevent deletion of a category with active dependent equipment types, an equipment type with active dependent assets, or an asset with an open loan or maintenance record. Deactivated/soft-deleted records are unavailable for new operations, but existing transaction history stays accessible to authorized users.
4. Restore an existing record by clearing `is_deleted`, not by inserting a duplicate. `Certification` and join-table associations are not part of the general soft-delete workflow; changes to them must be deliberate and preserve transaction-related semantics.
5. Use protected physical-deletion behavior on foreign keys. Do not offer ordinary UI deletion of loans or maintenance history; administrative corrections should be controlled and auditable.

### Import, reporting, retention

- Spreadsheet imports initialize inventory and eligible borrowers. Reject conflicts with existing identifiers or normalized names, report problematic rows, and allow correction and re-import; never overwrite silently.
- Preserve lending and maintenance history for availability, utilization, borrowing, and borrower analytics. Derive overdue status from open loans whose expected return date is before today's date.
- **Current development policy:** retain records indefinitely; no automatic purging or archival. **Production caveat:** project sponsor must review retention/disposal and personal information handling for RTIPPA compliance before real deployment. Indefinite retention is not itself a compliance determination.
- Use dates (not timestamps) for loan and maintenance fields, consistent with the ER diagram. The requested “busiest lending times” analysis will therefore be limited to date-level patterns (e.g. day/month), not time of day.

## 5. Permissions scope

Three roles are approved: **Technician**, **Faculty**, **Administrator**. Only authorized personnel may access the web application; temporary staff access must be revocable. **Working policy:** Technicians manage inventory, borrowers, loans, certifications, and maintenance; Faculty may view inventory and analytics; Administrators have these abilities plus user-access management. The current implementation maps these roles to Django Groups and model permissions for available inventory endpoints; as additional business endpoints are added, grant each role only its policy-approved permissions. Apply checks server-side (Django permissions), not only in React. Revisit only if client feedback changes required actions.

## 6. Implementation and migrations

- Implement the model fields and constraints above, including check constraints on date ordering and loan return completeness; use Django `TextChoices` for enumerated fields, storing the values exactly as listed above.
- Declare each primary key with the name shown in section 2, for example `category_id = models.AutoField(primary_key=True)`. Join models use `models.CompositePrimaryKey` on their two foreign keys.
- For required strings, add a `CheckConstraint` that rejects empty or untrimmed values. For case-insensitive names, add a `UniqueConstraint` on `Lower('name')` (with `category` for `EquipmentType`). Unique constraints on soft-deletable tables have no condition, so deleted rows keep their names reserved.
- PostgreSQL conditional `UniqueConstraint` protects active loan and maintenance records. Database constraints do not replace application validation or transactional state transitions.
- Inspect existing models, migrations, and data before adding constraints; reconcile duplicate names, duplicate IDs, open transactions, and invalid dates before applying them. Never rewrite already-shared migration history casually.
- Migration changes require accompanying updates to this file and tests for uniqueness, invalid states, restoration, and concurrent checkout/maintenance actions.
