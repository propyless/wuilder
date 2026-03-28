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
- [ ] Optional follow-up: hydrate `/section/` from the same `localStorage` blob (that page is model pickers today — needs a deliberate approach)
- [ ] Optional follow-up: extra hub schematic detail from plan (hub body / PCD circles); spoke-count mismatch warning when stored vs tension grid differ
