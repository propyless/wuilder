# wuild — wheel build toolkit

## Goal

One place for spoke math, rim/nipple geometry sketches, and tension visualization—things that are often split across calculators, PDFs, and forum posts.

## Stack (decision)

- **Backend:** Django (single app, migrations, admin for reference data).
- **Frontend:** Server-rendered templates; **HTMX** optional for partial updates; **SVG** for rim, wheel, and tension diagrams (not Plotly for cross-sections).
- **Cross-page build params:** **`localStorage`** (small vanilla JS) to persist the last spoke-calculator inputs—or a subset needed by the tension page—so users are not retyping offsets, ERD, PCDs, crosses, and spoke count when switching tools. Include a **schema version** key in the JSON blob so we can migrate or ignore stale payloads; UI copy should warn that stored values may be from another wheel.
- **Charts:** Plotly only if we add true plots (e.g. tension histograms)—not for mechanical sketches.

## Phases

### Phase 1 — Foundation

- Django project + core app, templates, static files, base layout.
- `TODO.md` tracks granular tasks; features land as focused git commits.

### Phase 2 — Spoke length

- Form inputs (hub, rim ERD, lacing, holes, offsets as needed).
- Spoke length calculation in Python (see `core/spoke_length.py`).
- SVG wheel map: colors group identical lengths; per-spoke table (even = left, odd = right).

### Phase 3 — Rim / hub / nipple (data + embedded sketch)

- Models in `core/models.py` (`Rim`, `Hub`, `Nipple`); admin registered; optional fixture `core/fixtures/demo_parts.json` (`loaddata demo_parts`).
- Cross-section schematic lives on the **spoke calculator** when you fill optional rim fields and choose a nipple: `core/section_layout.py`, `templates/core/includes/section_svg.html` / `section_detail_svg.html` — rim cavity, nipple, spoke to flange.

### Phase 4 — Tension

- Input grid: Park TM-1 scale readings + spoke diameter (for conversion chart).
- Table of deviations from target; SVG rim polygon colored green → yellow → orange → red.
- Park chart as data (lookup table or documented interpolation)—no guessing.

### Phase 5 — Polish

- Saved builds (optional), admin polish, print-friendly diagrams, README for contributors.

### Tension page — hub offset context (**shipped** — 2026-03)

**Goal:** Help builders connect TM-1 balance checks to *why* left/right targets differ, using the same flange offsets as the spoke-length tool—without implying that TM-1 readings *measure* rim dish in millimeters.

**Status:** Core items below are implemented (`static/js/build_params.js`, `core/hub_geometry.py`, tension template + form fields, `core/tests/test_hub_geometry.py`). Optional follow-ups: richer hub drawing; spoke-count mismatch warning — see `TODO.md`.

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
   - **Read:** On **tension** page load (or via **Load saved**), a short script reads the blob, pre-fills matching form fields, and can show a notice. Provide **Clear saved** (remove key) and always allow manual override; empty storage falls back to form defaults.  
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

## Static client port (GitHub Pages) — **planned**

**Objective:** Ship the same wheel-building tools as a **static site** (no Django): all math and TM-1 lookup in the **browser**, deploy to **GitHub Pages** (or any static host).

**Non-goals (v1):** Server auth, multi-user saved builds, Django admin. Optional parts (`Rim` / `Hub` / `Nipple` DB) become **JSON catalogs** or a trimmed UX.

### Recommended stack

| Piece | Suggestion |
|--------|------------|
| Build | **Vite** + **TypeScript** |
| UI | **Vanilla TS** (small app) *or* **React** if you prefer component ergonomics for large forms |
| Tests | **Vitest** — port numeric cases from `core/tests/test_*.py` |
| Styling | Port `static/css/app.css` incrementally; CSS variables already help |
| Deploy | **GitHub Actions**: `vite build` → artifact to `gh-pages` branch or **Pages from Actions**; set `base` in Vite for project Pages URL (`/repo-name/`) |

### Repo layout — **decision: monorepo**

- Put the Vite app under **`wuild/web/`** (own `package.json`, `src/`, `vite.config.ts`). Django stays at repo root for reference until parity.
- GitHub Pages can publish **`web/dist/`** via Actions (or build into `docs/` if you prefer that convention—Actions is clearer).

### “Hash” routing vs normal paths (GitHub Pages)

GitHub Pages is **only static files**: it does **not** know that `/wuild/tension` should load your SPA. If you use **normal URLs** like `/wuild/tension` (HTML5 **History** API), a **refresh** or **shared link** often returns **404** unless you add a workaround (e.g. duplicate `index.html` as `404.html`, or host elsewhere).

**Hash routing** keeps the “page” in the part of the URL **after `#`**, which the **server never sees**:

| Style | Example URL | Refresh / deep link on Pages |
|--------|-------------|------------------------------|
| **Hash** | `https://you.github.io/wuild/#/tension` | Safe: server always serves `index.html`; JS reads `tension` from the hash. |
| **Path** | `https://you.github.io/wuild/tension` | Needs extra setup (404 → `index.html` trick or `base` + careful hosting). |

So **“hash”** here means **fragment-based routes** (`#/spokes`, `#/tension`), not cryptography. You can switch to path routing later if you add a Pages-friendly fallback.

**Decision — routing:** **Hash routing** (`#/`, `#/spokes`, `#/tension`). Path-style URLs can be revisited later with a Pages SPA fallback if you want cleaner links.

### Python → TypeScript module map

| Source (Django) | Target (client) | Notes |
|-----------------|-----------------|-------|
| `core/spoke_length.py` | `src/math/spokeLength.ts` | `buildSpokeResults`, `lacingAngleRad`, `maxCrosses`, flange-offset-from-width helper |
| `core/hub_geometry.py` | `src/math/hubGeometry.ts` | Side-view numbers + illustrative ratio |
| `core/tm1.py` + chart data | `src/tm1/` (`lookup.ts`, `chart.json` or generated `chart.ts`) | Export knots/segments once; mirror interpolation + bounds |
| `core/tension_viz.py` | `src/tension/viz.ts` | Row model, radar paths, band colors, ratio summary types |
| `core/nipple_fit.py` | `src/math/nippleFit.ts` | Optional v1.5 |
| `core/section_layout.py` | `src/section/layout.ts` + SVG components | Largest port; defer to Phase D |
| `static/js/*.js` | Absorb into TS modules (`storage/buildParams`, `storage/formPersist`, `flangeOffsetCalc`) | Same keys (`wuild.*.v1`) for migration |

### Data migration

1. **TM-1:** Script or one-time manual export from `tm1.py` into versioned JSON (schema field for future Park chart updates).
2. **Parts:** `core/fixtures/demo_parts.json` (or DB dump) → `public/data/parts.json` with shape `{ rims: [], hubs: [], nipples: [] }` for dropdowns.
3. **Copy / legal:** Keep Park attribution strings as constants (same as templates).

### Routing & UX

- **SPA** with **hash routes:** `#/` (home), `#/spokes`, `#/tension` (adjust names to match UI). Use **`import.meta.env.BASE_URL`** in Vite for **assets** only; the hash carries **in-app navigation**.
- Replicate **localStorage** behavior: full form persist, build-params handoff, flange calc blob, **auto-submit after restore** (validity + submit when restored state is valid—equivalent to current `requestSubmit` flow).

### Phased rollout (suggested)

1. **Phase S0 — Scaffold:** Vite+TS, lint/format, Vitest empty, GitHub Action deploys `dist/` to Pages; placeholder home.
2. **Phase S1 — Spoke calculator:** Inputs, validation, length table, plan-view SVG, flange offset calculator, persist + auto-run when valid restored state.
3. **Phase S2 — Tension:** TM-1 grid (dynamic spoke count), kgf column, variance / ratio modes, heatmap + radar SVG, hub geometry panel, illustrative ratio, persist + `?spoke_count=` equivalent in router query or state.
4. **Phase S3 — Handoff parity:** `buildParams` mapping spoke → tension fields; clear/load UX; spoke-count mismatch guard.
5. **Phase S4 — Optional depth:** Static parts catalog UI; rim section + nipple fit (`section_layout`, `nipple_fit`); print-friendly CSS.
6. **Phase S5 — Cutover:** README “canonical app is static”; Django archived or kept only for data authoring scripts.

### Verification

- For each ported function, carry over **existing Python test vectors** (same numeric inputs/outputs in Vitest).
- Manual smoke on GitHub Pages URL (base path, refresh, deep link).

### Risks / notes

- **Single source of truth:** Until Django is retired, document which tree is authoritative; prefer **TS-first** once S2 ships to avoid drift.
- **Bundle size:** Negligible for this app; TM-1 data is small.
- **i18n:** Out of scope unless you add it later.

---

## Memory / continuity

- Product decisions and formulas live in **code comments**, **this file**, and **`TODO.md`**—not only in chat.
