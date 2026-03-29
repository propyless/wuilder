import type { Side } from "./spokeLength";

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

/**
 * Equilibrium “other side vs reference” tension % from axial balance with
 * stiffness ∝ 1/spoke length: T_left·(w_left/L̄_left) ≈ T_right·(w_right/L̄_right).
 * **w_* must match spoke geometry:** each is the center-plane → flange offset (mm),
 * same as `flangeOffsetMm` in {@link ./spokeLength.spokeLengthMm}. Swapped L/R
 * offsets or using end-cap distances without converting explode the ratio (~120–140%
 * instead of ~84% on a typical rear).
 */
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
