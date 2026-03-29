# wuild

Wheel-building helpers: **spoke length** and **TM-1 tension map**. The main UI is a static TypeScript app under `web/` (hash routes `#/`, `#/spokes`, `#/tension`). The original Django implementation remains in `legacy/` for reference, parity checks, and Python tests.

## Static app (`web/`)

```bash
cd web
npm install
npm run dev          # http://localhost:5173
npm test             # Vitest (math aligned with legacy Django tests)
npm run build        # output in web/dist/
```

For **GitHub Pages** (project site at `https://<user>.github.io/<repo>/`), set the Vite base when building, for example:

```bash
cd web && VITE_BASE=/<your-repo-name>/ npm run build
```

**Printing:** Use the browser’s print dialog on any tool page. Styles in `web/src/styles/print.css` hide navigation and buttons, stack wide layouts, and keep wheel / section diagrams in color where the browser allows. Collapsed **details** blocks (flange calculator, hub geometry, etc.) open automatically for the print job.

## Legacy Django (`legacy/`)

```bash
cd legacy
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Tests (with the same virtualenv activated):

```bash
python manage.py test
```

## Layout

| Path        | Role |
|------------|------|
| `web/`     | Vite + TypeScript SPA, TM-1 data in `src/data/tm1_charts.json` |
| `legacy/`  | Django app (templates, `manage.py`, SQLite default in `legacy/`) |
