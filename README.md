# wuild

Wheel-building helpers: **spoke length** and **TM-1 tension map**. The main UI is a static TypeScript app under `web/` (hash routes `#/`, `#/spokes`, `#/tension`). The original Django implementation remains in `legacy/` for reference, parity checks, and Python tests.

## AI assistance and accuracy

This project—including app code, tests, and much of the documentation—was **written with the help of AI coding tools**. Outputs were not blindly trusted: **manual checks** were run against **other spoke and tension calculators** (and, where applicable, the legacy Python implementation and its tests) to catch gross errors. Even so, **verify critical builds** with your own measurements, manufacturer data, and established references (for example Park’s current TM-1 chart). The authors and tools here are **not** a substitute for workshop judgment.

## Static app (`web/`)

```bash
cd web
npm install
npm run dev          # http://localhost:5173
npm test             # Vitest (math aligned with legacy Django tests)
npm run build        # output in web/dist/
```

For **GitHub Pages** (project site at `https://<user>.github.io/<repo>/`), set the Vite base when building locally, for example:

```bash
cd web && VITE_BASE=/<your-repo-name>/ npm run build
```

### Pages deploy from GitHub Actions

The workflow [`.github/workflows/web.yml`](.github/workflows/web.yml) builds on push to `main`, uploads `web/dist`, and runs `actions/deploy-pages@v4`. **One-time repo setup** (otherwise deploy fails with `HttpError: Not Found` / “Failed to create deployment”):

1. Open **Settings → Pages** for the repository.
2. Under **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”). Save if prompted.
3. Push to `main` again or **Re-run failed jobs** on the last workflow run.

If Pages still fails: confirm the repo is allowed to use Pages (public repos work on free plans; **private** repos under an **organization** may need a paid plan or org policy). The environment name `github-pages` is created when Actions-based Pages is enabled.

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
