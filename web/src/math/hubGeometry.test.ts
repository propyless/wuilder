import { describe, expect, it } from "vitest";
import {
  buildHubSideViewSvg,
  illustrativeOtherAsPctOfReference,
  spokeTensionBalanceDisplayPercents,
} from "./hubGeometry";

describe("illustrativeOtherAsPctOfReference", () => {
  it("is 100% for symmetric hub and equal mean lengths (left ref)", () => {
    const p = illustrativeOtherAsPctOfReference({
      referenceSide: "left",
      wLeftMm: 35,
      wRightMm: 35,
      avgLenLeftMm: 290,
      avgLenRightMm: 290,
    });
    expect(p).toBeCloseTo(100, 5);
  });

  it("matches 100 * w_left / w_right when mean lengths are equal (left ref)", () => {
    const p = illustrativeOtherAsPctOfReference({
      referenceSide: "left",
      wLeftMm: 35,
      wRightMm: 20,
      avgLenLeftMm: 300,
      avgLenRightMm: 300,
    });
    expect(p).toBeCloseTo((100 * 35) / 20, 5);
  });

  it("right reference inverts the ratio vs left ref for same geometry", () => {
    const leftRef = illustrativeOtherAsPctOfReference({
      referenceSide: "left",
      wLeftMm: 35,
      wRightMm: 20,
      avgLenLeftMm: 300,
      avgLenRightMm: 300,
    });
    const rightRef = illustrativeOtherAsPctOfReference({
      referenceSide: "right",
      wLeftMm: 35,
      wRightMm: 20,
      avgLenLeftMm: 300,
      avgLenRightMm: 300,
    });
    expect(leftRef * rightRef).toBeCloseTo(100 * 100, 3);
  });
});

describe("spokeTensionBalanceDisplayPercents", () => {
  it("puts the tighter side at 100% (rear-like: larger left offset, shorter right spoke)", () => {
    const d = spokeTensionBalanceDisplayPercents({
      wLeftMm: 29.3,
      wRightMm: 24.5,
      avgLenLeftMm: 284.8,
      avgLenRightMm: 284.3,
    });
    expect(d.rightPct).toBe(100);
    expect(d.leftPct).toBeCloseTo(83.8, 0);
  });

  it("puts left at 100% when left is tighter than right", () => {
    const d = spokeTensionBalanceDisplayPercents({
      wLeftMm: 20,
      wRightMm: 35,
      avgLenLeftMm: 300,
      avgLenRightMm: 300,
    });
    expect(d.leftPct).toBe(100);
    expect(d.rightPct).toBeCloseTo((100 * 20) / 35, 5);
  });

  it("is 100% / 100% for symmetric hub and equal mean lengths", () => {
    const d = spokeTensionBalanceDisplayPercents({
      wLeftMm: 35,
      wRightMm: 35,
      avgLenLeftMm: 290,
      avgLenRightMm: 290,
    });
    expect(d.leftPct).toBeCloseTo(100, 5);
    expect(d.rightPct).toBeCloseTo(100, 5);
  });
});

describe("buildHubSideViewSvg", () => {
  it("places left flange west of center and right flange east", () => {
    const s = buildHubSideViewSvg(35, 20);
    expect(s.leftFlangeX).toBeLessThan(s.centerX);
    expect(s.rightFlangeX).toBeGreaterThan(s.centerX);
  });

  it("clamps negative offsets to zero for layout", () => {
    const s = buildHubSideViewSvg(-5, 20);
    expect(s.leftOffsetMm).toBe(0);
    expect(s.rightOffsetMm).toBe(20);
  });
});
