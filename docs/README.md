# ECE Equipment Management System

The ECE Equipment Management System is a web application for managing equipment that the ECE Shop lends out.

The current process relies heavily on manually maintained Excel files. This project aims to make equipment record keeping, lookup, lending, maintenance tracking, and related workflows easier and more reliable.

## Project Structure

```text
ECE-equip-manager/
├── frontend/                  # React + TypeScript frontend
├── server/
│   ├── .venv/                 # Local Python environment, not committed
│   └── equipmanager/          # Django project root
│       ├── .env.example
│       ├── requirements.txt
│       ├── manage.py
│       ├── core/              # API app: models, serializers, views, urls, migrations
│       └── equipmanager/      # Project config
│           ├── settings.py
│           ├── urls.py        # Root URLs; mounts core/urls.py under /api/
│           └── views.py       # Health check
├── docs/
│   └── Architecture.md
├── .gitignore
└── README.md
```

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
python -m pip install -r requirements.txt
```

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

---

# API

The React frontend calls the Django API at:

```text
http://localhost:8000/api/
```

All endpoints live under `/api/` and end with a trailing slash.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health/` | Checks that the API is reachable: `{"status": "ok"}` |
| GET, POST | `/api/wel/` | Demo endpoint from the Django + React tutorial (`name`, `detail`) |

New endpoints go in `server/equipmanager/core/urls.py`. `equipmanager/urls.py` mounts them under `/api/`.

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
python -m pip install pytest pytest-django ruff
python -m pytest
python -m ruff check .
```

The test and lint tools are development dependencies and are not included in `requirements.txt`.

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

The Ruff command is available after installing the development tools listed in [Testing](#testing).

---

# Adding Python Packages

Activate the backend virtual environment first.

Install the package:

```bash
python -m pip install <package>
```

Then update `requirements.txt` from `server/equipmanager`.

### macOS / Linux

```bash
pip freeze > requirements.txt
```

### Windows PowerShell

```powershell
pip freeze | Out-File -Encoding utf8 requirements.txt
```

Review the resulting dependency changes before committing them.

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

Activate the backend virtual environment and install its dependencies as described in Backend Setup.

**Frontend shows `blocked by CORS policy` in the browser console**

The frontend's origin is not in `CORS_ALLOWED_ORIGINS` in `server/equipmanager/.env`. Add it (for example `http://localhost:5173`) and restart `runserver`.

**`relation "..." does not exist`**

The database is missing tables. Run `python manage.py migrate`.

Push:

```bash
git push -u origin feature/<description>
```

Pull requests target `main`.

CI runs automatically and checks the frontend and backend.

Do not merge until required CI checks pass and the required review is complete.

Use the Microsoft Teams group to communicate about pull requests and overlapping work, especially when multiple developers may be changing the same files or feature.

For the complete Git workflow and architecture decisions, see:

```text
docs/Architecture.md
```

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

# Troubleshooting

## `Port 5432 is already in use`

Another PostgreSQL server may already be running.

### macOS

```bash
sudo lsof -i :5432
```

### Windows

```powershell
netstat -ano | findstr :5432
```

Keep only the PostgreSQL instance you intend to use.

## `password authentication failed for user "postgres"`

Your local PostgreSQL password does not match `DB_PASSWORD` in:

```text
server/equipmanager/.env
```

Update the `.env` value to match your local PostgreSQL credentials.

## `database "equipmanager" does not exist`

Create the database:

```bash
psql -U postgres -h localhost -c "CREATE DATABASE equipmanager;"
```

## `KeyError: 'DJANGO_SECRET_KEY'`

Your `.env` file is missing or `DJANGO_SECRET_KEY` is blank.

Generate a key:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

and add it to `.env`.

## `psql: command not found`

PostgreSQL's `bin` directory is not on your PATH.

Make sure the PostgreSQL 18 command-line tools are available in the terminal.

## `connection refused` or `could not connect to server`

The local PostgreSQL service may not be running.

Check with:

```bash
pg_isready -h localhost
```

## `ModuleNotFoundError: No module named 'django'`

The Python virtual environment may not be active.

Activate:

### macOS / Linux

```bash
source server/.venv/bin/activate
```

### Windows PowerShell

```powershell
.\server\.venv\Scripts\Activate.ps1
```

---

# Documentation

Architecture decisions, diagrams, conventions, authentication direction, deletion strategy, migration rules, CI behavior, and database environment decisions are documented in:

```text
docs/Architecture.md
```
