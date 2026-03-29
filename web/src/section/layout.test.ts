import { describe, expect, it } from "vitest";
import { buildSectionLayout } from "./layout";
import { spokeLengthMm } from "../math/spokeLength";

describe("buildSectionLayout", () => {
  const rim = { erdMm: 600, innerWidthMm: 20, wellDepthMm: 16 };
  const hub = {
    leftFlangePcdMm: 58,
    rightFlangePcdMm: 58,
    leftFlangeOffsetMm: 35,
    rightFlangeOffsetMm: 20,
  };
  const nipple = {
    headDiameterMm: 7,
    headHeightMm: 5,
    bodyLengthMm: 10,
    shankDiameterMm: 4,
    internalThreadLengthMm: 10,
  };

  it("matches Django test_section paths and spoke length (right side)", () => {
    const hole = 2.6;
    const crosses = 3;
    const n = 32;
    const d = buildSectionLayout(rim, hub, nipple, {
      side: "right",
      spokeCount: n,
      crosses,
      flangeHoleDiameterMm: hole,
      nippleCorrectionMm: 0,
    });
    expect(d.rimPath.startsWith("M")).toBe(true);
    expect(d.nippleHeadPath).toContain("L");
    expect(d.nippleY).toBeLessThan(d.flangeY);

    const w = hub.rightFlangeOffsetMm;
    const raw = spokeLengthMm(
      rim.erdMm,
      hub.rightFlangePcdMm / 2,
      w,
      crosses,
      n,
    );
    const expectL = raw - hole / 2;
    expect(d.spokeLengthMm).toBeCloseTo(expectL, 6);

    const dxMm = (d.flangeX - d.nippleX) / d.scaleMmPerPx;
    const dyMm = (d.flangeY - d.nippleY) / d.scaleMmPerPx;
    expect(Math.hypot(dxMm, dyMm)).toBeCloseTo(expectL, 4);
  });

  it("uses left flange geometry when side is left", () => {
    const d = buildSectionLayout(rim, hub, nipple, {
      side: "left",
      spokeCount: 32,
      crosses: 3,
      flangeHoleDiameterMm: 0,
      nippleCorrectionMm: 0,
    });
    expect(d.flangeOffsetMm).toBe(hub.leftFlangeOffsetMm);
    expect(d.flangeX).toBeLessThan(d.nippleX);
  });

});
