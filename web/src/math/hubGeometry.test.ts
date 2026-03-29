import { describe, expect, it } from "vitest";
import { buildHubSideViewSvg, illustrativeOtherAsPctOfReference } from "./hubGeometry";

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
