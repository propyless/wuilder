import type { NippleFit } from "./nippleFit";
import type { SectionDetail } from "./layout";

function fmt1(n: number): string {
  return n.toFixed(1);
}

function fmt2(n: number): string {
  return n.toFixed(2);
}

function fmt0(n: number): string {
  return String(Math.round(n));
}

function detailStatsLine(fit: NippleFit): string {
  let tipPart = "";
  if (fit.tipFromSeatMm > 1e-6) {
    tipPart = ` &middot; <strong>${fmt1(fit.tipFromSeatMm)}</strong> mm inside nipple`;
  } else if (Math.abs(fit.tipFromSeatMm) <= 1e-6) {
    tipPart = " &middot; tip at seat";
  } else {
    tipPart = ` &middot; <strong class="warn">${fmt1(fit.tipFromSeatMm)}</strong> mm into cavity`;
  }
  const rimCls = fit.tipToRimOuterMm < 0 ? ' class="warn"' : "";
  return `Thread engagement: <strong>${fmt1(fit.threadEngagementMm)}</strong> mm${tipPart} &middot; <strong${rimCls}>${fmt1(fit.tipToRimOuterMm)}</strong> mm from rim edge`;
}

function tipSeatLabel(fit: NippleFit, detail: SectionDetail): string {
  const t = fit.tipFromSeatMm;
  if (t > 1e-6) {
    return `<text class="det-dim-label" text-anchor="start" x="${fmt2(detail.dimSeatX)}" dx="6" y="${fmt2(detail.seatY)}" dy="${fmt2(detail.seatMidDy)}">${fmt1(fit.tipFromSeatMm)} mm inside</text>`;
  }
  if (t < -1e-6) {
    return `<text class="det-dim-label" text-anchor="start" x="${fmt2(detail.dimSeatX)}" dx="6" y="${fmt2(detail.tipY)}" dy="${fmt2(detail.seatMidDy)}">${fmt1(fit.tipFromSeatMm)} mm into cavity</text>`;
  }
  return `<text class="det-dim-label" text-anchor="start" x="${fmt2(detail.dimSeatX)}" dx="6" y="${fmt2(detail.seatY)}" dy="-4">at seat</text>`;
}

/** Zoomed nipple / spoke tip -- matches legacy section_detail_svg.html */
export function renderSectionDetailHtml(detail: SectionDetail, fit: NippleFit): string {
  const d = detail;

  const innerWallRef = d.hasInnerWallDepth
    ? `<line class="det-ref" x1="20" y1="${fmt2(d.rimCavityTopY)}" x2="${fmt0(d.viewW)}" y2="${fmt2(d.rimCavityTopY)}" />`
    : "";

  const innerWallLabel = d.hasInnerWallDepth
    ? `<text class="det-label" x="4" y="${fmt2(d.rimCavityTopY)}" dy="-3">Inner wall</text>
        <text class="det-label" x="4" y="${fmt2(d.seatY)}" dy="-3">Nipple seat</text>`
    : `<text class="det-label" x="4" y="${fmt2(d.seatY)}" dy="-3">Inner wall / seat</text>`;

  const threadRect =
    d.spokeThreadH > 0
      ? `<rect x="${fmt2(d.spokeX)}" y="${fmt2(d.spokeTopY)}" width="${fmt2(d.spokeW)}" height="${fmt2(d.spokeThreadH)}" fill="url(#spoke-thread-hatch)" stroke="none" />`
      : "";

  return `<section class="section-panel prose" aria-label="Spoke tip detail diagram">
  <h2>Spoke tip position</h2>
  <p class="section-stats">${detailStatsLine(fit)}</p>
  <div class="section-svg-wrap">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt0(d.viewW)} ${fmt0(d.viewH)}" role="img" aria-label="Zoomed cross-section: rim cavity, nipple, spoke tip position">
      <defs>
        <style>
          .det-rim { fill: #c8c3b8; stroke: none; }
          .det-rim-border { fill: none; stroke: #3d3931; stroke-width: 1.5; }
          .det-rim-top-cutout { fill: #f5f3ef; stroke: none; }
          .det-rim-top-cutout-border { fill: none; stroke: #3d3931; stroke-width: 1.5; }
          .det-rim-cavity { fill: #f5f3ef; stroke: #9e9889; stroke-width: 0.8; }
          .det-nipple-head { fill: #b87333; stroke: #4a2c0a; stroke-width: 1; }
          .det-nipple-shank { fill: #c9a06b; stroke: #4a2c0a; stroke-width: 1; }
          .det-thread-zone { fill: #8fa87a; fill-opacity: 0.45; stroke: #4a6630; stroke-width: 0.8; stroke-dasharray: 3 2; }
          .det-spoke { fill: #7a7a7a; stroke: #4a4a4a; stroke-width: 0.6; }
          .det-spoke-tip-cap { fill: #c44040; }
          .det-ref { stroke: #b0a899; stroke-width: 0.7; stroke-dasharray: 2 3; }
          .det-dim { stroke: #8a3535; stroke-width: 0.9; fill: none; }
          .det-dim-label { fill: #8a3535; font-size: 11px; font-family: system-ui, sans-serif; font-weight: 600; }
          .det-label { fill: #5c574e; font-size: 10px; font-family: system-ui, sans-serif; }
          .det-arrow { fill: #8a3535; }
        </style>
        <marker id="det-arrow-up" markerWidth="6" markerHeight="6" refX="3" refY="6" orient="auto">
          <path d="M0,6 L3,0 L6,6" class="det-arrow"/>
        </marker>
        <marker id="det-arrow-down" markerWidth="6" markerHeight="6" refX="3" refY="0" orient="auto">
          <path d="M0,0 L3,6 L6,0" class="det-arrow"/>
        </marker>
        <pattern id="spoke-thread-hatch" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="2.4" stroke="#3a3a3a" stroke-width="0.5"/>
        </pattern>
      </defs>
      <path class="det-rim" d="${d.rimPath}" />
      <path class="det-rim-border" d="${d.rimOuterBorderPath}" />
      <path class="det-rim-top-cutout" d="${d.rimTopCutoutPath}" />
      <path class="det-rim-top-cutout-border" d="${d.rimTopCutoutBorderPath}" />
      <path class="det-rim-cavity" d="${d.rimCavityPath}" />
      <path class="det-nipple-head" d="${d.nippleHeadPath}" />
      <path class="det-nipple-shank" d="${d.nippleBodyPath}" />
      <path class="det-thread-zone" d="${d.nippleThreadZonePath}" />
      ${innerWallRef}
      <line class="det-ref" x1="20" y1="${fmt2(d.seatY)}" x2="${fmt0(d.viewW)}" y2="${fmt2(d.seatY)}" />
      <line class="det-ref" x1="20" y1="${fmt2(d.barrelEndY)}" x2="${fmt0(d.viewW)}" y2="${fmt2(d.barrelEndY)}" />
      ${innerWallLabel}
      <text class="det-label" x="4" y="${fmt2(d.barrelEndY)}" dy="12">Barrel end</text>
      <rect class="det-spoke" x="${fmt2(d.spokeX)}" y="${fmt2(d.spokeTopY)}" width="${fmt2(d.spokeW)}" height="${fmt2(d.spokeH)}" />
      ${threadRect}
      <rect class="det-spoke-tip-cap" x="${fmt2(d.spokeX)}" y="${fmt2(d.spokeTopY)}" width="${fmt2(d.spokeW)}" height="2" />
      <text class="det-dim-label" x="${fmt2(d.cx)}" y="${fmt2(d.spokeTopY)}" dx="${fmt2(d.spokeW)}" dy="-4">spoke tip</text>
      <line class="det-dim" x1="${fmt2(d.dimSeatX)}" y1="${fmt2(d.tipY)}" x2="${fmt2(d.dimSeatX)}" y2="${fmt2(d.seatY)}" marker-start="url(#det-arrow-up)" marker-end="url(#det-arrow-down)" />
      ${tipSeatLabel(fit, d)}
      <line class="det-dim" x1="${fmt2(d.dimRimX)}" y1="${fmt2(d.tipY)}" x2="${fmt2(d.dimRimX)}" y2="${fmt2(d.rimOuterY)}" marker-start="url(#det-arrow-down)" marker-end="url(#det-arrow-up)" />
      <text class="det-dim-label" text-anchor="end" x="${fmt2(d.dimRimX)}" dx="-6" y="${fmt2(d.rimOuterY)}" dy="${fmt2(d.rimMidDy)}">${fmt1(fit.tipToRimOuterMm)} mm</text>
    </svg>
  </div>
  <ul class="detail-legend">
    <li><span class="legend-swatch" style="background: #c8c3b8; border-color: #3d3931;"></span> Rim wall</li>
    <li><span class="legend-swatch" style="background: #f5f3ef; border-color: #9e9889;"></span> Rim cavity</li>
    <li><span class="legend-swatch" style="background: #b87333; border-color: #4a2c0a;"></span> Nipple head</li>
    <li><span class="legend-swatch" style="background: #c9a06b; border-color: #4a2c0a;"></span> Nipple body</li>
    <li><span class="legend-swatch legend-dashed" style="background: rgba(143,168,122,0.45); border-color: #4a6630;"></span> Threaded bore</li>
    <li><span class="legend-swatch" style="background: #7a7a7a; border-color: #4a4a4a; width: 6px;"></span> Spoke wire</li>
    <li><span class="legend-swatch" style="background: repeating-linear-gradient(35deg, #7a7a7a 0px, #7a7a7a 1px, #3a3a3a 1px, #3a3a3a 1.5px); border-color: #4a4a4a; width: 6px;"></span> Spoke thread</li>
    <li><span class="legend-swatch" style="background: #c44040; border-color: #c44040; width: 6px; height: 4px;"></span> Spoke tip</li>
    <li><span class="legend-line" style="border-color: #8a3535;"></span> Dimension</li>
    <li><span class="legend-line" style="border-color: #b0a899; border-style: dashed;"></span> Reference line</li>
  </ul>
  <p class="prose note">Schematic &mdash; assumes spoke at ordering length, no stretch. Distances are geometric along the nipple axis.</p>
</section>`;
}
