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

- [ ] Models: `Rim`, `Hub` (flange / offset fields TBD), `Nipple` (fields TBD from sketch needs)
- [ ] Migrations + admin registration
- [ ] Cross-section SVG include: rim + nipple + spoke line from **hub connection** to rim (parameterized template)

## Phase 4 — Tension

- [ ] Park TM-1 conversion data (per spoke diameter) as fixtures or code
- [ ] Tension input UI + deviation metrics
- [ ] Tension heatmap SVG (rim with per-spoke colors + legend)

## Phase 5 — Polish

- [ ] README: run locally, env vars, contributing
- [ ] Optional: saved builds / sessions
