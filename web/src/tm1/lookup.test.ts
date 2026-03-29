import { describe, expect, it } from "vitest";
import {
  deflectionForKgf,
  tensionKgf,
  TM1LookupError,
} from "./lookup";

const chart = "steel_round_2.0";

describe("tm1 lookup", () => {
  it("roundtrip deflection", () => {
    for (const x of [17, 20, 22.5, 27]) {
      const k = tensionKgf(chart, x);
      const x2 = deflectionForKgf(chart, k);
      expect(x2).toBeCloseTo(x, 5);
    }
  });

  it("deflection below tension range raises", () => {
    expect(() => deflectionForKgf(chart, 50)).toThrow(TM1LookupError);
  });

  it("exact knot at 20", () => {
    expect(tensionKgf(chart, 20)).toBeCloseTo(70, 6);
  });

  it("interpolation mid segment", () => {
    expect(tensionKgf(chart, 20.5)).toBeCloseTo(73.5, 6);
  });

  it("below deflection range raises", () => {
    expect(() => tensionKgf(chart, 16.9)).toThrow(TM1LookupError);
  });

  it("above deflection range raises", () => {
    expect(() => tensionKgf(chart, 28.1)).toThrow(TM1LookupError);
  });
});
