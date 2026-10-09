# EMS Database Schema

**Project:** UNB ECE Equipment Management System (SWE4103, Fall 2026)
**Database:** PostgreSQL ·
**Purpose:** Shared schema and implementation reference for developers and coding agents.

## 1. Conventions

- Primary keys: automatically generated integer IDs, non-null and unique.
- All foreign keys: required (`null=False`) and `on_delete=PROTECT`, unless specifically noted.
- Names: `varchar(255)`; UNB IDs and asset identifiers: `varchar(100)`; descriptions: `text`; status/role/choice values: bounded `varchar` sized for the longest choice.
- All required strings must be nonempty after trimming whitespace. Normalize identifying names/IDs on input. `NULL` is only allowed where explicitly marked **Yes**.
- `is_deleted` defaults to `False`; soft-deleted records remain in storage and should be excluded from normal active lists and new operations.
- Dates use `date`, not timestamps, as in the supplied model. No automatic expiry for certifications.
- Keep primary/foreign-key column names shown in the diagram. Django attributes can omit the `_id` suffix (e.g. `asset = ForeignKey(...)` maps to `asset_id`).

## 2. Tables

`PK` = primary key; `FK` = foreign key. All columns are non-nullable unless marked **Yes**. Defaults shown explicitly.

### Category

| Column      | Type         | Nullable | Constraints/default                  |
| ----------- | ------------ | -------- | ------------------------------------ |
| category_id | int          | No       | PK                                   |
| name        | varchar(255) | No       | Unique ignoring case, after trimming |
| is_deleted  | boolean      | No       | Default `False`                      |

### EquipmentType

| Column      | Type         | Nullable | Constraints/default                                  |
| ----------- | ------------ | -------- | ---------------------------------------------------- |
| type_id     | int          | No       | PK                                                   |
| category_id | int          | No       | FK → Category.category_id (`PROTECT`)                |
| name        | varchar(255) | No       | Unique within category ignoring case, after trimming |
| description | text         | No       | Default empty string `""`                            |
| is_deleted  | boolean      | No       | Default `False`                                      |

### Asset

| Column           | Type         | Nullable | Constraints/default                            |
| ---------------- | ------------ | -------- | ---------------------------------------------- |
| asset_id         | int          | No       | PK                                             |
| type_id          | int          | No       | FK → EquipmentType.type_id (`PROTECT`)         |
| asset_identifier | varchar(100) | No       | Globally unique, including soft-deleted assets |
| name             | varchar(255) | No       | Required                                       |
| acquisition_date | date         | **Yes**  | Optional for imported/older assets             |
| status           | varchar(20)  | No       | Default `Available`; choices below             |
| is_deleted       | boolean      | No       | Default `False`                                |

**Asset statuses:** `Available`, `On_Loan`, `Under_Maintenance`, `Retired`.

### Borrower

| Column                | Type         | Nullable | Constraints/default                        |
| --------------------- | ------------ | -------- | ------------------------------------------ |
| borrower_id           | int          | No       | PK                                         |
| first_name            | varchar(255) | No       | Required                                   |
| last_name             | varchar(255) | No       | Default empty string `""` (optional input) |
| unb_id                | varchar(100) | No       | Unique within Borrower                     |
| negligent_damage_flag | boolean      | No       | Default `False`                            |
| is_deleted            | boolean      | No       | Default `False`                            |

### Certification

| Column           | Type         | Nullable | Constraints/default                  |
| ---------------- | ------------ | -------- | ------------------------------------ |
| certification_id | int          | No       | PK                                   |
| name             | varchar(255) | No       | Unique ignoring case, after trimming |

### BorrowerCertification

| Column           | Type | Nullable | Constraints/default                             |
| ---------------- | ---- | -------- | ----------------------------------------------- |
| borrower_id      | int  | No       | FK → Borrower.borrower_id (`PROTECT`)           |
| certification_id | int  | No       | FK → Certification.certification_id (`PROTECT`) |

**Key:** composite primary key `(borrower_id, certification_id)` in the logical schema, or a Django-generated `id` plus a unique constraint on `(borrower, certification)` if using Django's normal model conventions. Use exactly one approach in the actual migrations; the pair must be unique.

### TypeCertification

| Column           | Type | Nullable | Constraints/default                             |
| ---------------- | ---- | -------- | ----------------------------------------------- |
| type_id          | int  | No       | FK → EquipmentType.type_id (`PROTECT`)          |
| certification_id | int  | No       | FK → Certification.certification_id (`PROTECT`) |

**Key:** composite primary key `(type_id, certification_id)` logically, or Django-generated `id` plus a unique pair constraint. Certification requirements are defined **per equipment type**, not per individual asset.

### Loan

| Column               | Type        | Nullable | Constraints/default                                     |
| -------------------- | ----------- | -------- | ------------------------------------------------------- |
| loan_id              | int         | No       | PK                                                      |
| asset_id             | int         | No       | FK → Asset.asset_id (`PROTECT`)                         |
| borrower_id          | int         | No       | FK → Borrower.borrower_id (`PROTECT`)                   |
| checkout_date        | date        | No       | Required                                                |
| expected_return_date | date        | No       | Required; ≥ checkout_date                               |
| actual_return_date   | date        | **Yes**  | `NULL` while active; if populated, ≥ checkout_date      |
| return_condition     | varchar(20) | **Yes**  | `NULL` while active; `Intact` / `Damaged` when returned |

**Constraints:** One active loan per asset, enforced with a partial unique constraint on `asset_id` where `actual_return_date IS NULL`. Enforce that `actual_return_date` and `return_condition` are either both `NULL` or both populated. Authorized technicians may extend `expected_return_date` on an active loan.

### MaintenanceRecord

| Column           | Type        | Nullable | Constraints/default                             |
| ---------------- | ----------- | -------- | ----------------------------------------------- |
| maintenance_id   | int         | No       | PK                                              |
| asset_id         | int         | No       | FK → Asset.asset_id (`PROTECT`)                 |
| technician_id    | int         | No       | FK → SystemUser.user_id (`PROTECT`)             |
| maintenance_type | varchar(30) | No       | Choices below                                   |
| priority         | varchar(10) | No       | Choices below                                   |
| start_date       | date        | No       | Required                                        |
| end_date         | date        | **Yes**  | `NULL` while active; if populated, ≥ start_date |

**Maintenance types:** `Inspection`, `Preventative-care`, `Repair`, `Calibration`, `Cleaning`, `Software Service`.
**Priorities:** `Low`, `Medium`, `High`, `Urgent`.

**Constraint:** One active maintenance record per asset; partial unique constraint on `asset_id` where `end_date IS NULL`.

### SystemUser

| Column     | Type         | Nullable | Constraints/default                      |
| ---------- | ------------ | -------- | ---------------------------------------- |
| user_id    | int          | No       | PK                                       |
| name       | varchar(255) | No       | Required                                 |
| unb_id     | varchar(100) | No       | Unique within SystemUser                 |
| role       | varchar(20)  | No       | `TECHNICIAN`, `FACULTY`, `ADMINISTRATOR` |
| is_deleted | boolean      | No       | Default `False`                          |

`Borrower.unb_id` and `SystemUser.unb_id` are **independently** unique; the same person may appear in both tables. User authentication and permission enforcement should use Django's authentication/authorization facilities; these role labels alone do not grant access.

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

1. Trim whitespace from category, type, certification, and identifying fields; uniqueness for category/type names is case-insensitive. Name reservations continue across soft deletion.
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

Three roles are approved: **Technician**, **Faculty**, **Administrator**. Only authorized personnel may access the web application; temporary staff access must be revocable. **Working implementation policy:** Technicians manage inventory, borrowers, loans, certifications, and maintenance; Faculty may view inventory and analytics; Administrators have these abilities plus user-access management. Apply checks server-side (Django permissions), not only in React. Revisit only if client feedback changes required actions.

## 6. Implementation and migrations

- Implement the model fields and constraints above, including check constraints on date ordering and loan return completeness; use Django `TextChoices` for enumerated fields. For normalized name uniqueness, normalize on write and create appropriate case-insensitive unique constraints/indexes in PostgreSQL.
- Standard Django auto-generated primary keys for junction models plus pairwise `UniqueConstraint` are the recommended ORM implementation.
- PostgreSQL conditional `UniqueConstraint` protects active loan and maintenance records. Database constraints do not replace application validation or transactional state transitions.
- Inspect existing models, migrations, and data before adding constraints; reconcile duplicate names, duplicate IDs, open transactions, and invalid dates before applying them. Never rewrite already-shared migration history casually.
- Migration changes require accompanying updates to this file and tests for uniqueness, invalid states, restoration, and concurrent checkout/maintenance actions.
