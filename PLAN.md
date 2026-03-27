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
- Spoke length calculation in Python (document formula source in code).
- SVG “wheel map”: which positions use which lengths (color or labels).

### Phase 3 — Rim / hub / nipple sketch

- Models: **rim** dimensions, **hub** geometry (flange diameter, offsets / spacing as needed), **nipple** specs — enough to know **where the hub anchors the spoke** and how the line meets the rim well (engagement depth, thread in rim).
- Django template partial: cross section (rim + nipple + spoke from **hub flange to nipple**), driven by context vars — not only the rim bed in isolation.

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
