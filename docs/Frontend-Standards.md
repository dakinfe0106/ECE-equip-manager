# Frontend Development Standards

This document outlines the setup, conventions, and standards for the React frontend of the ECE Equipment Management System (EMS). 

Our goal is to keep the frontend simple, consistent, and easy for all team members to contribute to, while maintaining high code quality.

---

## 🛠️ Technology Stack

- **Framework:** React with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router
- **State Management:** React built-in (`useState`, `useContext`)
- **Testing:** Vitest
- **Linting & Formatting:** ESLint
- **Runtime:** Node.js 24
- **Package Manager:** npm

---

## 🚀 Local Setup & Running

Follow these steps to get the frontend running on your local machine:

1. **Verify Prerequisites:** Ensure you have Node.js 24 and npm installed.
   ```bash
   node --version  # Should be v24.x.x
   npm --version

2. **Navigate to Frontend Directory:** From the root of the monorepo, move into the frontend folder:
    ```bash
       cd frontend

3. **Install Dependencies:** Always use `npm ci` to respect the exact versions in the lockfile and ensure consistency across the team.
    ```bash
    npm ci

4. **Start the Development Server:**
    ```bash
       npm run dev

The application will be available at `http://localhost:5173`. It supports Hot Module Replacement (HMR), so your changes will reflect instantly.

## ✅ Quality Checks (Run Before Pushing)
To ensure your Pull Request passes the GitHub Actions CI pipeline, you must run these checks locally before pushing your code:

```bash
    npm run lint    # Checks for TypeScript errors and ESLint rule violations
    npm test        # Runs Vitest unit tests
    npm run build   # Ensures the app compiles successfully for production
```
*Tip: If a check fails, read the error message carefully. It will usually tell you the exact file and line number to fix.*

# 🏗️ Architecture & Coding Conventions

**1. API Communication**

- The frontend does not connect directly to PostgreSQL.

- All data must be fetched from the Django backend via the REST API.

- API endpoints should use the `/api/` base path (e.g., `GET /api/equipment-types/`).

- Use standard HTTP methods: `GET` (retrieve), `POST` (create), `PATCH` (partial update), `DELETE` (remove).

**2. State Management**

- Use React's built-in `useState` for local component state.
- Use `useContext` for sharing simple global state (like current user authentication status).
- *Do not* introduce external state management libraries (like Redux or Zustand) unless explicitly agreed upon by the team for a complex, justified use case. The Django backend remains the single source of truth for all EMS data.

**3. Styling (Tailwind CSS)**

- Use Tailwind CSS utility classes for all styling.
- Create reusable UI components in a `components/` directory only when the exact same pattern appears repeatedly (e.g., a custom `Button` or `DataTable`).
- Avoid creating unnecessary abstractions for very small, one-off pieces of UI.

**4. Routing**

- React Router manages all frontend navigation.
- Use clear, pluralized, and lowercase paths (e.g., `/equipment`, `/equipment/:id`, `/borrowers`, `/maintenance`).

**Testing**

- Write unit tests for reusable components and custom hooks using Vitest.
- Mock backend API responses during testing (e.g., using MSW - Mock Service Worker) so tests remain fast and isolated from the Django server.

# 🌿 Git & Collaboration Workflow

**1. Branching:** Never work directly on `main`. Always create a short-lived feature branch from the latest `main`:

 ```bash
    git switch main
    git pull origin main
    git switch -c feature/your-feature-name
```
**2. Committing:** Make small, logical commits with clear messages (e.g., `feat: add equipment type list view`).

**3. Pull Requests:**

- Open a PR into `main`     .
- The PR description must explain: What changed, Why it changed, and How it was tested.
- Ensure all CI checks (ESLint, Vitest, Build) pass before requesting a review.

**4. Merging:** Use *squash merge* to keep the `main` branch history clean and readable. Delete the feature branch after merging.

# 🆘 Troubleshooting & Common Issues

- **`npm ci` fails:** Check your internet connection and ensure you are using the correct Node.js version (v24). You can check your npm registry with `npm config get registry`.
- **CI Pipeline fails on linting:** Run `npm run lint` locally. Ruff/ESLint will often provide an auto-fix command (e.g., `npm run lint -- --fix`).
- **API returns 401/403:** Ensure your Django backend is running, and that you are properly handling authentication cookies/tokens as defined by the backend team.

*For backend setup instructions, API endpoint definitions, or database schema details, please refer to `docs/README.md` and `docs/Architecture.md`.*
