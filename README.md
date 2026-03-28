# wuild

Wheel build helpers (Django): spoke lengths, tension map (TM-1), rim section sketch.

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Tests

Use the project virtualenv so Django and deps resolve correctly:

```bash
.venv/bin/python manage.py test
```

Or after `source .venv/bin/activate`: `python manage.py test`.
