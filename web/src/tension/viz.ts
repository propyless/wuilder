import { deflectionForKgf, TM1LookupError } from "../tm1/lookup";
import type { Side } from "../math/spokeLength";

const RATIO_PARK_EQUIV_PCT = 100;

/** True when other-side % is not ~100 (Park per-side mode). Matches Python isclose(..., abs_tol=1e-6). */
export function usesSideRatio(otherSidePct: number): boolean {
  const v = Number(otherSidePct);
  return Math.abs(v - RATIO_PARK_EQUIV_PCT) > 1e-6;
}

function sampleStdev(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const m = values.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(
    values.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1),
  );
}

export interface TensionSideStats {
  avgKgf: number;
  stdevKgf: number;
  upperKgf: number;
  lowerKgf: number;
  upperReading: number | null;
  lowerReading: number | null;
}

export function buildTensionSideStats(
  sideTensionsKgf: number[],
  options: { variancePercent: number; chartId: string },
): TensionSideStats {
  if (!sideTensionsKgf.length) {
    throw new Error("side_tensions_kgf must be non-empty");
  }
  const avg =
    sideTensionsKgf.reduce((a, b) => a + b, 0) / sideTensionsKgf.length;
  const st = sampleStdev(sideTensionsKgf);
  const f = options.variancePercent / 100;
  const upper = avg * (1 + f);
  const lower = avg * (1 - f);
  let ur: number | null = null;
  let lr: number | null = null;
  try {
    ur = deflectionForKgf(options.chartId, upper);
  } catch (e) {
    if (!(e instanceof TM1LookupError)) throw e;
  }
  try {
    lr = deflectionForKgf(options.chartId, lower);
  } catch (e) {
    if (!(e instanceof TM1LookupError)) throw e;
  }
  return {
    avgKgf: avg,
    stdevKgf: st,
    upperKgf: upper,
    lowerKgf: lower,
    upperReading: ur,
    lowerReading: lr,
  };
}

const BAND_GOOD = "#1b6b5c";
const BAND_OK = "#b89a14";
const BAND_WARN = "#c4802c";
const BAND_BAD = "#9c2f2f";

export function sideAverageKgf(
  tensionsKgf: number[],
  spokeCount: number,
): [number, number] {
  if (
    tensionsKgf.length !== spokeCount ||
    spokeCount < 2 ||
    spokeCount % 2
  ) {
    throw new Error("tensions_kgf length must match an even spoke_count ≥ 2");
  }
  const left = tensionsKgf.filter((_, i) => i % 2 === 0);
  const right = tensionsKgf.filter((_, i) => i % 2 === 1);
  return [
    left.reduce((a, b) => a + b, 0) / left.length,
    right.reduce((a, b) => a + b, 0) / right.length,
  ];
}

export function adjustmentAction(
  percentFromReference: number,
  withinVariance: boolean,
): [string, string] {
  if (withinVariance) return ["", ""];
  if (percentFromReference < 0) return ["Tighten", "T"];
  if (percentFromReference > 0) return ["Loosen", "L"];
  return ["", ""];
}

export function rimBadgeTextXY(
  cx: number,
  cy: number,
  xRim: number,
  yRim: number,
  offset = 16,
): [number, number] {
  const vx = xRim - cx;
  const vy = yRim - cy;
  const mag = Math.hypot(vx, vy) || 1;
  const ux = vx / mag;
  const uy = vy / mag;
  return [xRim + ux * offset, yRim + uy * offset];
}

export function varianceLimitDetail(
  percentFromReference: number,
  variancePercent: number,
): string {
  const a = Math.abs(percentFromReference);
  const v = variancePercent;
  if (a <= v) {
    const head = v - a;
    return `${head.toFixed(1)}% under ±${v.toFixed(0)}% limit`;
  }
  const over = a - v;
  return `${over.toFixed(1)}% past ±${v.toFixed(0)}% limit`;
}

export function tensionDeviationBand(
  percentFromReference: number,
): [string, string] {
  const a = Math.abs(percentFromReference);
  if (a <= 5) return [BAND_GOOD, "tension-good"];
  if (a <= 10) return [BAND_OK, "tension-ok"];
  if (a <= 15) return [BAND_WARN, "tension-warn"];
  return [BAND_BAD, "tension-bad"];
}

export interface TensionRatioSummary {
  referenceSide: Side;
  otherSide: Side;
  referenceAvgKgf: number;
  targetOtherAvgKgf: number;
  measuredOtherAvgKgf: number;
  measuredOtherAsPctOfRef: number;
  targetOtherPct: number;
}

export function buildTensionRatioSummary(
  leftAvg: number,
  rightAvg: number,
  options: { referenceSide: Side; otherPct: number },
): TensionRatioSummary {
  const f = options.otherPct / 100;
  if (options.referenceSide === "left") {
    const refAvg = leftAvg;
    const measuredOther = rightAvg;
    const targetOther = leftAvg * f;
    const mPct = leftAvg > 0 ? (100 * rightAvg) / leftAvg : 0;
    return {
      referenceSide: "left",
      otherSide: "right",
      referenceAvgKgf: refAvg,
      targetOtherAvgKgf: targetOther,
      measuredOtherAvgKgf: measuredOther,
      measuredOtherAsPctOfRef: mPct,
      targetOtherPct: options.otherPct,
    };
  }
  const refAvg = rightAvg;
  const measuredOther = leftAvg;
  const targetOther = rightAvg * f;
  const mPct = rightAvg > 0 ? (100 * leftAvg) / rightAvg : 0;
  return {
    referenceSide: "right",
    otherSide: "left",
    referenceAvgKgf: refAvg,
    targetOtherAvgKgf: targetOther,
    measuredOtherAvgKgf: measuredOther,
    measuredOtherAsPctOfRef: mPct,
    targetOtherPct: options.otherPct,
  };
}

export interface TensionSpokeRow {
  index: number;
  side: Side;
  reading: number;
  tensionKgf: number;
  referenceKgf: number;
  deltaKgf: number;
  percentFromReference: number;
  withinVariance: boolean;
  varianceLimitDetail: string;
  adjustAction: string;
  adjustShort: string;
  badgeTx: number;
  badgeTy: number;
  color: string;
  bandClass: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function buildTensionSpokeRows(params: {
  spokeCount: number;
  readings: number[];
  tensionsKgf: number[];
  variancePercent?: number;
  balanceMode?: "per_side" | "ratio";
  ratioReferenceSide?: Side | null;
  ratioOtherPct?: number | null;
  cx?: number;
  cy?: number;
  rimR?: number;
  hubR?: number;
  displayTwistRad?: number;
}): TensionSpokeRow[] {
  const {
    spokeCount,
    readings,
    tensionsKgf,
    variancePercent = 20,
    balanceMode = "per_side",
    ratioReferenceSide = null,
    ratioOtherPct = null,
    cx = 120,
    cy = 120,
    rimR = 95,
    hubR = 28,
    displayTwistRad = -Math.PI / 2,
  } = params;

  if (readings.length !== spokeCount || tensionsKgf.length !== spokeCount) {
    throw new Error("readings and tensions_kgf must match spoke_count");
  }

  const [leftAvg, rightAvg] = sideAverageKgf(tensionsKgf, spokeCount);
  if (leftAvg <= 0 || rightAvg <= 0) {
    throw new Error("same-side average tension must be positive");
  }

  let refLeft: number;
  let refRight: number;
  if (balanceMode === "ratio") {
    if (
      (ratioReferenceSide !== "left" && ratioReferenceSide !== "right") ||
      ratioOtherPct == null
    ) {
      throw new Error("ratio mode requires ratio_reference_side and ratio_other_pct");
    }
    const f = ratioOtherPct / 100;
    if (ratioReferenceSide === "left") {
      refLeft = leftAvg;
      refRight = leftAvg * f;
    } else {
      refRight = rightAvg;
      refLeft = rightAvg * f;
    }
  } else if (balanceMode === "per_side") {
    refLeft = leftAvg;
    refRight = rightAvg;
  } else {
    throw new Error(`unknown balance_mode: ${balanceMode}`);
  }

  const rows: TensionSpokeRow[] = [];
  for (let i = 0; i < spokeCount; i++) {
    const side: Side = i % 2 === 0 ? "left" : "right";
    const tKgf = tensionsKgf[i];
    const ref = side === "left" ? refLeft : refRight;
    const delta = tKgf - ref;
    const pct = (100 * delta) / ref;
    const within = Math.abs(pct) <= variancePercent;
    const vDetail = varianceLimitDetail(pct, variancePercent);
    const [adjFull, adjShort] = adjustmentAction(pct, within);
    const [color, band] = tensionDeviationBand(pct);
    const phi = (2 * Math.PI * i) / spokeCount + displayTwistRad;
    const x1 = cx + rimR * Math.cos(phi);
    const y1 = cy + rimR * Math.sin(phi);
    const x2 = cx + hubR * Math.cos(phi);
    const y2 = cy + hubR * Math.sin(phi);
    const [btx, bty] = rimBadgeTextXY(cx, cy, x1, y1);
    rows.push({
      index: i + 1,
      side,
      reading: readings[i],
      tensionKgf: tKgf,
      referenceKgf: ref,
      deltaKgf: delta,
      percentFromReference: pct,
      withinVariance: within,
      varianceLimitDetail: vDetail,
      adjustAction: adjFull,
      adjustShort: adjShort,
      badgeTx: btx,
      badgeTy: bty,
      color,
      bandClass: band,
      x1,
      y1,
      x2,
      y2,
    });
  }
  return rows;
}

export function buildTensionRadarPaths(
  rows: TensionSpokeRow[],
  options?: {
    cx?: number;
    cy?: number;
    rimR?: number;
    hubR?: number;
    displayTwistRad?: number;
  },
): [string, string] {
  const cx = options?.cx ?? 120;
  const cy = options?.cy ?? 120;
  const rimR = options?.rimR ?? 95;
  const hubR = options?.hubR ?? 28;
  const displayTwistRad = options?.displayTwistRad ?? -Math.PI / 2;
  if (!rows.length) return ["", ""];
  const n = rows.length;
  const tPeak = Math.max(...rows.map((r) => r.tensionKgf));
  const tMax = Math.max(tPeak * 1.2, 1);
  const band = rimR - hubR;

  function pts(indices: number[]): [number, number][] {
    return indices.map((i) => {
      const phi = (2 * Math.PI * i) / n + displayTwistRad;
      let t = rows[i].tensionKgf / tMax;
      t = Math.max(0, Math.min(1, t));
      const rr = hubR + t * band;
      return [cx + rr * Math.cos(phi), cy + rr * Math.sin(phi)];
    });
  }

  function path(indices: number[]): string {
    const p = pts(indices);
    if (!p.length) return "";
    const parts = [`M ${p[0][0].toFixed(2)} ${p[0][1].toFixed(2)}`];
    for (let k = 1; k < p.length; k++) {
      parts.push(`L ${p[k][0].toFixed(2)} ${p[k][1].toFixed(2)}`);
    }
    parts.push("Z");
    return parts.join(" ");
  }

  const leftIdx = Array.from({ length: n }, (_, i) => i).filter((i) => i % 2 === 0);
  const rightIdx = Array.from({ length: n }, (_, i) => i).filter((i) => i % 2 === 1);
  return [path(leftIdx), path(rightIdx)];
}
