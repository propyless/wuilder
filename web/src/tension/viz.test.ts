import { describe, expect, it } from "vitest";
import {
  adjustmentAction,
  buildTensionRatioSummary,
  buildTensionSideStats,
  buildTensionSpokeRows,
  sideAverageKgf,
  tensionDeviationBand,
  usesSideRatio,
  varianceLimitDetail,
} from "./viz";
import { tensionKgf } from "../tm1/lookup";

describe("tension viz", () => {
  it("usesSideRatio", () => {
    expect(usesSideRatio(100)).toBe(false);
    expect(usesSideRatio(100.0)).toBe(false);
    expect(usesSideRatio(84)).toBe(true);
    expect(usesSideRatio(99.99)).toBe(true);
  });

  it("adjustmentAction", () => {
    expect(adjustmentAction(25, true)).toEqual(["", ""]);
    expect(adjustmentAction(-21, false)).toEqual(["Tighten", "T"]);
    expect(adjustmentAction(21, false)).toEqual(["Loosen", "L"]);
  });

  it("sideAverageKgf", () => {
    expect(sideAverageKgf([70, 80, 90, 100], 4)).toEqual([80, 90]);
  });

  it("buildTensionSideStats readings", () => {
    const s = buildTensionSideStats([100, 100, 100], {
      variancePercent: 10,
      chartId: "steel_round_2.0",
    });
    expect(s.avgKgf).toBeCloseTo(100, 6);
    expect(s.upperKgf).toBeCloseTo(110, 6);
    expect(s.lowerKgf).toBeCloseTo(90, 6);
    expect(s.upperReading).not.toBeNull();
    expect(s.lowerReading).not.toBeNull();
    if (s.upperReading != null) {
      expect(tensionKgf("steel_round_2.0", s.upperReading)).toBeCloseTo(110, 3);
    }
    if (s.lowerReading != null) {
      expect(tensionKgf("steel_round_2.0", s.lowerReading)).toBeCloseTo(90, 3);
    }
  });

  it("varianceLimitDetail", () => {
    expect(varianceLimitDetail(12, 20)).toContain("under");
    expect(varianceLimitDetail(12, 20)).toContain("8.0%");
    expect(varianceLimitDetail(25, 20)).toContain("past");
    expect(varianceLimitDetail(25, 20)).toContain("5.0%");
    expect(varianceLimitDetail(-15, 20)).toContain("under");
  });

  it("tensionDeviationBand", () => {
    expect(tensionDeviationBand(0)[1]).toBe("tension-good");
    expect(tensionDeviationBand(5)[1]).toBe("tension-good");
    expect(tensionDeviationBand(-5)[1]).toBe("tension-good");
    expect(tensionDeviationBand(7)[1]).toBe("tension-ok");
    expect(tensionDeviationBand(12)[1]).toBe("tension-warn");
    expect(tensionDeviationBand(20)[1]).toBe("tension-bad");
  });

  it("buildTensionSpokeRows basics", () => {
    const n = 4;
    const readings = [20, 20, 20, 20];
    const tensions = [70, 70, 70, 70];
    const rows = buildTensionSpokeRows({
      spokeCount: n,
      readings,
      tensionsKgf: tensions,
    });
    expect(rows).toHaveLength(4);
    expect(rows[0].side).toBe("left");
    expect(rows[1].side).toBe("right");
    expect(rows[0].withinVariance).toBe(true);
    expect(rows[0].referenceKgf).toBeCloseTo(70, 6);
  });

  it("within variance respects limit", () => {
    const rows = buildTensionSpokeRows({
      spokeCount: 4,
      readings: [20, 20, 20, 20],
      tensionsKgf: [70, 70, 70, 110],
      variancePercent: 20,
    });
    expect(rows[0].withinVariance).toBe(true);
    expect(rows[3].withinVariance).toBe(false);
    expect(rows[3].varianceLimitDetail).toContain("past");
    expect(rows[3].adjustAction).toBe("Loosen");
    expect(rows[3].adjustShort).toBe("L");
    expect(rows[0].adjustAction).toBe("");
  });

  it("ratio mode left reference 84", () => {
    const rows = buildTensionSpokeRows({
      spokeCount: 4,
      readings: [0, 0, 0, 0],
      tensionsKgf: [100, 84, 100, 84],
      variancePercent: 20,
      balanceMode: "ratio",
      ratioReferenceSide: "left",
      ratioOtherPct: 84,
    });
    expect(rows.every((r) => r.withinVariance)).toBe(true);
    expect(rows[0].referenceKgf).toBeCloseTo(100, 6);
    expect(rows[1].referenceKgf).toBeCloseTo(84, 6);
  });

  it("buildTensionRatioSummary", () => {
    const s = buildTensionRatioSummary(100, 83, {
      referenceSide: "left",
      otherPct: 84,
    });
    expect(s.otherSide).toBe("right");
    expect(s.targetOtherAvgKgf).toBeCloseTo(84, 6);
    expect(s.measuredOtherAsPctOfRef).toBeCloseTo(83, 6);
  });
});
