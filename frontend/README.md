# ECE Equipment Manager Frontend

React + TypeScript application built with Vite, using Tailwind CSS, React Router, ESLint, and Vitest.

## Local development

Use Node.js 24. From this directory:

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env` when you need local configuration. `VITE_API_URL` sets the API base URL, defaulting to `http://localhost:8000/api`. Restart Vite after changes. Never put secrets in `VITE_` variables: they are exposed to the browser.

The current page has a **Test Backend Connection** button that calls `/health/` under the configured API base. Run Django separately to test the real connection. See [the setup guide](../docs/README.md#frontend-setup) for backend setup and CORS instructions.

On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`.

## Styling and routing

Tailwind runs through `@tailwindcss/vite` in `vite.config.ts` and is imported in `src/index.css`. Use utility classes for component styles; shared global CSS belongs in the base layer. React Router uses `BrowserRouter` in `src/main.tsx`; add routes in `src/AppRoutes.tsx` and use `Link` or `NavLink` for internal navigation.

The initial `/` route displays the health-check page. Unknown paths display a fallback with a home link. Business pages are not implemented yet. Teammates only need `npm ci` after pulling these changes.

In deployment, the frontend host must serve `index.html` for direct requests to client-side routes. Keep `/api/` requests routed to Django.

## Checks

```sh
npm run lint
npm test -- --run
npm run build
```

Tests use MSW to mock HTTP responses; they do not verify connectivity to a running backend. An empty suite fails CI. The build includes TypeScript checks and produces `dist/`.

Follow [AGENTS.md](../AGENTS.md) for planning and approval, [Architecture.md](../docs/Architecture.md) for conventions, and [Quality.md](../docs/Quality.md) for feature acceptance.
