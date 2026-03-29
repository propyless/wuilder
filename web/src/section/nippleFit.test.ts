import { describe, expect, it } from "vitest";
import { computeNippleFit } from "./nippleFit";

/** Shared body from legacy test_nipple_fit.py unit cases. */
const base = {
  nippleBodyLengthMm: 12,
  internalThreadLengthMm: 10,
  spokeThreadLengthMm: 16,
  wellDepthMm: 17,
};

describe("computeNippleFit", () => {
  it("matches short-tip engagement model", () => {
    const f = computeNippleFit({
      calculatedSpokeLengthMm: 100,
      orderedSpokeLengthMm: 98,
      nippleBodyLengthMm: 12,
      internalThreadLengthMm: 10,
      spokeThreadLengthMm: 16,
      wellDepthMm: 17,
    });
    expect(f.tipFromSeatMm).toBeCloseTo(2, 6);
    expect(f.tipToRimOuterMm).toBeCloseTo(19, 6);
    expect(f.threadEngagementMm).toBeGreaterThan(0);
  });

  it("ordered equals calculated: tip at seat, full internal engagement", () => {
    const f = computeNippleFit({
      calculatedSpokeLengthMm: 290,
      orderedSpokeLengthMm: 290,
      ...base,
    });
    expect(f.tipFromSeatMm).toBeCloseTo(0, 6);
    expect(f.tipToRimOuterMm).toBeCloseTo(17, 6);
    expect(f.threadEngagementMm).toBeCloseTo(10, 6);
  });

  it("ordered longer: tip past seat into cavity", () => {
    const f = computeNippleFit({
      calculatedSpokeLengthMm: 290,
      orderedSpokeLengthMm: 292,
      ...base,
    });
    expect(f.tipFromSeatMm).toBeCloseTo(-2, 6);
    expect(f.tipToRimOuterMm).toBeCloseTo(15, 6);
    expect(f.threadEngagementMm).toBeCloseTo(10, 6);
  });

  it("ordered shorter: tip inside body, partial overlap engagement", () => {
    const f = computeNippleFit({
      calculatedSpokeLengthMm: 290,
      orderedSpokeLengthMm: 286,
      ...base,
    });
    expect(f.tipFromSeatMm).toBeCloseTo(4, 6);
    expect(f.tipToRimOuterMm).toBeCloseTo(21, 6);
    expect(f.threadEngagementMm).toBeCloseTo(6, 6);
  });

  it("limits engagement by short spoke thread", () => {
    const f = computeNippleFit({
      calculatedSpokeLengthMm: 290,
      orderedSpokeLengthMm: 290,
      nippleBodyLengthMm: 12,
      internalThreadLengthMm: 10,
      spokeThreadLengthMm: 5,
      wellDepthMm: 17,
    });
    expect(f.threadEngagementMm).toBeCloseTo(5, 6);
    expect(f.tipFromSeatMm).toBeCloseTo(0, 6);
  });

  it("very long ordered spoke: negative tip-to-rim-outer", () => {
    const f = computeNippleFit({
      calculatedSpokeLengthMm: 290,
      orderedSpokeLengthMm: 313,
      ...base,
    });
    expect(f.tipFromSeatMm).toBeCloseTo(-23, 6);
    expect(f.tipToRimOuterMm).toBeCloseTo(-6, 6);
  });

  it("spoke so short thread does not reach internal zone: zero engagement", () => {
    const f = computeNippleFit({
      calculatedSpokeLengthMm: 290,
      orderedSpokeLengthMm: 274,
      nippleBodyLengthMm: 12,
      internalThreadLengthMm: 10,
      spokeThreadLengthMm: 5,
      wellDepthMm: 17,
    });
    expect(f.tipFromSeatMm).toBeCloseTo(16, 6);
    expect(f.threadEngagementMm).toBeCloseTo(0, 6);
  });
});
