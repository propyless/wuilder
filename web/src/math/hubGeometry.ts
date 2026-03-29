import { buildSpokeResults, type Side } from "./spokeLength";

export interface HubSideViewSvg {
  vbW: number;
  vbH: number;
  axleY: number;
  centerX: number;
  leftFlangeX: number;
  rightFlangeX: number;
  leftOffsetMm: number;
  rightOffsetMm: number;
  centerLineY1: number;
  centerLineY2: number;
  flangeTickY1: number;
  flangeTickY2: number;
  labelY: number;
}

export function buildHubSideViewSvg(
  leftOffsetMm: number,
  rightOffsetMm: number,
  options?: {
    vbW?: number;
    vbH?: number;
    marginX?: number;
    axleY?: number;
  },
): HubSideViewSvg {
  const vbW = options?.vbW ?? 280;
  const vbH = options?.vbH ?? 120;
  const marginX = options?.marginX ?? 28;
  const axleY = options?.axleY ?? 62;
  const lo = Math.max(0, leftOffsetMm);
  const ro = Math.max(0, rightOffsetMm);
  const maxW = Math.max(lo, ro, 5);
  const inner = vbW - 2 * marginX;
  const scale = Math.min(inner / (2 * maxW), 3.2);
  const centerX = vbW / 2;
  const leftFlangeX = centerX - scale * lo;
  const rightFlangeX = centerX + scale * ro;
  const tickHalf = 20;
  const marginV = 14;
  return {
    vbW,
    vbH,
    axleY,
    centerX,
    leftFlangeX,
    rightFlangeX,
    leftOffsetMm: lo,
    rightOffsetMm: ro,
    centerLineY1: marginV,
    centerLineY2: vbH - marginV,
    flangeTickY1: axleY - tickHalf,
    flangeTickY2: axleY + tickHalf,
    labelY: vbH - 18,
  };
}

export function geometryReadyForRatio(params: {
  erdMm: number | null | undefined;
  leftPcdMm: number | null | undefined;
  rightPcdMm: number | null | undefined;
  crosses: number | null | undefined;
  leftOffsetMm: number | null | undefined;
  rightOffsetMm: number | null | undefined;
}): boolean {
  const {
    erdMm,
    leftPcdMm,
    rightPcdMm,
    crosses,
    leftOffsetMm,
    rightOffsetMm,
  } = params;
  if (
    erdMm == null ||
    leftPcdMm == null ||
    rightPcdMm == null ||
    crosses == null ||
    leftOffsetMm == null ||
    rightOffsetMm == null
  ) {
    return false;
  }
  if (erdMm <= 0 || leftPcdMm <= 0 || rightPcdMm <= 0) return false;
  if (!Number.isFinite(crosses) || crosses < 0) return false;
  return true;
}

export function illustrativeOtherAsPctOfReference(params: {
  referenceSide: Side;
  wLeftMm: number;
  wRightMm: number;
  avgLenLeftMm: number;
  avgLenRightMm: number;
}): number {
  const eps = 1e-9;
  const wl = Math.max(params.wLeftMm, eps);
  const wr = Math.max(params.wRightMm, eps);
  const ll = Math.max(params.avgLenLeftMm, eps);
  const lr = Math.max(params.avgLenRightMm, eps);
  if (params.referenceSide === "left") {
    return (100 * (wl * lr)) / (wr * ll);
  }
  return (100 * (wr * ll)) / (wl * lr);
}

export function sideMeanSpokeLengthsMm(params: {
  erdMm: number;
  spokeCount: number;
  crosses: number;
  leftFlangeRadiusMm: number;
  rightFlangeRadiusMm: number;
  leftFlangeOffsetMm: number;
  rightFlangeOffsetMm: number;
  flangeHoleDiameterMm?: number;
  nippleCorrectionMm?: number;
  rotationRad?: number;
}): [number, number] {
  const spokes = buildSpokeResults(params);
  const left = spokes.filter((s) => s.side === "left").map((s) => s.lengthMm);
  const right = spokes.filter((s) => s.side === "right").map((s) => s.lengthMm);
  if (!left.length || !right.length) {
    throw new Error("expected both sides populated");
  }
  const avgL = left.reduce((a, b) => a + b, 0) / left.length;
  const avgR = right.reduce((a, b) => a + b, 0) / right.length;
  return [avgL, avgR];
}

export interface IllustrativeRatioSummary {
  referenceSide: Side;
  otherSide: Side;
  illustrativeOtherPct: number;
  measuredOtherAsPctOfRef: number;
}

export function buildIllustrativeRatioSummary(params: {
  referenceSide: Side;
  leftAvgKgf: number;
  rightAvgKgf: number;
  wLeftMm: number;
  wRightMm: number;
  avgLenLeftMm: number;
  avgLenRightMm: number;
}): IllustrativeRatioSummary {
  const ill = illustrativeOtherAsPctOfReference({
    referenceSide: params.referenceSide,
    wLeftMm: params.wLeftMm,
    wRightMm: params.wRightMm,
    avgLenLeftMm: params.avgLenLeftMm,
    avgLenRightMm: params.avgLenRightMm,
  });
  if (params.referenceSide === "left") {
    const mPct =
      params.leftAvgKgf > 0
        ? (100 * params.rightAvgKgf) / params.leftAvgKgf
        : 0;
    return {
      referenceSide: "left",
      otherSide: "right",
      illustrativeOtherPct: ill,
      measuredOtherAsPctOfRef: mPct,
    };
  }
  const mPct =
    params.rightAvgKgf > 0
      ? (100 * params.leftAvgKgf) / params.rightAvgKgf
      : 0;
  return {
    referenceSide: "right",
    otherSide: "left",
    illustrativeOtherPct: ill,
    measuredOtherAsPctOfRef: mPct,
  };
}
