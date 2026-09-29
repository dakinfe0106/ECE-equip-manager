# ECE-equip-manager
a software tool to track equipment it lends from the Shop. Currently Shop technicians manually edit a set of Excel files to do this, and they would like a software tool to make the record keeping and lookup functionality more efficient for them.

# Local Setup
run `git clone git@github.com:schotsuw/ECE-equip-manager.git`
or `git clone https://github.com/schotsuw/ECE-equip-manager.git`

## Prerequisites
- **Python 3.12 or 3.13**. Check with `python3 --version` (Mac) or `python --version` (Windows).
- **PostgreSQL 18 or 17** from the [EDB installer](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads) (Mac and Windows). The installer includes pgAdmin 4 and `psql`.

> Only run **one** PostgreSQL server on your machine. If you already have Postgres.app, Homebrew `postgresql`, or an older EDB version installed, see [Troubleshooting](#troubleshooting) before installing.

## Project layout
```
server/
├── .venv/                  # your virtual environment (not committed)
└── equipmanager/           # Django project root (manage.py lives here)
    ├── .env.example        # template for your local .env
    ├── requirements.txt
    ├── manage.py
    └── equipmanager/       # settings.py, urls.py, ...
```

## Database Setup
1. Run the PostgreSQL 18 (or 17) installer and keep the defaults (port `5432`, superuser `postgres`). Remember the password you choose.
2. Put `psql` on your PATH (replace `18` with `17` below if that's your version):
   - **Mac:** `echo 'export PATH="/Library/PostgreSQL/18/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc`
   - **Windows:** add `C:\Program Files\PostgreSQL\18\bin` to your PATH, then open a new terminal.
3. Check it works: `psql --version` should print `18.x` (or `17.x`).
4. Create the database and set the password the project expects (`postgres` / `postgres`, see `server/equipmanager/.env.example`):
   ```
   psql -U postgres -h localhost -c "CREATE DATABASE equipmanager;"
   psql -U postgres -h localhost -c "ALTER USER postgres PASSWORD 'postgres';"
   ```
   Each command asks for your installer password. After the second one, the password is `postgres`.

The server starts automatically when your computer boots, so you don't need to start it before working.

You can also do this in **pgAdmin 4** instead: Servers → PostgreSQL 18 → right-click Databases → Create → Database → `equipmanager`.

## Backend Setup
From the repo root:

**Mac/Linux**
```
cd server
python3 -m venv .venv
source .venv/bin/activate
cd equipmanager
cp .env.example .env
python -m pip install -r requirements.txt
```

**Windows (PowerShell)**
```
cd server
python -m venv .venv
.\.venv\Scripts\Activate.ps1
cd equipmanager
copy .env.example .env
python -m pip install -r requirements.txt
```

Next, open `server/equipmanager/.env` and set `DJANGO_SECRET_KEY` (it's blank in the template, and the server won't start without it). Generate one with:
```
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Then, from `server/equipmanager`:
```
python manage.py migrate
python manage.py runserver
```

`.env` holds your local settings (database login, secret key) and is ignored by git. Edit it if your database password isn't `postgres`. When you add a new setting, also add it to `.env.example` so teammates get it.

The server runs at http://127.0.0.1:8000. `migrate` should print a list of `Applying ... OK` lines the first time.

**Every new terminal:** activate the venv again (`source server/.venv/bin/activate` or `.\server\.venv\Scripts\Activate.ps1` from the repo root), then `cd server/equipmanager` before running `manage.py`. Your prompt shows `(.venv)` when it's active.

### Optional: admin login
Create a local admin account with:
```
python manage.py createsuperuser
```
Then log in at http://127.0.0.1:8000/admin. Each teammate creates their own, because it's stored in your local database.

### Adding Python packages
After `pip install <package>`, update the requirements file from `server/equipmanager` (with the venv active) so everyone gets it:
- **Mac/Linux:** `pip freeze > requirements.txt`
- **Windows:** `pip freeze | Out-File -Encoding utf8 requirements.txt` (plain `>` in PowerShell saves as UTF-16, which breaks diffs)

## Troubleshooting

**`Port 5432 is already in use`**
Another PostgreSQL server is already running. Find it:
- **Mac:** `sudo lsof -i :5432`
- **Windows:** `netstat -ano | findstr :5432`

Keep one server and uninstall the others. Old EDB installs have an uninstaller in `/Library/PostgreSQL/<version>/` (Mac) or in Apps & Features (Windows).

**`password authentication failed for user "postgres"`**
Your `postgres` password doesn't match `DB_PASSWORD` in `server/equipmanager/.env`. Either put your real password in `.env`, or run the `ALTER USER` command from Database Setup step 4.

**`database "equipmanager" does not exist`**
Run the `CREATE DATABASE` command from Database Setup step 4.

**`KeyError: 'DJANGO_SECRET_KEY'` or `The SECRET_KEY setting must not be empty`**
`.env` is missing or `DJANGO_SECRET_KEY` is blank. See Backend Setup.

**`psql: command not found`**
PATH isn't set in this terminal. Run `source ~/.zshrc` (Mac) or open a new terminal (Windows).

**`connection refused` / `could not connect to server`**
The PostgreSQL server isn't running. Check with `pg_isready -h localhost`. To start it:
- **Mac:** `sudo launchctl load /Library/LaunchDaemons/postgresql-18.plist` (or `postgresql-17.plist`)
- **Windows:** Services → `postgresql-x64-18` (or `-17`) → Start

**`ModuleNotFoundError: No module named 'django'`**
The venv isn't active. Activate it (see Backend Setup).
