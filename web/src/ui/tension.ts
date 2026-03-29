import {
  buildHubSideViewSvg,
  buildIllustrativeRatioSummary,
  geometryReadyForRatio,
  sideMeanSpokeLengthsMm,
} from "../math/hubGeometry";
import { maxCrosses } from "../math/spokeLength";
import {
  applyBuildParamsToTensionForm,
  clearBuildParams,
  loadBuildParams,
} from "../storage/buildParams";
import { attachFormPersist, loadFields } from "../storage/formPersist";
import { FORM_TENSION_KEY } from "../storage/keys";
import {
  buildTensionRadarPaths,
  buildTensionRatioSummary,
  buildTensionSideStats,
  buildTensionSpokeRows,
  sideAverageKgf,
  usesSideRatio,
} from "../tension/viz";
import {
  chartIdsAndLabels,
  chartSourceNote,
  tensionKgf,
  TM1LookupError,
} from "../tm1/lookup";
import { kgf2 } from "../format/kgf";

function spokeOptions(selected: number): string {
  const opts: string[] = [];
  for (let n = 12; n <= 52; n += 2) {
    opts.push(
      `<option value="${n}"${n === selected ? " selected" : ""}>${n}</option>`,
    );
  }
  return opts.join("");
}

function chartOptions(selected: string): string {
  return chartIdsAndLabels()
    .map(
      ([id, label]) =>
        `<option value="${id}"${id === selected ? " selected" : ""}>${escapeHtml(label)}</option>`,
    )
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function captureTm1InputValues(
  form: HTMLFormElement,
  nSpokes: number,
): Record<string, string> {
  const fd = new FormData(form);
  const nh = nSpokes / 2;
  const o: Record<string, string> = {};
  for (let j = 0; j < nh; j++) {
    for (const side of ["left", "right"] as const) {
      const name = `${side}_${j}`;
      const v = fd.get(name);
      if (v != null) o[name] = String(v);
    }
  }
  return o;
}

function readingsToInputValues(readings: number[]): Record<string, string> {
  const o: Record<string, string> = {};
  const nh = readings.length / 2;
  for (let j = 0; j < nh; j++) {
    o[`left_${j}`] = String(readings[2 * j]);
    o[`right_${j}`] = String(readings[2 * j + 1]);
  }
  return o;
}

function resolveInitialSpokeCount(): number {
  const stored = loadFields(FORM_TENSION_KEY);
  if (stored?.spoke_count) {
    const v = parseInt(stored.spoke_count, 10);
    if (Number.isFinite(v) && v >= 12 && v <= 52 && v % 2 === 0) return v;
  }
  const q = new URLSearchParams(window.location.search).get("spoke_count");
  if (q) {
    const v = parseInt(q, 10);
    if (Number.isFinite(v) && v >= 12 && v <= 52 && v % 2 === 0) return v;
  }
  return 32;
}

function hubSideSvgHtml(h: ReturnType<typeof buildHubSideViewSvg>): string {
  const s = h;
  return `
  <div class="hub-side-view-wrap" role="region" aria-label="Hub flange offsets side view">
    <div class="tension-stat-block-title">Hub offsets (axial)</div>
    <p class="hint hub-side-view-hint">Wheel center plane and flange distances (same meaning as the Spoke length page). This is geometry, not measured dish.</p>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s.vbW} ${s.vbH}" class="hub-side-view-svg" role="img">
      <title>Left and right flange offset from center plane</title>
      <line x1="${s.leftFlangeX.toFixed(2)}" y1="${s.axleY.toFixed(2)}" x2="${s.rightFlangeX.toFixed(2)}" y2="${s.axleY.toFixed(2)}" class="hub-side-axle" />
      <line x1="${s.centerX.toFixed(2)}" y1="${s.centerLineY1.toFixed(2)}" x2="${s.centerX.toFixed(2)}" y2="${s.centerLineY2.toFixed(2)}" class="hub-side-center-plane" />
      <line x1="${s.leftFlangeX.toFixed(2)}" y1="${s.flangeTickY1.toFixed(2)}" x2="${s.leftFlangeX.toFixed(2)}" y2="${s.flangeTickY2.toFixed(2)}" class="hub-side-flange-mark" />
      <line x1="${s.rightFlangeX.toFixed(2)}" y1="${s.flangeTickY1.toFixed(2)}" x2="${s.rightFlangeX.toFixed(2)}" y2="${s.flangeTickY2.toFixed(2)}" class="hub-side-flange-mark" />
      <text x="${s.leftFlangeX.toFixed(2)}" y="${s.labelY.toFixed(2)}" text-anchor="middle" class="hub-side-label">L</text>
      <text x="${s.rightFlangeX.toFixed(2)}" y="${s.labelY.toFixed(2)}" text-anchor="middle" class="hub-side-label">R</text>
      <text x="${s.centerX.toFixed(2)}" y="11" text-anchor="middle" class="hub-side-label hub-side-label-center">center</text>
    </svg>
    <dl class="hub-side-view-dl">
      <div class="hub-side-view-row"><dt>Left offset</dt><dd>${s.leftOffsetMm.toFixed(1)} mm</dd></div>
      <div class="hub-side-view-row"><dt>Right offset</dt><dd>${s.rightOffsetMm.toFixed(1)} mm</dd></div>
    </dl>
  </div>`;
}

function wtaStatsHtml(
  sideTitle: string,
  stats: ReturnType<typeof buildTensionSideStats>,
  vp: number,
): string {
  const ur =
    stats.upperReading != null
      ? stats.upperReading.toFixed(2)
      : `<span class="tension-stats-na">Outside chart</span>`;
  const lr =
    stats.lowerReading != null
      ? stats.lowerReading.toFixed(2)
      : `<span class="tension-stats-na">Outside chart</span>`;
  return `
  <div class="tension-wta-stats-wrap">
    <table class="tension-wta-stats">
      <caption class="tension-wta-stats-title">${escapeHtml(sideTitle)}</caption>
      <tbody>
        <tr><th scope="row">Average spoke tension (kgf)</th><td>${kgf2(stats.avgKgf)}</td></tr>
        <tr><th scope="row">Standard deviation of tension (kgf)</th><td>${kgf2(stats.stdevKgf)}</td></tr>
        <tr><th scope="row">+${vp.toFixed(0)}% upper tension limit (kgf)</th><td>${kgf2(stats.upperKgf)}</td></tr>
        <tr><th scope="row">TM-1 reading at +${vp.toFixed(0)}% limit</th><td>${ur}</td></tr>
        <tr><th scope="row">-${vp.toFixed(0)}% lower tension limit (kgf)</th><td>${kgf2(stats.lowerKgf)}</td></tr>
        <tr><th scope="row">TM-1 reading at -${vp.toFixed(0)}% limit</th><td>${lr}</td></tr>
      </tbody>
    </table>
  </div>`;
}

interface ParsedTension {
  readings: number[];
  tensionsKgf: number[];
  fieldErrors: Record<string, string>;
  nonFieldErrors: string[];
}

function parseTensionForm(
  form: HTMLFormElement,
  n: number,
  chartId: string,
): ParsedTension {
  const nHalf = n / 2;
  const fd = new FormData(form);
  const readings: number[] = [];
  const fieldErrors: Record<string, string> = {};
  const nonFieldErrors: string[] = [];

  for (let i = 0; i < nHalf; i++) {
    for (const side of ["left", "right"] as const) {
      const name = `${side}_${i}`;
      const raw = fd.get(name);
      if (raw === null || raw === "") {
        fieldErrors[name] = "Enter a TM-1 reading.";
        return { readings: [], tensionsKgf: [], fieldErrors, nonFieldErrors };
      }
      const v = parseFloat(String(raw).replace(",", "."));
      if (!Number.isFinite(v) || v < 0 || v > 60) {
        fieldErrors[name] = "Invalid reading.";
        return { readings: [], tensionsKgf: [], fieldErrors, nonFieldErrors };
      }
      readings.push(v);
    }
  }

  const tensionsKgf: number[] = [];
  for (let i = 0; i < readings.length; i++) {
    try {
      tensionsKgf.push(tensionKgf(chartId, readings[i]));
    } catch (e) {
      const j = i;
      const fname = j % 2 === 0 ? `left_${j / 2}` : `right_${(j - 1) / 2}`;
      fieldErrors[fname] =
        e instanceof TM1LookupError ? e.message : String(e);
      return { readings: [], tensionsKgf: [], fieldErrors, nonFieldErrors };
    }
  }

  const hubCrossesRaw = fd.get("hub_crosses");
  if (hubCrossesRaw != null && String(hubCrossesRaw) !== "") {
    const hc = parseInt(String(hubCrossesRaw), 10);
    if (Number.isFinite(hc) && hc >= 0 && hc > maxCrosses(n)) {
      nonFieldErrors.push(
        `For ${n} spokes, crosses must be ≤ ${maxCrosses(n)} (tangential hole spacing).`,
      );
      return { readings: [], tensionsKgf: [], fieldErrors, nonFieldErrors };
    }
  }

  return { readings, tensionsKgf, fieldErrors, nonFieldErrors };
}

function buildReadingRows(
  nHalf: number,
  fieldErrors: Record<string, string>,
  lastRows: ReturnType<typeof buildTensionSpokeRows> | null,
  side: "left" | "right",
  inputValues: Record<string, string>,
): string {
  const rows: string[] = [];
  for (let j = 0; j < nHalf; j++) {
    const name = `${side}_${j}`;
    const spoke = 2 * j + (side === "left" ? 1 : 2);
    const err = fieldErrors[name]
      ? `<span class="error tension-field-error">${escapeHtml(fieldErrors[name])}</span>`
      : "";
    const idx = 2 * j + (side === "left" ? 0 : 1);
    const row = lastRows?.[idx];
    const valAttr =
      inputValues[name] !== undefined
        ? ` value="${escapeHtml(inputValues[name])}"`
        : "";
    const kgfCell =
      row != null
        ? `<span class="tension-kgf-value">${kgf2(row.tensionKgf)}</span>${
            row.adjustAction
              ? `<span class="tension-kgf-arrow tension-kgf-arrow--${row.adjustShort === "T" ? "tighten" : "loosen"}" title="${escapeHtml(row.adjustAction)}" aria-label="${escapeHtml(row.adjustAction)}">${row.adjustShort === "T" ? "↑" : "↓"}</span>`
              : ""
          }`
        : "—";
    const limitCell =
      row != null
        ? `<span class="${row.withinVariance ? "tension-ok" : "tension-bad-mark"}">${escapeHtml(row.varianceLimitDetail)}</span>`
        : "—";
    rows.push(`<tr>
      <td class="tension-col-num">${spoke}</td>
      <td class="tension-col-input"><input type="number" class="tm1-input" name="${name}" id="id_${name}" step="any" min="0" max="60" required${valAttr} />${err}</td>
      <td class="tension-col-kgf">${kgfCell}</td>
      <td class="tension-col-limit">${limitCell}</td>
    </tr>`);
  }
  return rows.join("");
}

export function renderTension(container: HTMLElement): void {
  const n = resolveInitialSpokeCount();
  const nHalf = n / 2;
  const defaultChart = "steel_round_2.0";

  container.innerHTML = `
<div class="prose">
  <h1>Wheel tension balancing</h1>
  <p class="lede">Enter a <strong>TM-1</strong> reading per spoke (left / right columns match the Spokes wheel map). We convert to kgf. Set <strong>other side as % of reference</strong> to <strong>100%</strong> for Park style (each side vs its own average), or another value for a <strong>side ratio</strong> (e.g. 84% for non-drive vs drive). The variance limit is ±% from that reference. Spokes outside the band show <strong>↑</strong> / <strong>↓</strong> next to tension and <strong>T</strong> / <strong>L</strong> on the wheel map. The form is saved in your browser and restored after a refresh (including spoke count).</p>
</div>
<form class="tension-form-full" id="tension-map-form" novalidate data-form-persist-key="${FORM_TENSION_KEY}">
  <div id="tension-non-field-errors" class="form-errors" style="display:none"></div>
  <div class="tension-controls-bar">
    <div class="tension-controls-row">
      <div class="tension-control tension-control-spokes">
        <div class="field">
          <label for="id_spoke_count">Spokes</label>
          <select name="spoke_count" id="id_spoke_count">${spokeOptions(n)}</select>
        </div>
      </div>
      <div class="tension-control tension-control-wide">
        <div class="field">
          <label for="id_tm1_chart">TM-1 chart (spoke type)</label>
          <select name="tm1_chart" id="id_tm1_chart">${chartOptions(defaultChart)}</select>
        </div>
      </div>
      <div class="tension-control tension-control-variance">
        <div class="field">
          <label for="id_variance_percent">Variance limit (%)</label>
          <input type="number" name="variance_percent" id="id_variance_percent" step="any" min="1" max="50" value="20" />
        </div>
      </div>
      <div class="tension-control tension-control-submit">
        <div class="field tension-submit-field">
          <span class="tension-submit-label" aria-hidden="true">&#8203;</span>
          <button type="submit" class="btn tension-update-btn">Update</button>
        </div>
      </div>
    </div>
    <div class="tension-balance-block">
      <div class="tension-balance-controls">
        <div class="tension-balance-group tension-balance-group-ref">
          <label class="tension-balance-label" for="id_tension_ratio_reference">Reference side (100%)</label>
          <div class="field tension-balance-widget">
            <select name="tension_ratio_reference" id="id_tension_ratio_reference">
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div class="tension-balance-hint-ref-col">
            <p class="hint" id="id_tension_ratio_other_pct_hint">100% = Park style (each side vs its own average). Any other value applies a side ratio using the reference flange.</p>
          </div>
        </div>
        <div class="tension-balance-group tension-balance-group-pct">
          <label class="tension-balance-label" for="id_tension_ratio_other_pct">Other side as % of reference avg</label>
          <div class="field tension-balance-widget">
            <input type="number" name="tension_ratio_other_pct" id="id_tension_ratio_other_pct" step="any" min="30" max="150" value="100" aria-describedby="id_tension_ratio_other_pct_hint" />
          </div>
        </div>
      </div>
      <div class="tension-controls-help-row tension-controls-help-row-balance">
        <p class="hint tension-controls-bar-hint">Variance is ±% from each spoke’s reference (100% other-side = Park per-side average).</p>
        <details class="tension-help-details">
          <summary class="tension-help-summary" aria-label="Help: how tension map controls work" title="Help"><span class="tension-help-icon" aria-hidden="true">ℹ</span></summary>
          <div class="tension-help-panel">
            <p><strong>Readings</strong> — Left and right columns follow the same numbering as the Spokes wheel map.</p>
            <p><strong>Variance</strong> — Each spoke is compared to a reference tension.</p>
            <p><strong>Other side as % of reference</strong> — At <strong>100%</strong>, references are Park-style. Any other value applies a <strong>side ratio</strong>.</p>
            <p><strong>Map</strong> — Spoke color shows deviation from reference; rim dots <strong>T</strong> / <strong>L</strong> mean tighten or loosen when outside the band.</p>
          </div>
        </details>
      </div>
    </div>
  </div>

  <details class="tension-hub-geom-details" id="tension-hub-geom-details">
    <summary class="tension-hub-geom-summary">Hub / rim geometry (optional)</summary>
    <div class="tension-hub-geom-inner">
      <p class="hint tension-build-params-notice" id="tension-build-params-notice" hidden>Values can be filled from your last <strong>Spoke length</strong> calculation (browser storage). They may be from another wheel — edit or clear if wrong.</p>
      <p class="tension-build-params-actions">
        <button type="button" class="btn tension-build-params-btn" id="tension-build-params-apply">Load saved from Spoke length</button>
        <button type="button" class="btn tension-build-params-btn" id="tension-build-params-clear">Clear saved</button>
      </p>
      <div class="form-grid tension-hub-geom-grid">
        <div class="field"><label for="id_hub_erd_mm">ERD (mm)</label><input class="hub-geom-input" type="number" name="hub_erd_mm" id="id_hub_erd_mm" step="any" min="200" max="700" /></div>
        <div class="field"><label for="id_hub_crosses">Crosses</label><input class="hub-geom-input" type="number" name="hub_crosses" id="id_hub_crosses" min="0" max="20" step="1" /></div>
        <div class="field"><label for="id_hub_left_flange_pcd_mm">Left flange PCD (mm)</label><input class="hub-geom-input" type="number" name="hub_left_flange_pcd_mm" id="id_hub_left_flange_pcd_mm" step="any" min="20" max="200" /></div>
        <div class="field"><label for="id_hub_right_flange_pcd_mm">Right flange PCD (mm)</label><input class="hub-geom-input" type="number" name="hub_right_flange_pcd_mm" id="id_hub_right_flange_pcd_mm" step="any" min="20" max="200" /></div>
        <div class="field"><label for="id_hub_left_offset_mm">Left flange offset (mm)</label><input class="hub-geom-input" type="number" name="hub_left_offset_mm" id="id_hub_left_offset_mm" step="any" min="0" max="120" /></div>
        <div class="field"><label for="id_hub_right_offset_mm">Right flange offset (mm)</label><input class="hub-geom-input" type="number" name="hub_right_offset_mm" id="id_hub_right_offset_mm" step="any" min="0" max="120" /></div>
        <div class="field"><label for="id_hub_flange_hole_diameter_mm">Hub spoke hole Ø (mm)</label><input class="hub-geom-input" type="number" name="hub_flange_hole_diameter_mm" id="id_hub_flange_hole_diameter_mm" step="any" min="0" max="10" value="0" /></div>
        <div class="field"><label for="id_hub_nipple_correction_mm">Nipple correction (mm)</label><input class="hub-geom-input" type="number" name="hub_nipple_correction_mm" id="id_hub_nipple_correction_mm" step="any" value="0" /></div>
      </div>
    </div>
  </details>

  <div class="tension-main-layout">
    <div class="tension-table-panel tension-table-left">
      <h2 class="tension-table-title tension-title-left">Left side spokes</h2>
      <table class="tension-spoke-table">
        <thead><tr><th>#</th><th>TM-1 reading</th><th>Tension (kgf)</th><th>vs ±20% (side avg)</th></tr></thead>
        <tbody id="tension-tbody-left">${buildReadingRows(nHalf, {}, null, "left", {})}</tbody>
      </table>
      <div id="tension-wta-left"></div>
    </div>
    <div class="tension-table-panel tension-table-right">
      <h2 class="tension-table-title tension-title-right">Right side spokes</h2>
      <table class="tension-spoke-table">
        <thead><tr><th>#</th><th>TM-1 reading</th><th>Tension (kgf)</th><th>vs ±20% (side avg)</th></tr></thead>
        <tbody id="tension-tbody-right">${buildReadingRows(nHalf, {}, null, "right", {})}</tbody>
      </table>
      <div id="tension-wta-right"></div>
    </div>
    <div class="tension-chart-panel" id="tension-chart-panel">
      <div class="tension-chart-placeholder wheel-wrap">
        <p class="hint">Submit the form to see the tension radar and rim heatmap.</p>
      </div>
    </div>
  </div>
  <div class="tension-footer-submit">
    <button type="submit" class="btn tension-update-btn">Update</button>
  </div>
</form>
<p class="prose note tm1-attrib">${escapeHtml(chartSourceNote())}</p>
<p class="prose note">TM-1 readings are comparative, not a lab tensiometer. Verify critical builds against Park’s current chart.</p>`;

  const form = container.querySelector("#tension-map-form") as HTMLFormElement;
  const chartPanel = container.querySelector("#tension-chart-panel") as HTMLElement;
  const tbodyLeft = container.querySelector("#tension-tbody-left") as HTMLElement;
  const tbodyRight = container.querySelector("#tension-tbody-right") as HTMLElement;
  const theadCells = container.querySelectorAll(".tension-spoke-table thead tr th");
  const nonFieldEl = container.querySelector("#tension-non-field-errors") as HTMLElement;

  function updateTableHeaders(variancePct: number, ratio: boolean) {
    const label = `vs ±${variancePct.toFixed(0)}% ${ratio ? "(ratio target)" : "(side avg)"}`;
    theadCells.forEach((th, i) => {
      if (i === 3) th.textContent = label;
    });
  }

  function rerenderReadingRows(
    nSpokes: number,
    fieldErrors: Record<string, string>,
    rows: ReturnType<typeof buildTensionSpokeRows> | null,
    inputValues: Record<string, string>,
  ) {
    const nh = nSpokes / 2;
    tbodyLeft.innerHTML = buildReadingRows(
      nh,
      fieldErrors,
      rows,
      "left",
      inputValues,
    );
    tbodyRight.innerHTML = buildReadingRows(
      nh,
      fieldErrors,
      rows,
      "right",
      inputValues,
    );
  }

  function computeFromForm(): void {
    nonFieldEl.style.display = "none";
    nonFieldEl.textContent = "";

    const fd = new FormData(form);
    const nSpokes = parseInt(String(fd.get("spoke_count")), 10);
    const chartId = String(fd.get("tm1_chart") || defaultChart);
    const variancePct = parseFloat(String(fd.get("variance_percent")));
    const refSide = (String(fd.get("tension_ratio_reference")) === "right"
      ? "right"
      : "left") as "left" | "right";
    const otherPct = parseFloat(String(fd.get("tension_ratio_other_pct")));

    const parsed = parseTensionForm(form, nSpokes, chartId);
    if (parsed.nonFieldErrors.length) {
      nonFieldEl.textContent = parsed.nonFieldErrors.join(" ");
      nonFieldEl.style.display = "block";
      rerenderReadingRows(
        nSpokes,
        parsed.fieldErrors,
        null,
        captureTm1InputValues(form, nSpokes),
      );
      chartPanel.innerHTML = `<div class="tension-chart-placeholder wheel-wrap"><p class="hint">Fix errors and submit again.</p></div>`;
      return;
    }
    if (Object.keys(parsed.fieldErrors).length) {
      rerenderReadingRows(
        nSpokes,
        parsed.fieldErrors,
        null,
        captureTm1InputValues(form, nSpokes),
      );
      chartPanel.innerHTML = `<div class="tension-chart-placeholder wheel-wrap"><p class="hint">Fix errors and submit again.</p></div>`;
      return;
    }

    const balanceRatio = usesSideRatio(otherPct);
    updateTableHeaders(variancePct, balanceRatio);

    const rowKw: Parameters<typeof buildTensionSpokeRows>[0] = {
      spokeCount: nSpokes,
      readings: parsed.readings,
      tensionsKgf: parsed.tensionsKgf,
      variancePercent: variancePct,
      balanceMode: balanceRatio ? "ratio" : "per_side",
    };
    if (balanceRatio) {
      rowKw.ratioReferenceSide = refSide;
      rowKw.ratioOtherPct = otherPct;
    }

    let tensionRows: ReturnType<typeof buildTensionSpokeRows>;
    try {
      tensionRows = buildTensionSpokeRows(rowKw);
    } catch (e) {
      nonFieldEl.textContent = e instanceof Error ? e.message : String(e);
      nonFieldEl.style.display = "block";
      return;
    }
    rerenderReadingRows(
      nSpokes,
      {},
      tensionRows,
      readingsToInputValues(parsed.readings),
    );

    const [leftAvg, rightAvg] = sideAverageKgf(parsed.tensionsKgf, nSpokes);
    const leftT = parsed.tensionsKgf.filter((_, i) => i % 2 === 0);
    const rightT = parsed.tensionsKgf.filter((_, i) => i % 2 === 1);
    const leftStats = buildTensionSideStats(leftT, {
      variancePercent: variancePct,
      chartId,
    });
    const rightStats = buildTensionSideStats(rightT, {
      variancePercent: variancePct,
      chartId,
    });

    const wheelSvg = { cx: 120, cy: 120, rimR: 95, hubR: 28 };
    const [lp, rp] = buildTensionRadarPaths(tensionRows, wheelSvg);

    let ratioSummaryHtml = "";
    if (balanceRatio) {
      const rs = buildTensionRatioSummary(leftAvg, rightAvg, {
        referenceSide: refSide,
        otherPct,
      });
      ratioSummaryHtml = `
        <div class="tension-ratio-summary" role="region" aria-label="Side ratio summary">
          <div class="tension-stat-block-title">Side ratio</div>
          <dl class="tension-ratio-dl">
            <div class="tension-ratio-row"><dt>Reference (${rs.referenceSide})</dt><dd>${kgf2(rs.referenceAvgKgf)} kgf</dd></div>
            <div class="tension-ratio-row"><dt>Target ${rs.otherSide} avg</dt><dd><span class="tension-ratio-em">${rs.targetOtherPct.toFixed(0)}%</span> of reference → <span class="tension-ratio-em">${kgf2(rs.targetOtherAvgKgf)} kgf</span></dd></div>
            <div class="tension-ratio-row"><dt>Measured ${rs.otherSide} avg</dt><dd><span class="tension-ratio-em">${kgf2(rs.measuredOtherAvgKgf)} kgf</span> <span class="tension-ratio-pct-note">(${rs.measuredOtherAsPctOfRef.toFixed(1)}% of reference)</span></dd></div>
          </dl>
        </div>`;
    }

    const lo = parseFloat(String(fd.get("hub_left_offset_mm") || ""));
    const ro = parseFloat(String(fd.get("hub_right_offset_mm") || ""));
    let hubSvgBlock = "";
    if (Number.isFinite(lo) && Number.isFinite(ro)) {
      hubSvgBlock = hubSideSvgHtml(buildHubSideViewSvg(lo, ro));
    }

    let illHtml = "";
    const erd = parseFloat(String(fd.get("hub_erd_mm") || ""));
    const lPcd = parseFloat(String(fd.get("hub_left_flange_pcd_mm") || ""));
    const rPcd = parseFloat(String(fd.get("hub_right_flange_pcd_mm") || ""));
    const hx = parseInt(String(fd.get("hub_crosses") || ""), 10);
    const hHole = parseFloat(String(fd.get("hub_flange_hole_diameter_mm") || "0")) || 0;
    const hNip = parseFloat(String(fd.get("hub_nipple_correction_mm") || "0")) || 0;

    if (
      geometryReadyForRatio({
        erdMm: erd,
        leftPcdMm: lPcd,
        rightPcdMm: rPcd,
        crosses: hx,
        leftOffsetMm: lo,
        rightOffsetMm: ro,
      })
    ) {
      try {
        const [ll, lr] = sideMeanSpokeLengthsMm({
          erdMm: erd,
          spokeCount: nSpokes,
          crosses: hx,
          leftFlangeRadiusMm: lPcd / 2,
          rightFlangeRadiusMm: rPcd / 2,
          leftFlangeOffsetMm: lo,
          rightFlangeOffsetMm: ro,
          flangeHoleDiameterMm: hHole,
          nippleCorrectionMm: hNip,
          rotationRad: 0,
        });
        const ill = buildIllustrativeRatioSummary({
          referenceSide: refSide,
          leftAvgKgf: leftAvg,
          rightAvgKgf: rightAvg,
          wLeftMm: lo,
          wRightMm: ro,
          avgLenLeftMm: ll,
          avgLenRightMm: lr,
        });
        illHtml = `
          <div class="tension-illustrative-ratio" role="region" aria-label="Illustrative geometry tension ratio">
            <div class="tension-stat-block-title">Illustrative geometry ratio</div>
            <p class="hint tension-illustrative-hint">From hub offsets and mean spoke lengths (axial balance model). <strong>Not a guarantee</strong> — compare to your measured averages below.</p>
            <dl class="tension-ratio-dl">
              <div class="tension-ratio-row"><dt>Illustrative ${ill.otherSide} vs ${ill.referenceSide} ref</dt><dd><span class="tension-ratio-em">${ill.illustrativeOtherPct.toFixed(1)}%</span></dd></div>
              <div class="tension-ratio-row"><dt>Measured ${ill.otherSide} vs ${ill.referenceSide} ref</dt><dd><span class="tension-ratio-em">${ill.measuredOtherAsPctOfRef.toFixed(1)}%</span></dd></div>
            </dl>
          </div>`;
      } catch {
        /* */
      }
    }

    const spokeLines = tensionRows
      .map(
        (row) =>
          `<line x1="${row.x1.toFixed(2)}" y1="${row.y1.toFixed(2)}" x2="${row.x2.toFixed(2)}" y2="${row.y2.toFixed(2)}" stroke="${row.color}" stroke-width="2.2" stroke-linecap="round" class="tension-spoke ${row.bandClass}" />`,
      )
      .join("");

    const markers = tensionRows
      .filter((row) => row.adjustAction)
      .map(
        (row) =>
          `<g class="tension-rim-callout">
            <circle cx="${row.x1.toFixed(2)}" cy="${row.y1.toFixed(2)}" r="5.5" class="tension-rim-marker ${row.adjustShort === "T" ? "tension-rim-marker-tighten" : "tension-rim-marker-loosen"}" />
            <text x="${row.badgeTx.toFixed(2)}" y="${row.badgeTy.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" class="tension-rim-callout-label">#${row.index} ${row.adjustShort}</text>
          </g>`,
      )
      .join("");

    chartPanel.innerHTML = `
      <div class="tension-side-averages" role="region" aria-label="Same-side average tension">
        <div class="tension-stat-block-title">Same-side average tension</div>
        <div class="tension-stat-dual">
          <div class="tension-stat-dual-item tension-stat-dual-left">
            <span class="tension-stat-side">Left</span><span class="tension-stat-num">${kgf2(leftAvg)}</span><span class="tension-stat-unit">kgf</span>
          </div>
          <div class="tension-stat-dual-divider" aria-hidden="true"></div>
          <div class="tension-stat-dual-item tension-stat-dual-right">
            <span class="tension-stat-side">Right</span><span class="tension-stat-num">${kgf2(rightAvg)}</span><span class="tension-stat-unit">kgf</span>
          </div>
        </div>
      </div>
      ${ratioSummaryHtml}
      ${hubSvgBlock}
      ${illHtml}
      <div class="wheel-wrap tension-radar-wrap">
        <div class="tension-stat-block-title">Tension radar</div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="Tension radar">
          <circle cx="${wheelSvg.cx}" cy="${wheelSvg.cy}" r="${wheelSvg.hubR}" class="wheel-hub"/>
          <circle cx="${wheelSvg.cx}" cy="${wheelSvg.cy}" r="${wheelSvg.rimR}" class="wheel-rim"/>
          ${lp ? `<path d="${lp}" fill="rgba(45,90,180,0.12)" stroke="#2d5ab4" stroke-width="1.4" class="tension-radar-left"/>` : ""}
          ${rp ? `<path d="${rp}" fill="rgba(200,110,40,0.1)" stroke="#c86e28" stroke-width="1.4" class="tension-radar-right"/>` : ""}
          ${spokeLines}
          ${markers}
        </svg>
        <ul class="tension-radar-legend">
          <li><span class="tension-legend-dot" style="background:#2d5ab4;"></span> Left</li>
          <li><span class="tension-legend-dot" style="background:#c86e28;"></span> Right</li>
          <li><span class="tension-legend-dot tension-legend-dot-rim"></span> Out of band: <strong>T</strong> tighten · <strong>L</strong> loosen</li>
        </ul>
      </div>
      <ul class="detail-legend tension-legend">
        <li><span class="legend-line" style="border-color: #1b6b5c;"></span> Spoke ≤5% from side average</li>
        <li><span class="legend-line" style="border-color: #b89a14;"></span> 5–10%</li>
        <li><span class="legend-line" style="border-color: #c4802c;"></span> 10–15%</li>
        <li><span class="legend-line" style="border-color: #9c2f2f;"></span> &gt;15%</li>
      </ul>`;

    const wtaL = container.querySelector("#tension-wta-left") as HTMLElement;
    const wtaR = container.querySelector("#tension-wta-right") as HTMLElement;
    wtaL.innerHTML = wtaStatsHtml("Left side spokes", leftStats, variancePct);
    wtaR.innerHTML = wtaStatsHtml("Right side spokes", rightStats, variancePct);
  }

  const { restored } = attachFormPersist(form, FORM_TENSION_KEY, { restore: true });

  const scSel = form.querySelector("#id_spoke_count") as HTMLSelectElement;
  scSel.addEventListener("change", () => {
    const v = parseInt(scSel.value, 10);
    if (Number.isFinite(v)) {
      rerenderReadingRows(v, {}, null, {});
      chartPanel.innerHTML = `<div class="tension-chart-placeholder wheel-wrap"><p class="hint">Submit the form to see the tension radar and rim heatmap.</p></div>`;
      (container.querySelector("#tension-wta-left") as HTMLElement).innerHTML = "";
      (container.querySelector("#tension-wta-right") as HTMLElement).innerHTML = "";
      updateTableHeaders(20, false);
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    computeFromForm();
  });

  const notice = container.querySelector("#tension-build-params-notice") as HTMLElement;
  const applyBp = container.querySelector("#tension-build-params-apply");
  const clearBp = container.querySelector("#tension-build-params-clear");
  const hubDetails = container.querySelector("#tension-hub-geom-details") as HTMLDetailsElement;

  applyBp?.addEventListener("click", () => {
    if (applyBuildParamsToTensionForm()) {
      notice.hidden = false;
      hubDetails.open = true;
    }
  });
  clearBp?.addEventListener("click", () => {
    clearBuildParams();
    notice.hidden = true;
  });

  if (!restored && loadBuildParams()) {
    if (applyBuildParamsToTensionForm()) {
      notice.hidden = false;
    }
  }

  if (restored && form.checkValidity()) {
    computeFromForm();
  }
}
