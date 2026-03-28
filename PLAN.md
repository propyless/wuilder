# wuild — wheel build toolkit

## Goal

One place for spoke math, rim/nipple geometry sketches, and tension visualization—things that are often split across calculators, PDFs, and forum posts.

## Stack (decision)

- **Backend:** Django (single app, migrations, admin for reference data).
- **Frontend:** Server-rendered templates; **HTMX** optional for partial updates; **SVG** for rim, wheel, and tension diagrams (not Plotly for cross-sections).
- **Cross-page build params:** **`localStorage`** (small vanilla JS) to persist the last spoke-calculator inputs—or a subset needed by tension / section—so users are not retyping offsets, ERD, PCDs, crosses, and spoke count when switching tools. Include a **schema version** key in the JSON blob so we can migrate or ignore stale payloads; UI copy should warn that stored values may be from another wheel.
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

### Tension page — hub offset context (**shipped** — 2026-03)

**Goal:** Help builders connect TM-1 balance checks to *why* left/right targets differ, using the same flange offsets as the spoke-length tool—without implying that TM-1 readings *measure* rim dish in millimeters.

**Status:** Core items below are implemented (`static/js/build_params.js`, `core/hub_geometry.py`, tension template + form fields, `core/tests/test_hub_geometry.py`). Optional follow-ups: `/section/` hydration from the same blob; richer hub drawing; spoke-count mismatch warning — see `TODO.md`.

**What to ship**

1. **Side-view schematic (SVG)**  
   - Wheel center plane as a vertical line; left/right flange positions from **left_flange_offset_mm** and **right_flange_offset_mm** (same meaning as on `/spokes/`).  
   - Optional: hub body as a simple rectangle or two circles at flange PCD height—enough to read “asymmetric hub” at a glance.  
   - Short prose: offsets are geometric inputs; dish is set at the stand with lateral adjustments, not read from the tension meter.

2. **Optional comparison strip (numbers + one sentence)**  
   After the user submits tensions, if offsets are present: show **measured** side-average ratio (or NDS % of DS if ratio mode) next to a **reference** derived only from geometry.  
   - **Reference (honest scope):** Treat spokes as axially stiff with stiffness roughly proportional to `1 / spoke_length` per side (reuse lengths from `build_spoke_results` or side averages). For a centered rim, the *illustrative* left:right tension ratio follows from balancing axial force components from each side’s flange offset *w* and spoke geometry—derive one clear formula, document it in code comments, and label the UI as approximate.  
   - Label clearly: *“Illustrative ratio from offsets & spoke lengths, not a guarantee.”*  
   - If offsets or ERD are missing, hide the ratio line; still allow tension-only use.

3. **Data flow — `localStorage` (decision)**  
   - **Write:** On successful **spoke calculator** submit (or on “Update” after valid results), serialize a small JSON object to a single namespaced key (e.g. `wuild.buildParams.v1`) with fields needed downstream: at minimum **left/right flange offset**, plus **ERD**, **left/right flange PCD**, **crosses**, **spoke count**, and any fields required for the illustrative ratio math.  
   - **Read:** On **tension** (and optionally **section**) page load, a short script reads the blob, pre-fills matching form fields or hidden inputs, and shows a one-line notice: *“Using saved hub/rim values from Spoke length — clear or edit below.”* Provide **Clear saved** (remove key) and always allow manual override; empty storage falls back to form defaults.  
   - **Why not session-only:** No server round-trip or login; works on static-ish deploys; pairs with Django forms by hydrating `value=` from server *or* client (prefer server initial render when POST repopulates; use JS only to merge in stored defaults when the form is fresh).  
   - **Later:** Optional **saved builds** on the server (Phase 5) can coexist—localStorage remains the fast default for a single in-progress wheel.

**Out of scope for this plan**

- Plotting actual rim lateral position vs hub from TM-1 alone.  
- Full finite-element or nipple-friction models.

**Implementation slices (suggested commits)**

1. **`localStorage` plumbing:** `static/js/build_params.js` (or similar)—save on spoke success, load/clear UI hooks; document schema in a comment at top of file.  
2. Pure diagram: tension template partial + small builder in Python (offsets in mm → SVG paths), no ratio math.  
3. Optional fields on `TensionMapForm` + validation; hydrate from storage on first paint; wire diagram when both offsets ≥ 0.  
4. Reference ratio helper + unit tests; show next to existing left/right averages when form complete enough (ERD + both PCDs + crosses + spoke count to match tension grid—or accept slight mismatch if spoke counts differ and show warning).

**Files likely touched**

- `core/forms.py` (`TensionMapForm`), `core/views.py` (`tension_map`), new helper module or functions next to `spoke_length.py`, `templates/core/tension_map.html` (+ optional include), `templates/core/spoke_calculator.html` (script include + save trigger), `templates/base.html` if scripts are centralized, `static/js/build_params.js`, `static/css/app.css`, tests under `core/tests/`.

## Git workflow

- **One commit per feature** (or per logical slice: model + migration, page + template, etc.).
- Message style: imperative, short subject; body only when context helps (`feat:`, `fix:`, `docs:`, `chore:`).

## Memory / continuity

- Product decisions and formulas live in **code comments**, **this file**, and **`TODO.md`**—not only in chat.
