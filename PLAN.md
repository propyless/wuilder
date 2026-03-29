# wuild — plan

## Goal

One place for spoke math, rim/nipple cross-section sketches, and TM-1 tension visualization—without hunting across calculators, PDFs, and forum threads.

## Architecture (current)

| Area | Path | Role |
|------|------|------|
| **Canonical UI** | `web/` | Vite + TypeScript SPA, hash routes (`#/`, `#/spokes`, `#/tension`, `#/builds`), Vitest, ESLint + Prettier. Deploy: GitHub Actions builds `web/dist` and publishes Pages; `VITE_BASE` matches the repo name for project URLs. |
| **Reference stack** | `legacy/` | Django app + Python tests. Use for parity checks, historical templates, and numeric fixtures—not the primary place for new product behavior. |

**Decision:** Treat **`web/` as source of truth** for user-facing behavior and formulas. When Django and TS disagree, fix TS first and align or retire the legacy path over time.

## Product rules (carry forward)

- **Cross-page handoff:** `localStorage` keys are versioned (`wuild.*.v1` style). UI should warn that saved values may be from another wheel.
- **TM-1:** Conversion uses Park chart data as lookup/interpolation—no invented curves. Keep attribution strings with the data.
- **Illustrative hub / tension ratio:** Geometry-based side ratio next to measured averages is labeled as approximate; TM-1 does not measure dish in millimeters.

## Django → TypeScript map

Legacy Python modules and their primary TS counterparts:

| Legacy (`legacy/core/` …) | Web (`web/src/`) |
|---------------------------|------------------|
| `spoke_length.py` | `math/spokeLength.ts` |
| `hub_geometry.py` | `math/hubGeometry.ts` |
| `tm1.py` + chart data | `tm1/lookup.ts`, `data/tm1_charts.json` |
| `tension_viz.py` | `tension/viz.ts`, `tension/html.ts` |
| `nipple_fit.py` | `section/nippleFit.ts` |
| `section_layout.py` | `section/layout.ts`, `section/sectionHtml.ts` |
| Static JS blobs | `storage/*` (build params, form persist, flange calc) |

When porting or changing math, prefer **copying test vectors** from `legacy/core/tests/` into Vitest so behavior stays aligned.

## Routing

**Hash routing** on GitHub Pages: e.g. `https://user.github.io/repo/#/tension`. The server always serves `index.html`; the fragment is client-only. Asset URLs still use Vite `base` / `import.meta.env.BASE_URL`.

## Git workflow

- One commit per logical slice (feature or tight pair).
- Subject: imperative, short (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`). Body only when it saves future readers time.

## Where decisions live

Product copy, formula choices, and scope boundaries belong in **code comments**, **this file**, and **`TODO.md`**, not only in chat.

## Out of scope (unless explicitly reopened)

- Plotting true rim lateral position from TM-1 alone.
- Full FE / nipple friction models.
- Server auth and multi-user sessions in the static app (v1).
