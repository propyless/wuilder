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
  let tipPart: string;
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

/** Zoomed nipple / spoke tip -- matches legacy section_detail_svg.html */
export function renderSectionDetailHtml(
  detail: SectionDetail,
  fit: NippleFit,
  seatRef?: {
    wheelSizeLabel: string | null;
    bsdMm: number | null;
    seatFromBeadMm: number | null;
    seatRadiusMm: number | null;
  },
): string {
  const d = detail;
  const topOuterDimY = d.rimOuterY - 22;
  const topInnerDimY = d.rimOuterY - 10;
  const depthDimX = d.innerRightX + 34;
  const tipToInnerWallMm = (d.tipY - d.rimCavityTopY) / d.scale;

  const threadRect =
    d.spokeThreadH > 0
      ? `<rect x="${fmt2(d.spokeX)}" y="${fmt2(d.spokeTopY)}" width="${fmt2(d.spokeW)}" height="${fmt2(d.spokeThreadH)}" fill="url(#spoke-thread-hatch)" stroke="none" />`
      : "";
  const seatRefLine =
    seatRef?.bsdMm != null && seatRef?.seatFromBeadMm != null
      ? `<p class="section-stats">Nipple seat reference (${seatRef.wheelSizeLabel ?? `BSD ${fmt0(seatRef.bsdMm)}`}): <strong>${fmt1(seatRef.seatFromBeadMm)}</strong> mm below bead seat (${fmt0(seatRef.bsdMm)} BSD) &middot; ERD seat radius <strong>${fmt1(seatRef.seatRadiusMm ?? 0)}</strong> mm.</p>`
      : "";

  return `<section class="section-panel prose" aria-label="Spoke tip detail diagram">
  <h2>Spoke tip position</h2>
  <p class="section-stats">${detailStatsLine(fit)}</p>
  ${seatRefLine}
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
          .det-ext { stroke: #2d2d2d; stroke-width: 0.65; }
          .det-dim { stroke: #1f1f1f; stroke-width: 0.9; fill: none; }
          .det-dim-label { fill: #1f1f1f; font-size: 11px; font-family: system-ui, sans-serif; font-weight: 600; }
          .det-label { fill: #5c574e; font-size: 10px; font-family: system-ui, sans-serif; }
          .det-arrow { fill: #1f1f1f; }
        </style>
        <marker id="det-arrow-up" markerWidth="6" markerHeight="6" refX="3" refY="6" orient="auto">
          <path d="M0,6 L3,0 L6,6" class="det-arrow"/>
        </marker>
        <marker id="det-arrow-down" markerWidth="6" markerHeight="6" refX="3" refY="0" orient="auto">
          <path d="M0,0 L3,6 L6,0" class="det-arrow"/>
        </marker>
        <marker id="det-arrow-end" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
          <path d="M0,0 L6,3 L0,6 Z" class="det-arrow"/>
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
      <rect class="det-spoke" x="${fmt2(d.spokeX)}" y="${fmt2(d.spokeTopY)}" width="${fmt2(d.spokeW)}" height="${fmt2(d.spokeH)}" />
      ${threadRect}
      <rect class="det-spoke-tip-cap" x="${fmt2(d.spokeX)}" y="${fmt2(d.spokeTopY)}" width="${fmt2(d.spokeW)}" height="2" />
      <line class="det-ext" x1="${fmt2(d.outerLeftX)}" y1="${fmt2(d.rimOuterY)}" x2="${fmt2(d.outerLeftX)}" y2="${fmt2(topOuterDimY)}" />
      <line class="det-ext" x1="${fmt2(d.outerRightX)}" y1="${fmt2(d.rimOuterY)}" x2="${fmt2(d.outerRightX)}" y2="${fmt2(topOuterDimY)}" />
      <line class="det-dim" x1="${fmt2(d.outerLeftX)}" y1="${fmt2(topOuterDimY)}" x2="${fmt2(d.outerRightX)}" y2="${fmt2(topOuterDimY)}" marker-start="url(#det-arrow-end)" marker-end="url(#det-arrow-end)" />
      <text class="det-dim-label" text-anchor="middle" x="${fmt2(d.cx)}" y="${fmt2(topOuterDimY)}" dy="-4">${fmt1(d.outerWidthMm)} mm</text>
      <line class="det-ext" x1="${fmt2(d.innerLeftX)}" y1="${fmt2(d.rimOuterY)}" x2="${fmt2(d.innerLeftX)}" y2="${fmt2(topInnerDimY)}" />
      <line class="det-ext" x1="${fmt2(d.innerRightX)}" y1="${fmt2(d.rimOuterY)}" x2="${fmt2(d.innerRightX)}" y2="${fmt2(topInnerDimY)}" />
      <line class="det-dim" x1="${fmt2(d.innerLeftX)}" y1="${fmt2(topInnerDimY)}" x2="${fmt2(d.innerRightX)}" y2="${fmt2(topInnerDimY)}" marker-start="url(#det-arrow-end)" marker-end="url(#det-arrow-end)" />
      <text class="det-dim-label" text-anchor="middle" x="${fmt2(d.cx)}" y="${fmt2(topInnerDimY)}" dy="-4">${fmt1(d.innerWidthMm)} mm</text>
      <line class="det-ext" x1="${fmt2(d.outerRightX)}" y1="${fmt2(d.rimOuterY)}" x2="${fmt2(depthDimX)}" y2="${fmt2(d.rimOuterY)}" />
      <line class="det-ext" x1="${fmt2(d.cx)}" y1="${fmt2(d.rimBottomY)}" x2="${fmt2(depthDimX)}" y2="${fmt2(d.rimBottomY)}" />
      <line class="det-dim" x1="${fmt2(depthDimX)}" y1="${fmt2(d.rimOuterY)}" x2="${fmt2(depthDimX)}" y2="${fmt2(d.rimBottomY)}" marker-start="url(#det-arrow-up)" marker-end="url(#det-arrow-down)" />
      <text class="det-dim-label" text-anchor="middle" x="${fmt2(depthDimX)}" y="${fmt2((d.rimOuterY + d.rimBottomY) / 2)}" transform="rotate(90 ${fmt2(depthDimX)} ${fmt2((d.rimOuterY + d.rimBottomY) / 2)})">${fmt1(d.rimDepthMm)} mm</text>
      <line class="det-ext" x1="${fmt2(d.cx)}" y1="${fmt2(d.tipY)}" x2="${fmt2(d.dimRimX)}" y2="${fmt2(d.tipY)}" />
      <line class="det-ext" x1="${fmt2(d.innerLeftX)}" y1="${fmt2(d.rimCavityTopY)}" x2="${fmt2(d.dimRimX)}" y2="${fmt2(d.rimCavityTopY)}" />
      <line class="det-dim" x1="${fmt2(d.dimRimX)}" y1="${fmt2(d.rimCavityTopY)}" x2="${fmt2(d.dimRimX)}" y2="${fmt2(d.tipY)}" marker-start="url(#det-arrow-up)" marker-end="url(#det-arrow-down)" />
      <text class="det-dim-label" text-anchor="end" x="${fmt2(d.dimRimX)}" dx="-6" y="${fmt2(d.rimCavityTopY)}" dy="${fmt2((d.tipY - d.rimCavityTopY) / 2)}">${fmt1(tipToInnerWallMm)} mm</text>
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
