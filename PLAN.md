# wuild — wheel build toolkit

## Goal

One place for spoke math, rim/nipple geometry sketches, and tension visualization—things that are often split across calculators, PDFs, and forum posts.

## Stack (decision)

- **Backend:** Django (single app, migrations, admin for reference data).
- **Frontend:** Server-rendered templates; **HTMX** optional for partial updates; **SVG** for rim, wheel, and tension diagrams (not Plotly for cross-sections).
- **Charts:** Plotly only if we add true plots (e.g. tension histograms)—not for mechanical sketches.

## Phases

### Phase 1 — Foundation

- Django project + core app, templates, static files, base layout.
- `TODO.md` tracks granular tasks; features land as focused git commits.

### Phase 2 — Spoke length

- Form inputs (hub, rim ERD, lacing, holes, offsets as needed).
- Spoke length calculation in Python (see `core/spoke_length.py`).
- SVG wheel map: colors group identical lengths; per-spoke table (even = left, odd = right).

### Phase 3 — Rim / hub / nipple sketch

- Models in `core/models.py` (`Rim`, `Hub`, `Nipple`); admin registered; optional fixture `core/fixtures/demo_parts.json` (`loaddata demo_parts`).
- Page `/section/`: `core/section_layout.py` builds paths; `templates/core/includes/section_svg.html` — schematic rim cavity, nipple head/shank, dashed center plane, spoke to chosen flange.

### Phase 4 — Tension

- Input grid: Park TM-1 scale readings + spoke diameter (for conversion chart).
- Table of deviations from target; SVG rim polygon colored green → yellow → orange → red.
- Park chart as data (lookup table or documented interpolation)—no guessing.

### Phase 5 — Polish

- Saved builds (optional), admin polish, print-friendly diagrams, README for contributors.

## Git workflow

- **One commit per feature** (or per logical slice: model + migration, page + template, etc.).
- Message style: imperative, short subject; body only when context helps (`feat:`, `fix:`, `docs:`, `chore:`).

## Memory / continuity

- Product decisions and formulas live in **code comments**, **this file**, and **`TODO.md`**—not only in chat.
