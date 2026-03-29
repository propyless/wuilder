import { describe, expect, it } from "vitest";
import { computeNippleFit } from "./nippleFit";

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
});
