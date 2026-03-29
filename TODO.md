# wuild — task list

Check items off as we complete them. Prefer **one git commit per finished bullet** (or tightly related pair).

## Setup & docs

- [x] Add `PLAN.md`, `TODO.md`, and Python `.gitignore`
- [x] Initialize git repository and initial commit

## Phase 1 — Foundation

- [x] Create Python virtual environment and pin dependencies (`requirements.txt` or `pyproject.toml`)
- [x] Create Django project and core app (settings, URLs, `templates/`, `static/`)
- [x] Base template + simple home page

## Phase 2 — Spoke length

- [x] Spoke length calculator: form, validation, calculation module
- [x] Results page/table
- [x] Wheel plan SVG (spoke positions / length groups)

## Phase 3 — Rim / hub / nipple

- [x] Models: `Rim`, `Hub`, `Nipple`
- [x] Migrations + admin registration
- [x] Cross-section SVG (rim + nipple + spoke to flange); fixture `demo_parts`

## Phase 4 — Tension

- [x] Park TM-1 conversion data (per spoke diameter) as fixtures or code
- [x] Tension input UI + deviation metrics
- [x] Tension heatmap SVG (rim with per-spoke colors + legend)

## Phase 5 — Polish

- [ ] README: env vars, contributing (run locally + tests: see README.md)
- [ ] Optional: saved builds / sessions

## Tension + hub offsets (see PLAN.md § *Tension page — hub offset context*)

- [x] Side-view SVG on tension page from left/right flange offsets (center plane + flanges)
- [x] `localStorage` build-params save (spoke page) + load/clear/apply on tension page; optional hub geometry fields on `TensionMapForm`
- [x] Illustrative geometry-based tension ratio vs measured averages (labeled approximation) + tests (`core/tests/test_hub_geometry.py`)
- [ ] Optional follow-up: extra hub schematic detail from plan (hub body / PCD circles); spoke-count mismatch warning when stored vs tension grid differ

## Static port — GitHub Pages (see PLAN.md § *Static client port*)

- [ ] **S0:** Vite + TypeScript scaffold, **hash routing** (`#/…`), Vitest, GitHub Actions → Pages (`base` correct for project URL)
- [ ] **S1:** Spoke calculator parity (math, wheel SVG, flange offset helper, storage, auto-run when restored)
- [ ] **S2:** Tension map parity (TM-1 data JSON, grid, viz, hub panel, illustrative ratio, storage)
- [ ] **S3:** Cross-page `buildParams` + spoke-count handling (router query or full reload strategy)
- [ ] **S4 (optional):** Static parts JSON + rim section / nipple fit; print CSS
- [ ] **S5:** README cutover; retire or demote Django app in docs
