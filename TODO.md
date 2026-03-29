# wuild — TODO

Prefer **one commit per finished bullet** (or a tightly related pair).

## Next (highest value)

- [ ] **Spoke count vs storage:** If `buildParams` (or last spoke form) spoke count ≠ tension grid count, show a clear warning and/or one-click align—see tension handoff UX.
- [ ] **Docs sweep:** Ensure root `README.md` stays the entry point (env vars, `web/` vs `legacy/`, CI/Pages). Trim duplication with `PLAN.md` instead of repeating full runbooks in both.

## Polish

- [ ] **Tension hub panel:** Optional richer side-view schematic (hub body / PCD hints) while keeping “illustrative, not measured” copy.
- [ ] **Print / export:** Print-friendly CSS for summaries or diagrams (static app).
- [ ] **Test parity:** Spot-check critical paths against `legacy/core/tests/` and add Vitest cases where gaps show up.

## Optional / later

- [ ] **Saved builds:** Extend or simplify named saved builds in `web/` (UX + storage limits).
- [ ] **Parts catalog:** Broader static JSON for rims/hubs if you outgrow nipples-only presets.
- [ ] **`section/layout.ts`:** Split or document submodules if the file keeps growing (geometry vs SVG vs public API).

## Legacy (`legacy/`)

- [ ] Keep Django runnable for regression comparison until you explicitly retire it; update `PLAN.md` / `README.md` if the folder role changes.

---

**Baseline (no checkbox needed):** Static app scaffold, spokes + tension + builds pages, TM-1 data, build-params handoff, flange offset helper, rim section + nipple fit, Vitest + ESLint + Prettier, CSS partials, GitHub Actions → Pages.
