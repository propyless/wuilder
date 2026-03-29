# wuild (legacy Django)

This is the original server-rendered Django app. It is kept for regression tests and as a reference while the static client in `../web/` is the primary UI.

## Run

From this directory:

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Settings use `BASE_DIR` under `legacy/` (templates, static files, and default `db.sqlite3` live here).

## Tests

```bash
.venv/bin/python manage.py test
```
