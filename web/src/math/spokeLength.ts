export type Side = "left" | "right";

export function lacingAngleRad(crosses: number, totalSpokes: number): number {
  if (totalSpokes <= 0) throw new Error("total_spokes must be positive");
  if (totalSpokes % 2) throw new Error("total_spokes must be even");
  return (2 * Math.PI * crosses) / (totalSpokes / 2);
}

export function spokeLengthMm(
  erdMm: number,
  flangeRadiusMm: number,
  flangeOffsetMm: number,
  crosses: number,
  totalSpokes: number,
): number {
  const R = erdMm / 2;
  const r = flangeRadiusMm;
  const w = flangeOffsetMm;
  const alpha = lacingAngleRad(crosses, totalSpokes);
  let under = R * R + r * r + w * w - 2 * R * r * Math.cos(alpha);
  if (under < 0) under = 0;
  return Math.sqrt(under);
}

export interface SpokeResult {
  index: number;
  side: Side;
  lengthMm: number;
  rimAngleRad: number;
  hubAngleRad: number;
}

export interface FlangeOffsetsFromHubWidth {
  halfWidthMm: number;
  leftFlangeOffsetMm: number;
  rightFlangeOffsetMm: number;
  flangeToFlangeMm: number;
}

export function flangeOffsetsFromHubOverallWidth(
  overallWidthMm: number,
  leftOuterToLeftFlangeMm: number,
  rightOuterToRightFlangeMm: number,
): FlangeOffsetsFromHubWidth {
  if (overallWidthMm <= 0) throw new Error("overall_width_mm must be positive");
  const h = overallWidthMm / 2;
  const x = leftOuterToLeftFlangeMm;
  const y = rightOuterToRightFlangeMm;
  if (x < 0 || y < 0) throw new Error("x and y must be non-negative");
  const L = h - x;
  const R = h - y;
  if (L < 0 || R < 0) {
    throw new Error(
      "x and y cannot exceed half the hub width (negative L or R)",
    );
  }
  return {
    halfWidthMm: h,
    leftFlangeOffsetMm: L,
    rightFlangeOffsetMm: R,
    flangeToFlangeMm: L + R,
  };
}

export function maxCrosses(totalSpokes: number): number {
  if (totalSpokes < 4) return 0;
  return Math.max(0, Math.floor((totalSpokes - 1) / 4));
}

export function buildSpokeResults(params: {
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
}): SpokeResult[] {
  const {
    erdMm,
    spokeCount: n,
    crosses,
    leftFlangeRadiusMm,
    rightFlangeRadiusMm,
    leftFlangeOffsetMm,
    rightFlangeOffsetMm,
    flangeHoleDiameterMm = 0,
    nippleCorrectionMm = 0,
    rotationRad = 0,
  } = params;
  const alpha = lacingAngleRad(crosses, n);
  const out: SpokeResult[] = [];
  for (let i = 0; i < n; i++) {
    const side: Side = i % 2 === 0 ? "left" : "right";
    const rFl = side === "left" ? leftFlangeRadiusMm : rightFlangeRadiusMm;
    const wFl = side === "left" ? leftFlangeOffsetMm : rightFlangeOffsetMm;
    const base = (2 * Math.PI * i) / n;
    const phi = base + rotationRad;
    const hubPhi = side === "left" ? phi - alpha : phi + alpha;
    const raw = spokeLengthMm(erdMm, rFl, wFl, crosses, n);
    const length =
      raw - flangeHoleDiameterMm / 2 + nippleCorrectionMm;
    out.push({
      index: i,
      side,
      lengthMm: length,
      rimAngleRad: phi,
      hubAngleRad: hubPhi,
    });
  }
  return out;
}
