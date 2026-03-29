import { describe, expect, it } from "vitest";
import {
  buildSpokeResults,
  flangeOffsetsFromHubOverallWidth,
  lacingAngleRad,
  maxCrosses,
  rimEntryAngleDeg,
  spokeHeadClearanceApproxMm,
  spokeLengthMm,
} from "./spokeLength";

describe("spokeLength", () => {
  it("radial matches pythagoras", () => {
    const R = 300;
    const r = 29;
    const w = 35;
    const n = 32;
    const direct = Math.sqrt((R - r) ** 2 + w * w);
    expect(spokeLengthMm(R * 2, r, w, 0, n)).toBeCloseTo(direct, 6);
  });

  it("lacing angle three cross 32h", () => {
    const deg = (lacingAngleRad(3, 32) * 180) / Math.PI;
    expect(deg).toBeCloseTo(67.5, 5);
  });

  it("lacing angle matches two-step theta", () => {
    for (const [spokes, cross] of [
      [32, 3],
      [36, 3],
      [28, 2],
    ] as const) {
      const nSide = spokes / 2;
      const theta = (2 * Math.PI * cross) / nSide;
      expect(lacingAngleRad(cross, spokes)).toBeCloseTo(theta, 12);
    }
  });

  it("rejects odd total spokes", () => {
    expect(() => lacingAngleRad(3, 31)).toThrow();
  });

  it("flange offsets reference hub", () => {
    const o = flangeOffsetsFromHubOverallWidth(100, 26.5, 16.5);
    expect(o.halfWidthMm).toBeCloseTo(50, 6);
    expect(o.leftFlangeOffsetMm).toBeCloseTo(23.5, 6);
    expect(o.rightFlangeOffsetMm).toBeCloseTo(33.5, 6);
    expect(o.flangeToFlangeMm).toBeCloseTo(57, 6);
  });

  it("rejects x exceeding half width", () => {
    expect(() => flangeOffsetsFromHubOverallWidth(100, 51, 10)).toThrow();
  });

  it("maxCrosses bound", () => {
    expect(maxCrosses(32)).toBe(7);
    expect(maxCrosses(12)).toBe(2);
  });

  it("buildSpokeResults left-right alternate", () => {
    const rows = buildSpokeResults({
      erdMm: 600,
      spokeCount: 32,
      crosses: 3,
      leftFlangeRadiusMm: 29,
      rightFlangeRadiusMm: 29,
      leftFlangeOffsetMm: 34,
      rightFlangeOffsetMm: 34,
      nippleCorrectionMm: 0,
      rotationRad: 0,
    });
    expect(rows).toHaveLength(32);
    expect(rows[0].side).toBe("left");
    expect(rows[1].side).toBe("right");
  });

  it("reference script parity wheel", () => {
    const nSide = 16;
    const theta = (2 * Math.PI * 3) / nSide;
    const R_r = 599 / 2;
    const R_f = 92.6 / 2;
    const hole = 2.6;
    function refLength(offsetMm: number): number {
      const horizontal = Math.sqrt(
        R_r ** 2 + R_f ** 2 - 2 * R_r * R_f * Math.cos(theta),
      );
      return Math.sqrt(horizontal ** 2 + offsetMm ** 2) - hole / 2;
    }
    const rows = buildSpokeResults({
      erdMm: 599,
      spokeCount: 32,
      crosses: 3,
      leftFlangeRadiusMm: R_f,
      rightFlangeRadiusMm: R_f,
      leftFlangeOffsetMm: 29.3,
      rightFlangeOffsetMm: 24.5,
      flangeHoleDiameterMm: hole,
      nippleCorrectionMm: 0,
      rotationRad: 0,
    });
    const leftLen = rows.find((s) => s.side === "left")!.lengthMm;
    const rightLen = rows.find((s) => s.side === "right")!.lengthMm;
    expect(leftLen).toBeCloseTo(refLength(29.3), 9);
    expect(rightLen).toBeCloseTo(refLength(24.5), 9);
  });

  it("spoke head clearance and rim entry — rear wheel spreadsheet parity", () => {
    const clr = spokeHeadClearanceApproxMm({
      flangePcdMm: 92.6,
      spokeCount: 32,
      crosses: 3,
      flangeHoleDiameterMm: 2.6,
    });
    expect(clr).toBeCloseTo(4.36, 1);
    const angL = rimEntryAngleDeg({
      erdMm: 599,
      flangeRadiusMm: 92.6 / 2,
      crosses: 3,
      spokeCount: 32,
      side: "left",
    });
    const angR = rimEntryAngleDeg({
      erdMm: 599,
      flangeRadiusMm: 92.6 / 2,
      crosses: 3,
      spokeCount: 32,
      side: "right",
    });
    expect(angL).toBeCloseTo(8.63, 1);
    expect(angR).toBeCloseTo(8.63, 1);
  });

});
