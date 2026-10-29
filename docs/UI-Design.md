# UI Design Guide

The approved UI design for the EMS is the [ECE Equipment Manager Figma Make prototype](https://www.figma.com/make/NhYNOA100NYj2W4zcxjSzc/ECE-Equipment-Manager). Open it to click through the screens. Its source is copied into [design/prototype/](design/prototype/) so agents can read it. All new frontend work follows it. This guide says what to take from the prototype, how to build it in our codebase, and where the design and the data model disagree.

Code conventions are in [Frontend-Standards.md](Frontend-Standards.md). Business rules are in [database.md](database.md).

## 1. How to use the prototype

- [App.tsx](design/prototype/App.tsx) shows every page, modal, and interaction. [index.css](design/prototype/index.css) holds the exact colors, sizes, and spacing.
- It is a **reference for look and behavior, not code to copy**. It is one file with mock data and fake login, and it is not built, linted, or tested.
- Rebuild each screen with our patterns: React Router routes, `features/<name>/` API calls, Tailwind with the tokens in section 3, and shared components in `src/components/ui/`.
- When the design and [database.md](database.md) disagree, database.md wins until the team approves a change (section 7).
- When the Figma design changes, export it again, replace the files in `design/prototype/`, and update this guide in the same pull request.

Do not copy these prototype habits:

- Mock data, demo accounts, or client-side "login" checks. Data and authentication come from Django.
- Page switching with `useState`. Every page is a route (section 2).
- Filtering and searching in the browser. The API does search, filtering, and pagination.
- `window.confirm` and `window.alert`. Use the confirmation modal (section 5).
- `new Date().toISOString().slice(0, 10)` for "today". It gives the UTC date. Use the local date.
- `any`, module-level data mutated in place, and global element selectors such as `table` or `header`.

## 2. Pages and routes

The sidebar has a **Workspace** group and, for Administrators only, an **Administration** group. Create and detail screens are modals, not separate routes.

| Sidebar label | Route | Who sees it | Main API resource |
| --- | --- | --- | --- |
| (Sign-in screen) | `/login` | Everyone | `auth/` (proposed, [Backend.md §6](Backend.md#6-authentication-endpoints)) |
| Dashboard | `/` | Everyone | Summary data (not yet defined). Until it is built, `/` shows the Assets page. |
| Assets | `/assets` | Everyone; Faculty read-only | `assets/`, `categories/`, `equipment-types/` |
| Lending | `/loans` | Technician, Administrator | `loans/` |
| Borrowers | `/borrowers` | Technician, Administrator | `borrowers/` |
| Maintenance | `/maintenance` | Technician, Administrator | `maintenance-records/` |
| Analytics | `/analytics` | Everyone | Pending ([Backend.md §9](Backend.md#9-pending-decisions)) |
| Import & Export | `/import-export` | Technician, Administrator | Pending |
| Users & Access | `/users` | Administrator | `users/` |

- Roles follow [database.md §5](database.md#5-permissions-scope). The prototype only demos Administrator and Technician; Faculty see view-only pages with no create, edit, or workflow buttons.
- Use query parameters for filters so links work, for example a dashboard card linking to `/loans?status=Overdue`.
- **Existing routes not in the design:** `/categories` and `/equipment-types` stay until the team decides where category and type management lives (section 7). `/assets/new` becomes the **Add Asset** modal on `/assets`.

## 3. Design tokens

Add these to the `@theme` block in `frontend/src/index.css` when you first restyle a screen, then use them as Tailwind classes (`bg-primary`, `text-muted`, `border-line`). Do not repeat raw hex values.

```css
@theme {
  --font-sans: Inter, ui-sans-serif, system-ui, sans-serif;

  --color-primary: #2f6fed;        /* buttons, links, active tab, focus */
  --color-primary-hover: #245fcf;
  --color-primary-soft: #edf3ff;   /* focus ring, selected option */

  --color-page: #f5f7fa;           /* app background */
  --color-line: #e6eaf0;           /* card and header borders */
  --color-divider: #edf0f4;        /* table rows, panel sections */
  --color-input: #d9dee6;          /* input borders */

  --color-heading: #101828;
  --color-body: #344054;
  --color-muted: #697586;
  --color-subtle: #929baa;

  --color-sidebar: #101b2b;
  --color-sidebar-hover: #19283c;
  --color-sidebar-active: #2767d8;
  --color-sidebar-text: #aab5c4;

  --color-success: #087c68;  --color-success-soft: #e8f7f1;
  --color-warning: #a15c07;  --color-warning-soft: #fff3d9;
  --color-danger:  #b42318;  --color-danger-soft:  #feebea;
  --color-neutral: #667085;  --color-neutral-soft: #eef0f3;
}
```

Other values from the prototype:

- **Radius:** controls 8px, cards 11px, modals 13px, badges fully rounded.
- **Type:** page title 27px bold; panel and modal titles 14px; body and table text 11–12px; field labels 10px; table headers 9px uppercase.
- **Layout:** sidebar 248px fixed; sticky header 66px; content max width 1500px with 34px padding.
- **Breakpoints:** 1050px (metric cards go to two columns), 760px (sidebar becomes a slide-in menu opened from the header), 520px (single column, full-width primary button).

## 4. Shared components

Build each one in `src/components/ui/` the first time a feature needs it, then reuse it. Each one matches the prototype component or class with the same name.

| Component | Use |
| --- | --- |
| `AppShell` (`Sidebar`, `Header`) | Layout: sidebar, breadcrumb header with role chip, `<Outlet />` |
| `PageIntro` | Page title, one-line description, primary action on the right |
| `Panel` | White card that holds a toolbar and table, or a chart |
| `Button` | Variants `primary`, `secondary`, `danger`, `link` |
| `Badge` | Status pill (colors in section 6) |
| `Dropdown` | Labelled select used in forms and filters |
| `SearchFilters` | Search box on the left, **Filters** popover on the right |
| `DataTable` | Table with clickable rows; IDs in monospace |
| `Modal`, `ConfirmModal` | Create forms, record details, confirmations |
| `Toast` | Bottom "Success" notice that hides after a few seconds |

The existing Assets, Categories, and Equipment Types pages predate the design. Move them to these components when you next work on them.

## 5. Interaction patterns

- **List pages:** `PageIntro` → `Panel` with `SearchFilters` → `DataTable`. Clicking a row opens the record's detail modal. Show an empty-state message when there are no results.
- **Create:** a modal titled with the action (for example "Add Asset"), with a two-column form. Required fields end with `*`. The footer has **Cancel** and a primary button named for the action ("Save Asset", "Confirm Checkout").
- **Details:** a modal with status badges at the top and editable fields below. Fields the user cannot edit are shown as disabled inputs labelled "· Read only" or "· System controlled". **Save Changes** is enabled only after something changes. Closing with unsaved changes asks for confirmation. After saving, show an inline success message.
- **Workflow actions** (Checkout, Start Maintenance, Process Return, Complete Maintenance, Archive) sit in the detail modal footer and are disabled when the record's status does not allow them. The backend still enforces the rules.
- **Destructive actions:** a `danger` button opens a `ConfirmModal` that says what happens and that the record can be restored and its history is kept.
- **Errors:** show a block titled "Unable to …" with the message from the API (see [Frontend-Standards.md §3](Frontend-Standards.md#3-calling-the-api)).
- **Not designed yet:** the notification bell in the header. Do not implement it until it is specified.

## 6. Labels and badges

The API stores exact values ([database.md](database.md)); the UI shows friendly labels. Keep one mapping per field in the feature's `api.ts` and never send labels back to the API.

| API value | Label | Badge |
| --- | --- | --- |
| `Available` | Available | success |
| `On_Loan` | On Loan | warning |
| `Under_Maintenance` | Under Maintenance | danger |
| `Retired` | Retired | neutral |
| `Preventative-care` | Preventative Care | — |
| `Software Service` | Software Service | — |
| `Intact` / `Damaged` | Intact / Damaged | — |
| `is_deleted = true` | Archived | neutral |

Other badges: overdue, Urgent, and damage flag use danger; active loans, High, and in-progress maintenance use warning; completed and inactive use neutral; eligible, good standing, and active use success.

**Archive** in the UI means soft delete (`DELETE`), and **Restore** means the restore action ([Backend.md §5](Backend.md#5-soft-deletion)). Archived records stay visible behind an "Include Archived" option.

## 7. Where the design differs from the data model

Until the team decides, build what database.md supports and leave the extra design elements out. Record each decision here and in database.md.

| Design shows | Docs currently say | Until decided |
| --- | --- | --- |
| Serial Number on assets | No such field | Leave the field out |
| Required certifications typed on each asset | Certifications belong to the **equipment type** | Show the type's certifications read-only on the asset |
| Borrower **Eligibility** (Eligible/Ineligible) and a per-term eligible-borrowers import | No eligibility or term field; borrowers are active or soft-deleted, with standing derived from overdue loans and the damage flag | Show standing only; no eligibility field |
| Damage flags as a count that can be resolved one at a time | One `negligent_damage_flag` boolean | A single flag that can be set or cleared |
| Maintenance notes, resolution notes, damage notes on return | No such fields | Leave them out |
| Only Administrators archive and restore assets | Technicians manage inventory | Follow database.md §5 |
| Borrower last name required | Last name optional | Optional |
| Return marked Damaged has no maintenance option | Return may go straight to maintenance if damaged | Ask the PO before building returns |
| No Categories or Equipment Types pages; they are created inline from the asset form | Category and type names must be managed, archived, and restored | Keep the existing pages for now |
| Add Asset form has no Asset ID field | `asset_identifier` is required and unique | Keep the Asset ID field in the form |
| Category and equipment type can be changed on an existing asset | The asset edit API accepts `name` and `acquisition_date` only | Show category and type read-only in the details modal |
| Asset search matches ID or name | The API searches `asset_identifier` only | The placeholder says ID or name, but only the Asset ID is searched |
| Assets page has View by (category, type), a Filters popover (category, type, status), and Include Archived | The asset list has no such filters and returns active assets only | View by groups assets in the frontend. Show Filters and Include Archived disabled |
