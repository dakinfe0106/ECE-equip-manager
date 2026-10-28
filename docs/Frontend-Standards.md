# Frontend Development Standards

Code conventions for the React frontend of the ECE Equipment Management System (EMS). The goal is a simple, consistent codebase that every developer and coding agent extends the same way.

Related documents:

- **UI design (pages, look, interactions): [UI-Design.md](UI-Design.md)**
- Setup, environment variables, and running the full app: [README.md](README.md#frontend-setup)
- Workflow, required checks, and Git: [AGENTS.md](../AGENTS.md)
- Available API endpoints: [README.md](README.md#api)
- Business rules and permissions: [database.md](database.md)
- Definition of Done: [Quality.md](Quality.md)

---

## 1. Technology stack

- **React 19** with **TypeScript**, built with **Vite**
- **Tailwind CSS v4** through `@tailwindcss/vite`. There is no `tailwind.config.js`; theme tokens go in the `@theme` block in `src/index.css`.
- **React Router 8**. Import from `react-router`, not `react-router-dom`.
- **State:** React built-ins (`useState`, `useContext`)
- **Testing:** Vitest, with MSW for mocked HTTP
- **Linting:** ESLint. No formatter is configured; match the surrounding code.
- **Runtime:** Node.js 24, npm

Do not add dependencies (state libraries, UI kits, data-fetching libraries, testing libraries) without team agreement.

Before pushing, run from `frontend/`:

```bash
npm run lint
npm test -- --run   # plain `npm test` starts watch mode
npm run build       # also type-checks
```

## 2. Folder layout

```text
src/
├── api.ts              # Shared: apiBaseUrl, getCsrfToken()
├── App.tsx             # Layout shell: Sidebar + <Outlet />
├── AppRoutes.tsx       # All routes
├── components/
│   ├── layout/         # App shell: Sidebar, Header
│   └── ui/             # Shared design components (UI-Design.md §4)
├── pages/              # One component per route; composes feature components
├── features/<name>/
│   ├── api.ts          # Types and fetch functions for this resource
│   ├── hooks/          # Data-loading hooks
│   └── components/     # UI used by this feature
└── tests/              # Component and routing tests
    └── integration/    # API-client tests with MSW
```

- Pages do not call `fetch` directly. Put requests in `features/<name>/api.ts`.
- Move a component to `components/` only when a second feature needs it.

## 3. Calling the API

The frontend talks only to the Django REST API, never to the database. Use the endpoints listed in [README.md](README.md#api). If one you need does not exist, it is backend work: raise it in the plan instead of inventing a URL.

Follow the pattern in `features/assets/api.ts`:

- Build URLs from `apiBaseUrl` (set by `VITE_API_URL`). Never hard-code the host.
- Send `credentials: 'include'` on every request to a protected endpoint, so the Django session cookie is sent.
- On `POST`, `PATCH`, and `DELETE`, send the `X-CSRFToken` header from `getCsrfToken()`.
- Type every request and response. Keep the backend's field names (`asset_id`, `acquisition_date`). Do not use `any`.
- Paginated lists return `{ count, next, previous, results }`.
- On failure, throw a typed error that carries the HTTP status (see `AssetLookupError` and `CategoryRequestError`).
- Error responses use DRF's shapes:
  - `400`: `{ "<field>": ["message"] }`. Show the message next to the field.
  - `403`: not logged in, or no permission. Tell the user to sign in or ask for access.
  - Other errors: `{ "detail": "message" }`.
- `DELETE` is a soft delete. Loans and maintenance records have no `DELETE`. Restoring uses `POST <resource>/<id>/restore/` (proposed in [Backend.md](Backend.md#5-soft-deletion)).

## 4. State and data loading

- Use `useState` for local state and `useContext` only for genuinely global state, such as the current user once login exists.
- The backend is the source of truth. After a write, use the record the API returns instead of patching state from guesses.
- For simple reads, reuse `useApiData` (`features/categories/hooks/useApiData.ts`). It cancels stale requests. If another feature uses it, move it to `src/hooks/` in that change.
- Every view that loads data handles **loading, empty, error, and success** states.

## 5. Styling

- Follow [UI-Design.md](UI-Design.md) for the look and behavior of every screen.
- Style with Tailwind utility classes in the component, using the design tokens from [UI-Design.md §3](UI-Design.md#3-design-tokens) (`bg-primary`, `text-muted`). Do not repeat raw values like `text-[#1f2b3e]`; add a token instead.
- Do not add new `.css` files or copy the prototype's `index.css`. `index.css` holds the base styles and theme; `App.css` holds the old shell styles until the shell is moved to the design.
- Build repeated pieces (buttons, badges, modals, tables) once in `components/ui/` and reuse them.
- Use semantic elements (`button`, `label`, `table`) and keep interactions keyboard-accessible.

## 6. Routing

- Add routes in `src/AppRoutes.tsx` inside the `<App />` layout route, and add a sidebar entry in `components/layout/Sidebar.tsx`.
- Use `Link` or `NavLink` for internal navigation.
- Use the route map in [UI-Design.md §2](UI-Design.md#2-pages-and-routes). Paths are lowercase and kebab-case. Do not invent other top-level routes.
- Create and detail screens are modals on the list page, not separate routes. Put filters in query parameters (`/loans?status=Overdue`).
- Do not add `/equipment` routes. Naming `assets` vs `equipment` is a [pending decision](Backend.md#9-pending-decisions); follow the existing `assets` paths.

## 7. Product rules the UI must reflect

These come from the Project Overview and [database.md](database.md#4-operating-rules). The backend enforces them; the UI must not contradict them.

- **Permissions:** Technicians manage records; Faculty may only view inventory and analytics; Administrators also manage users ([database.md §5](database.md#5-permissions-scope)). Hide or disable controls a user cannot use, but never rely on that for security.
- **Recoverable deletes:** every delete can be undone. The UI calls this **Archive** and **Restore** ([UI-Design.md §6](UI-Design.md#6-labels-and-badges)). Where a resource supports archiving, also provide a way to view archived records and restore them.
- **Consistent naming:** names are trimmed and unique ignoring case. Trim input before sending, show the backend's duplicate error, and optionally warn early (see `findDuplicateCategory`).
- **Asset status:** values are exactly `Available`, `On_Loan`, `Under_Maintenance`, `Retired`; show them with the labels in [UI-Design.md §6](UI-Design.md#6-labels-and-badges). Status changes only through workflows (checkout, return, maintenance, retirement). Never offer a status field on an edit form.
- **Dates:** loan and maintenance fields are dates (`YYYY-MM-DD`), not timestamps.
- **Login:** there is no login page yet ([Backend.md §6](Backend.md#6-authentication-endpoints)). To use protected pages locally, log in at `/admin/` on the same host ([README.md](README.md#trying-a-protected-endpoint)).

## 8. Testing

- **API clients:** test with MSW in `tests/integration/`, using `onUnhandledRequest: 'error'`. Cover success, `400`, and `403`. These tests use mocked responses; they do not prove the real backend works ([Quality.md](Quality.md#verification-evidence-and-handoff)).
- **Components and routes:** React Testing Library is not installed. Render with `renderToString` from `react-dom/server` (wrapped in `MemoryRouter` for routes) and assert on the HTML, as in `tests/routing.test.tsx`.
- Add a routing test for each new route.

## 9. Troubleshooting

- **API returns 403:** no logged-in Django session, or the user lacks permission. Only session authentication is enabled. See [Backend.md §6](Backend.md#6-authentication-endpoints).
- **Blocked by CORS:** see [README.md](README.md#verify-the-frontend-is-connected-to-the-backend).
- **`npm ci` fails:** check the Node.js version (v24) and `npm config get registry`.
- **Lint fails:** `npm run lint -- --fix` fixes many issues automatically.
