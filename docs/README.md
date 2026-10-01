# ECE Equipment Management System

The ECE Equipment Management System is a web application for managing equipment that the ECE Shop lends out.

The current process relies heavily on manually maintained Excel files. This project aims to make equipment record keeping, lookup, lending, maintenance tracking, and related workflows easier and more reliable.

## Project Structure

```text
ECE-equip-manager/
├── frontend/                  # React + TypeScript frontend
├── server/
│   ├── .venv/                 # Local Python environment, not committed
│   └── equipmanager/          # Django project root (where manage.py lives)
│       ├── .env.example
│       ├── requirements.txt       # Packages the app needs to run
│       ├── manage.py
│       ├── pytest.ini
│       ├── ruff.toml
│       ├── equipmanager/      # Project config (settings, root URLs, health check)
│       │   ├── settings.py
│       │   ├── urls.py        # Root URLs; mounts each app's urls.py under /api/
│       │   └── views.py       # Health check
│       ├── inventory/         # App: equipment categories, types, assets
│       ├── lending/           # App: borrowers, loans, returns, lending history
│       ├── maintenance/       # App: maintenance records and workflows
│       └── users/             # App: users, authentication, roles, permissions
├── docs/
│   └── Architecture.md
├── .gitignore
└── README.md
```

## Django Project vs. Apps

Django splits a backend into one **project** and several **apps**.

- The **project** is the configuration for the whole backend. Here it is the inner `equipmanager/` folder, created once by `django-admin startproject`. It holds settings that apply everywhere: installed apps, database, CORS, authentication, default permissions, and the root `urls.py`. It does not contain business features.
- An **app** is a Python package that owns one area of the business. Each app has its own `models.py`, `views.py`, `urls.py`, `admin.py`, `tests.py`, and `migrations/`, and gets `serializers.py` when it exposes API endpoints. An app is created with `python manage.py startapp <name>` and only becomes active after it is added to `INSTALLED_APPS` in `settings.py`. `startapp` does not create `urls.py`, so a new app also needs one created by hand and included in the root `urls.py`.

Following the modular monolith in [Architecture.md](Architecture.md#7-backend-organization), the apps are `inventory`, `lending`, `maintenance`, and `users`. Put new functionality in the app that owns that business responsibility (for example, equipment checkout goes in `lending`). Do not create a new app for every model or small feature, and do not create a catch-all app such as `core` for features.

`users` defines a custom `User` model (`AUTH_USER_MODEL = 'users.User'`). Always reference users through `settings.AUTH_USER_MODEL` or `get_user_model()`, never `django.contrib.auth.models.User`.

```text
React ──HTTP/JSON──▶ equipmanager/urls.py (project)
                        ├── /api/health/  → equipmanager/views.py
                        ├── /api/         → inventory/urls.py
                        ├── /api/         → lending/urls.py
                        ├── /api/         → maintenance/urls.py
                        └── /api/         → users/urls.py
                                               │
                                               ▼
                                          PostgreSQL
```

Every app's `urls.py` is already included in the root `urls.py`, and each starts as an empty `urlpatterns` list. Add routes to the app's own `urls.py`; the root `urls.py` does not need to change when you add an endpoint.

## Prerequisites

Install the following before starting:

- **Node.js 24**
- **npm**
- **Python 3.14**
- **PostgreSQL 18**

Check versions with:

```bash
node --version
npm --version
python --version
psql --version
```

On macOS, your Python command may be `python3`.

## Clone the Repository

Using SSH:

```bash
git clone git@github.com:schotsuw/ECE-equip-manager.git
```

Or HTTPS:

```bash
git clone https://github.com/schotsuw/ECE-equip-manager.git
```

Then:

```bash
cd ECE-equip-manager
```

---

# Backend Setup

## 1. Create the virtual environment

From the repository root:

### macOS / Linux

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
cd equipmanager
```

### Windows PowerShell

```powershell
cd server
python -m venv .venv
.\.venv\Scripts\Activate.ps1
cd equipmanager
```

Your prompt should show `(.venv)` when the environment is active.

## 2. Install dependencies

From `server/equipmanager`:

```bash
python -m pip install -r requirements.txt pytest pytest-django ruff
```

This installs the packages in `requirements.txt` plus the test and lint tools (pytest, pytest-django, Ruff). CI installs the same way. The test and lint tools are not in `requirements.txt` because the running application does not need them.

The `.env` file in the next step needs your PostgreSQL password. If PostgreSQL is not installed yet, do [PostgreSQL Setup](#postgresql-setup) first, then come back.

## 3. Create your local environment file

### macOS / Linux

```bash
cp .env.example .env
```

### Windows PowerShell

```powershell
copy .env.example .env
```

The `.env` file contains local values such as:

```text
DJANGO_SECRET_KEY=
DJANGO_DEBUG=True

DB_NAME=equipmanager
DB_USER=postgres
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=5432

CORS_ALLOWED_ORIGINS=http://localhost:5173
```

`.env` is ignored by Git.

`.env.example` is committed and should contain required variable names, but not real secrets.

## 4. Generate a Django secret key

From `server/equipmanager`:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copy the generated value into:

```text
DJANGO_SECRET_KEY=
```

inside your `.env`.

---

# PostgreSQL Setup

Each developer uses a local PostgreSQL 18 database for day-to-day development.

The shared/staging database is separate and should not normally be used for local feature development.

## 1. Install PostgreSQL 18

Download PostgreSQL 18 from the [EDB installer](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads) for macOS or Windows. Keep the default port (`5432`) and the `postgres` superuser, and remember the password you choose. The installer includes pgAdmin 4 and `psql`.

Only run one PostgreSQL server on your computer. If you already use Postgres.app, Homebrew PostgreSQL, or another EDB installation, keep that server and do not install or start a second one.

Add the PostgreSQL command-line tools to your PATH if `psql` is not found. Replace `18` with `17` if using PostgreSQL 17:

### macOS

```bash
echo 'export PATH="/Library/PostgreSQL/18/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Windows

Add `C:\Program Files\PostgreSQL\18\bin` to the system or user `Path`, then open a new terminal.

Confirm the installation:

```bash
psql --version
```

The PostgreSQL service normally starts when the computer boots. If it is not running, see [Troubleshooting](#troubleshooting).

The default PostgreSQL port is:

```text
5432
```

Only run one PostgreSQL server on your machine.

## 2. Verify PostgreSQL

```bash
psql --version
```

## 3. Create the local database

Using `psql`:

```bash
psql -U postgres -h localhost -c "CREATE DATABASE equipmanager;"
```

Use the PostgreSQL password configured on your own machine.

Put that password in your local `.env`:

```text
DB_PASSWORD=<your local PostgreSQL password>
```

Developers do not need to share the same local PostgreSQL password.

The `.env.example` template uses `postgres` as its sample `DB_PASSWORD`. After copying it, update `DB_PASSWORD` in your local `.env` to the password you configured for your local PostgreSQL `postgres` user. Never commit the local `.env` file.

You can also create the database using pgAdmin 4: open **Servers → PostgreSQL 18 → Databases**, right-click **Databases**, select **Create → Database**, and name it `equipmanager`.

---

# Database Migrations

Migrations keep the database structure up to date with the Django models.

If you change a Django model:

```bash
python manage.py makemigrations
python manage.py migrate
```

Commit the generated migration with the feature that introduced the model change.

If you pull code that already contains new migration files:

```bash
python manage.py migrate
```

You do not need to run `makemigrations` again unless you changed a model yourself.

Before opening a pull request that changes models:

```bash
python manage.py makemigrations --check --dry-run
```

Once a migration has been merged into `main`, do not casually delete or rewrite it.

---

# Run the Backend

From `server/equipmanager` with the virtual environment active:

```bash
python manage.py migrate
python manage.py runserver
```

The Django development server runs at:

```text
http://127.0.0.1:8000
```

## Optional: Django Admin

Create a local admin account:

```bash
python manage.py createsuperuser
```

Then visit:

```text
http://127.0.0.1:8000/admin
```

Each developer creates their own local admin user because it is stored in their own local database.

## First-run checklist

From `server/equipmanager` with the virtual environment active, all four of these should pass before you start a feature. They are the same checks CI runs.

```bash
python -m ruff check .                              # All checks passed!
python manage.py check                              # System check identified no issues
python manage.py makemigrations --check --dry-run   # No changes detected
python -m pytest                                    # all tests pass
```

Then follow [Verify the Frontend Is Connected to the Backend](#verify-the-frontend-is-connected-to-the-backend).

---

# Frontend Setup

From the repository root, install the exact frontend dependencies recorded in the lockfile:

```bash
cd frontend
npm ci
```

This installs the frontend tools, including ESLint and Vitest. It requires access to the npm registry. If installation cannot reach the registry, check the configured registry with `npm config get registry` (normally `https://registry.npmjs.org/`) and test connectivity with `npm ping`, then retry `npm ci`.

Use `npm install` when you intentionally add or update dependencies; review and commit the resulting changes to both `package.json` and `package-lock.json`.

Start the Vite development server:

```bash
npm run dev
```

By default, Vite normally serves the frontend at:

```text
http://localhost:5173
```

The intended frontend stack includes:

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- ESLint
- Vitest

Vitest is configured as the frontend test runner. Tailwind CSS and React Router are intended parts of the frontend stack but are not currently declared in `frontend/package.json`.

The browser frontend calls Django from a different origin. Django only accepts `/api/` requests from origins listed in `CORS_ALLOWED_ORIGINS` in `server/equipmanager/.env` (comma-separated, default `http://localhost:5173`). If the frontend runs on a different port or host, add that origin explicitly; do not enable all origins.

---

# Running the Full Application

Use two terminals.

## Terminal 1: Backend

```bash
cd server
```

Activate the virtual environment.

### macOS / Linux

```bash
source .venv/bin/activate
cd equipmanager
python manage.py runserver
```

### Windows PowerShell

```powershell
.\.venv\Scripts\Activate.ps1
cd equipmanager
python manage.py runserver
```

## Terminal 2: Frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` and click **Test Backend Connection**. It should show `{"status":"ok"}`.

## Verify the Frontend Is Connected to the Backend

The frontend and backend run on different origins (`localhost:5173` and `localhost:8000`). Three things must work for them to talk:

1. Django is running and serving `/api/`.
2. Django's CORS settings allow the frontend's origin, so the browser accepts the response.
3. The frontend calls the right URL (currently `http://localhost:8000/api/health/` in `frontend/src/App.tsx`).

Check them in this order:

**1. The backend answers on its own.** With `runserver` running:

```bash
curl -i http://localhost:8000/api/health/
```

Expect `HTTP/1.1 200 OK` and `{"status": "ok"}`. If this fails, the problem is the backend, not the frontend.

**2. CORS allows the frontend origin.** Pretend to be the browser by sending an `Origin` header:

```bash
curl -i -H "Origin: http://localhost:5173" http://localhost:8000/api/health/
```

The response must include the header `Access-Control-Allow-Origin: http://localhost:5173`. If that header is missing, add the origin to `CORS_ALLOWED_ORIGINS` in `server/equipmanager/.env` and restart `runserver`.

**3. The browser gets the response.** Open `http://localhost:5173`, open the browser developer tools (**Network** tab), and click **Test Backend Connection**. The `health/` request should have status `200`, and the page should show `{"status":"ok"}`. A `blocked by CORS policy` message in the **Console** tab means step 2 is failing.

**4. Automated check.** `server/equipmanager/test_health.py` runs steps 1 and 2 through Django's test client. It runs with `python -m pytest` and in CI.

Endpoints in the business apps require a logged-in Django session (see [Authentication](Architecture.md#9-authentication-and-authorization)), so they return `403` until login is implemented. A `403` from those endpoints means the connection works and the request was refused. `/api/health/` is public and is the endpoint to use for connection checks.

---

# API

The React frontend calls the Django API at:

```text
http://localhost:8000/api/
```

All endpoints live under `/api/` and end with a trailing slash.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health/` | Public. Checks that the API is reachable: `{"status": "ok"}` |

By default, API endpoints require an authenticated Django session (`IsAuthenticated` in `REST_FRAMEWORK` settings). A view that must be public has to opt out explicitly.

## Adding an Endpoint

New endpoints go in the app that owns the feature, not in the project folder. For example, to add `/api/equipment/` to `inventory`:

1. Add the model to `inventory/models.py`, then run `python manage.py makemigrations inventory` and `python manage.py migrate`.
2. Create `inventory/serializers.py` with a serializer for the model.
3. Add the view to `inventory/views.py`.
4. Add the route to `inventory/urls.py`, for example `path('equipment/', views.EquipmentList.as_view(), name='equipment-list')`. It is already mounted under `/api/`.
5. Add tests in `inventory/tests.py`.

Resource names use plural nouns and a trailing slash (see [API Conventions](Architecture.md#8-api-conventions)).

## Trying a Protected Endpoint

New endpoints require a logged-in session, so opening one before login exists returns `403`. To try it in the browser:

1. Create a local admin account once with `python manage.py createsuperuser`.
2. Log in at `http://localhost:8000/admin/`.
3. In the same browser, open your endpoint, for example `http://localhost:8000/api/equipment/`. Django REST Framework shows an interactive page where you can read data and send `POST` requests.

Use the same host for both steps. Cookies for `localhost` and `127.0.0.1` are separate, so logging in on one does not log you in on the other.

In tests, log in with the test client instead:

```python
import pytest
from django.contrib.auth import get_user_model


@pytest.mark.django_db
def test_equipment_list_requires_login(client):
    assert client.get('/api/equipment/').status_code == 403

    user = get_user_model().objects.create_user(username='tech', password='pw-for-tests')
    client.force_login(user)
    assert client.get('/api/equipment/').status_code == 200
```

All four apps share the `/api/` prefix, so a path must be unique across every app, not just within its own `urls.py`. If two apps define the same path (for example, both define `users/`), Django uses whichever app is included first in `equipmanager/urls.py` and silently ignores the other. Name each path after a resource the app owns: `equipment/` in `inventory`, `loans/` in `lending`.

---

# Testing

## Frontend

From `frontend`, run the available checks:

```bash
npm run lint
npm run build
npm test -- --run --passWithNoTests
```

Vitest runs the frontend tests. CI currently treats an empty test suite as successful during initial scaffolding.

## Backend

From `server/equipmanager` with the virtual environment active:

```bash
python -m pytest
python -m ruff check .
```

pytest, pytest-django, and Ruff are installed in Backend Setup, step 2.

pytest collects each app's `tests.py` and any `test_*.py` file (see `pytest.ini`). Ruff skips generated `migrations/` folders (see `ruff.toml`).

---

# Linting

## Frontend

```bash
cd frontend
npm run lint
```

## Backend

```bash
cd server/equipmanager
python -m ruff check .
```

Ruff is installed in Backend Setup, step 2.

---

# Adding Python Packages

Activate the backend virtual environment first.

Install the package:

```bash
python -m pip install <package>
```

Find the installed version:

```bash
python -m pip show <package>
```

Then add one pinned line to `requirements.txt` by hand, for example `django-filter==25.2`. Only add packages the running application needs. Development tools (pytest, pytest-django, Ruff) are installed by name in Backend Setup and in CI instead.

Do not use `pip freeze > requirements.txt`. It writes every package in your virtual environment, including pytest and Ruff and anything you installed to experiment, into the production requirements.

Mention new packages in your pull request, since teammates need to run `python -m pip install -r requirements.txt` after pulling.

---

# Git and Pull Request Workflow

Do not work directly on `main`.

Start from the latest `main`:

```bash
git switch main
git pull origin main
git switch -c feature/<description>
```

Before opening or updating a pull request:

```bash
git fetch origin
git merge origin/main
```

Resolve conflicts carefully and rerun relevant linting and tests.

After pulling or merging `main`, from `server/equipmanager` with the virtual environment active:

```bash
python -m pip install -r requirements.txt   # pick up new packages
python manage.py migrate                    # apply new migrations
```

Also compare `.env.example` with your `.env` and copy over any new settings.

Before every push, run the checks CI runs. If they pass locally, CI should pass:

```bash
python -m ruff check .
python manage.py check
python manage.py makemigrations --check --dry-run
python -m pytest
```

Push:

```bash
git push -u origin feature/<description>
```

Pull requests target `main`.

CI runs automatically and checks the frontend and backend.

Do not merge until required CI checks pass and the required review is complete.

Use the Microsoft Teams group to communicate about pull requests and overlapping work, especially when multiple developers may be changing the same files or feature. Changes to shared files (`equipmanager/settings.py`, `equipmanager/urls.py`, `requirements*.txt`) are worth a message before you start.

For the complete Git workflow and architecture decisions, see:

```text
docs/Architecture.md
```

---

# Troubleshooting

**`Port 5432 is already in use`**

Another PostgreSQL server is running. Find it with `sudo lsof -i :5432` on macOS or `netstat -ano | findstr :5432` on Windows. Keep one server and stop or uninstall the duplicate installation.

**`password authentication failed for user "postgres"`**

Make sure `DB_PASSWORD` in `server/equipmanager/.env` matches the password for your local PostgreSQL `postgres` user.

**`database "equipmanager" does not exist`**

Create it by following [PostgreSQL Setup](#postgresql-setup), step 3.

**`KeyError: 'DJANGO_SECRET_KEY'` or `The SECRET_KEY setting must not be empty`**

Check that `server/equipmanager/.env` exists and that `DJANGO_SECRET_KEY` contains the generated key from Backend Setup.

**`psql: command not found`**

Add PostgreSQL's `bin` directory to PATH as described in PostgreSQL Setup, then open a new terminal. On macOS, run `source ~/.zshrc` after updating it.

**`connection refused` or `could not connect to server`**

Check the server with `pg_isready -h localhost`. On Windows, open Services and start `postgresql-x64-18` (or the installed version). For an EDB installation on macOS, start the service with `sudo launchctl load /Library/LaunchDaemons/postgresql-18.plist` (or the matching version).

**`ModuleNotFoundError: No module named 'django'`**

The virtual environment is not active. Activate it (`source server/.venv/bin/activate` on macOS/Linux, `.\server\.venv\Scripts\Activate.ps1` on Windows) and install dependencies as described in Backend Setup.

**Frontend shows `blocked by CORS policy` in the browser console**

The frontend's origin is not in `CORS_ALLOWED_ORIGINS` in `server/equipmanager/.env`. Add it (for example `http://localhost:5173`) and restart `runserver`.

**`relation "..." does not exist`**

The database is missing tables. Run `python manage.py migrate`.

**`InconsistentMigrationHistory: Migration admin.0001_initial is applied before its dependency users.0001_initial`**

Your local database was migrated before the custom `users.User` model existed. Django cannot switch user models on an existing database, so recreate your local database once. This deletes all local data, including your local superuser. Stop `runserver` first:

```bash
psql -U postgres -h localhost -c "DROP DATABASE equipmanager WITH (FORCE);"
psql -U postgres -h localhost -c "CREATE DATABASE equipmanager;"
python manage.py migrate
python manage.py createsuperuser
```

**`database "equipmanager" is being accessed by other users`**

Something still has a connection open, usually `runserver` in another terminal or pgAdmin. Stop or disconnect it, or add `WITH (FORCE)` to the `DROP DATABASE` command, which closes the other connections for you.

**`Conflicting migrations detected; multiple leaf nodes in the migration graph`**

You and a teammate each added a migration to the same app (for example, both created `0002_...` in `lending`). After merging `main`, run:

```bash
python manage.py makemigrations --merge
python manage.py migrate
```

Commit the generated merge migration. If your migration is not on `main` yet, you can instead delete your own migration file, run `python manage.py migrate <app> <last migration from main>` to unapply it locally, and run `makemigrations` again so it builds on top of your teammate's.

**`No module named pytest` or `No module named ruff`**

Install the development tools: `python -m pip install pytest pytest-django ruff`.

**Your new endpoint returns `403 Forbidden`**

The request reached your view but was not logged in. See [Trying a Protected Endpoint](#trying-a-protected-endpoint).

**Your new endpoint returns `404 Not Found`**

The path is not routed. Check that the route is in the app's `urls.py`, that the URL ends with `/`, and that no other app already uses the same path (all apps share `/api/`). With `DJANGO_DEBUG=True`, the 404 page lists every pattern Django tried.

---

# CI

GitHub Actions runs automatically for pull requests into `main`.

Frontend CI checks:

```text
npm ci from lockfile
ESLint
Vitest
Vite build
```

Backend CI checks:

```text
pip dependencies
Ruff
Django system checks
migration check
temporary PostgreSQL 18
migrations
pytest
```

During initial project scaffolding, CI may temporarily allow a project with no tests.

Once real frontend and backend tests exist, the no-tests exceptions should be removed.

---

# Documentation

Architecture decisions, diagrams, conventions, authentication direction, deletion strategy, migration rules, CI behavior, and database environment decisions are documented in:

```text
docs/Architecture.md
```
