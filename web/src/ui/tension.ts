import { buildHubSideViewSvg } from "../math/hubGeometry";
import {
  applyBuildParamsToTensionForm,
  clearBuildParams,
  loadBuildParams,
} from "../storage/buildParams";
import { confirmAndClearWheelData } from "../storage/clearWheelSession";
import { attachFormPersist } from "../storage/formPersist";
import { FORM_TENSION_KEY } from "../storage/keys";
import {
  buildReadingRows,
  chartOptions,
  hubSideSvgHtml,
  wtaStatsHtml,
} from "../tension/html";
import {
  captureTm1InputValues,
  parseTensionForm,
  readingsToInputValues,
  resolveInitialSpokeCount,
} from "../tension/form";
import {
  buildTensionRadarPaths,
  buildTensionRatioSummary,
  buildTensionSideStats,
  buildTensionSpokeRows,
  sideAverageKgf,
  usesSideRatio,
} from "../tension/viz";
import { chartSourceNote } from "../tm1/lookup";
import { kgf2 } from "../format/kgf";
import { debounce } from "../util/debounce";
import { escapeHtml } from "../util/escape";
import { spokeOptions } from "./spokeOptions";

export function renderTension(container: HTMLElement): void {
  const n = resolveInitialSpokeCount();
  const nHalf = n / 2;
  const defaultChart = "steel_round_2.0";

  container.innerHTML = `
<div class="prose">
  <h1>Wheel tension balancing</h1>
  <p class="lede">Enter a <strong>TM-1</strong> reading per spoke (left / right columns match the Spokes wheel map). We convert to kgf. The chart updates as you type once every cell has a reading (same idea as live spoke lengths on the Spokes page). Set <strong>other side as % of reference</strong> to <strong>100%</strong> for Park style (each side vs its own average), or another value for a <strong>side ratio</strong> (e.g. 84% for non-drive vs drive). The variance limit is ±% from that reference. Spokes outside the band show <strong>↑</strong> / <strong>↓</strong> next to tension and <strong>T</strong> / <strong>L</strong> on the wheel map. Use <strong>Update</strong> at the bottom to re-check validation and show field errors. The form is saved in your browser and restored after a refresh (including spoke count).</p>
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
      <p class="hint field-span">Offsets = from <strong>hub center plane</strong> (mid O.L.D.) to each flange — same as on the Spokes page (not raw <em>x</em>/<em>y</em> from hub ends unless converted).</p>
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
        <p class="hint">Enter every TM-1 reading for a live map, or use <strong>Update</strong> at the bottom to check the form.</p>
      </div>
    </div>
  </div>
  <div class="tension-footer-submit">
    <div class="tension-footer-actions">
      <button type="button" class="btn btn--clear tension-clear-btn btn-clear-session">Clear</button>
      <button type="submit" class="btn tension-update-btn">Update</button>
    </div>
  </div>
</form>
<p class="prose note tm1-attrib">${escapeHtml(chartSourceNote())}</p>
<p class="prose note">TM-1 readings are comparative, not a lab tensiometer. Verify critical builds against Park’s current chart.</p>`;

  container.querySelectorAll(".btn-clear-session").forEach((btn) => {
    btn.addEventListener("click", () => confirmAndClearWheelData());
  });

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

  const tensionValidationFromSubmit = { current: false };

  function runTensionFormUpdate(mode: "auto" | "submit"): void {
    if (mode === "submit") {
      tensionValidationFromSubmit.current = true;
    }

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

    if (Number.isFinite(variancePct)) {
      updateTableHeaders(variancePct, usesSideRatio(otherPct));
    }

    const parsed = parseTensionForm(form, nSpokes, chartId);
    if (parsed.nonFieldErrors.length) {
      nonFieldEl.textContent = parsed.nonFieldErrors.join(" ");
      nonFieldEl.style.display = "block";
      if (tensionValidationFromSubmit.current) {
        rerenderReadingRows(
          nSpokes,
          parsed.fieldErrors,
          null,
          captureTm1InputValues(form, nSpokes),
        );
      }
      chartPanel.innerHTML = `<div class="tension-chart-placeholder wheel-wrap"><p class="hint">Fix hub geometry (crosses vs spoke count) and use <strong>Update</strong>.</p></div>`;
      (container.querySelector("#tension-wta-left") as HTMLElement).innerHTML =
        "";
      (container.querySelector("#tension-wta-right") as HTMLElement).innerHTML =
        "";
      return;
    }
    if (Object.keys(parsed.fieldErrors).length) {
      if (!tensionValidationFromSubmit.current) {
        nonFieldEl.style.display = "none";
        chartPanel.innerHTML = `<div class="tension-chart-placeholder wheel-wrap"><p class="hint">Enter a TM-1 reading in every cell for a live map (updates as you type).</p></div>`;
        (container.querySelector("#tension-wta-left") as HTMLElement).innerHTML =
          "";
        (container.querySelector("#tension-wta-right") as HTMLElement).innerHTML =
          "";
        return;
      }
      rerenderReadingRows(
        nSpokes,
        parsed.fieldErrors,
        null,
        captureTm1InputValues(form, nSpokes),
      );
      chartPanel.innerHTML = `<div class="tension-chart-placeholder wheel-wrap"><p class="hint">Fix the readings above and use <strong>Update</strong>.</p></div>`;
      return;
    }

    tensionValidationFromSubmit.current = false;

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

  const scheduleTensionRecompute = debounce(
    () => runTensionFormUpdate("auto"),
    320,
  );

  form.addEventListener("change", (e) => {
    const t = e.target as HTMLElement;
    if (t.id === "id_spoke_count") {
      const v = parseInt((t as HTMLSelectElement).value, 10);
      if (Number.isFinite(v)) {
        rerenderReadingRows(v, {}, null, {});
      }
    }
    scheduleTensionRecompute();
  });

  form.addEventListener("input", () => {
    scheduleTensionRecompute();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    runTensionFormUpdate("submit");
  });

  const notice = container.querySelector("#tension-build-params-notice") as HTMLElement;
  const applyBp = container.querySelector("#tension-build-params-apply");
  const clearBp = container.querySelector("#tension-build-params-clear");
  const hubDetails = container.querySelector("#tension-hub-geom-details") as HTMLDetailsElement;

  applyBp?.addEventListener("click", () => {
    if (applyBuildParamsToTensionForm()) {
      notice.hidden = false;
      hubDetails.open = true;
      scheduleTensionRecompute();
    }
  });
  clearBp?.addEventListener("click", () => {
    clearBuildParams();
    notice.hidden = true;
  });

  const bp = loadBuildParams();
  if (bp) {
    const filled = restored
      ? applyBuildParamsToTensionForm({ onlyIfEmpty: true, hubGeomOnly: true })
      : applyBuildParamsToTensionForm();
    if (filled) notice.hidden = false;
  }

  if (restored) {
    runTensionFormUpdate("auto");
  }
}
