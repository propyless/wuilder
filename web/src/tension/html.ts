import type { HubSideViewSvg } from "../math/hubGeometry";
import { kgf2 } from "../format/kgf";
import { escapeHtml } from "../util/escape";
import { chartIdsAndLabels } from "../tm1/lookup";
import type { TensionSpokeRow } from "./viz";
import { buildTensionSideStats } from "./viz";

export function chartOptions(selected: string): string {
  return chartIdsAndLabels()
    .map(
      ([id, label]) =>
        `<option value="${id}"${id === selected ? " selected" : ""}>${escapeHtml(label)}</option>`,
    )
    .join("");
}

export function hubSideSvgHtml(h: HubSideViewSvg): string {
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

export function wtaStatsHtml(
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

export function buildReadingRows(
  nHalf: number,
  fieldErrors: Record<string, string>,
  lastRows: TensionSpokeRow[] | null,
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
