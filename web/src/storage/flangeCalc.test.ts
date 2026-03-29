import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyFlangeCalcToForm,
  loadFlangeCalcInputs,
  parseMm,
  runFlangeCalc,
  saveFlangeCalcInputs,
} from "./flangeCalc";
import { FLANGE_CALC_KEY, FLANGE_CALC_SCHEMA } from "./keys";

function ls(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => {
      m.set(k, v);
    },
    removeItem: (k) => {
      m.delete(k);
    },
    clear: () => m.clear(),
    get length() {
      return m.size;
    },
    key: (i) => Array.from(m.keys())[i] ?? null,
  } as Storage;
}

function mountFlangeCalcPanel(): void {
  document.body.innerHTML = `
    <input id="flange-calc-overall-mm" />
    <input id="flange-calc-x-mm" />
    <input id="flange-calc-y-mm" />
    <input id="flange-calc-f-measured-mm" />
    <div id="flange-calc-out-L"></div>
    <div id="flange-calc-out-R"></div>
    <div id="flange-calc-out-F"></div>
    <div id="flange-calc-out-h"></div>
    <p id="flange-calc-hint" class="hint flange-calc-hint"></p>
  `;
}

describe("parseMm", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns NaN when element is missing", () => {
    expect(Number.isNaN(parseMm("flange-calc-overall-mm"))).toBe(true);
  });

  it("parses decimals with comma", () => {
    document.body.innerHTML = `<input id="flange-calc-overall-mm" value="10,5" />`;
    expect(parseMm("flange-calc-overall-mm")).toBeCloseTo(10.5, 6);
  });
});

describe("saveFlangeCalcInputs / loadFlangeCalcInputs", () => {
  beforeEach(() => {
    globalThis.localStorage = ls();
    mountFlangeCalcPanel();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("round-trips fields through localStorage", () => {
    saveFlangeCalcInputs(100, 35, 20, 57.0);
    loadFlangeCalcInputs();
    expect(
      (document.getElementById("flange-calc-overall-mm") as HTMLInputElement)
        .value,
    ).toBe("100");
    expect(
      (document.getElementById("flange-calc-x-mm") as HTMLInputElement).value,
    ).toBe("35");
    expect(
      (document.getElementById("flange-calc-y-mm") as HTMLInputElement).value,
    ).toBe("20");
    expect(
      (
        document.getElementById(
          "flange-calc-f-measured-mm",
        ) as HTMLInputElement
      ).value,
    ).toBe("57");
  });

  it("ignores wrong schema", () => {
    (
      document.getElementById("flange-calc-overall-mm") as HTMLInputElement
    ).value = "1";
    localStorage.setItem(
      FLANGE_CALC_KEY,
      JSON.stringify({
        schema: 0,
        overall: 99,
        x: 1,
        y: 2,
        fMeasured: null,
      }),
    );
    loadFlangeCalcInputs();
    expect(
      (document.getElementById("flange-calc-overall-mm") as HTMLInputElement)
        .value,
    ).toBe("1");
  });

  it("stores null fMeasured without writing the field", () => {
    saveFlangeCalcInputs(50, 10, 10, null);
    (
      document.getElementById("flange-calc-f-measured-mm") as HTMLInputElement
    ).value = "";
    loadFlangeCalcInputs();
    expect(
      (
        document.getElementById(
          "flange-calc-f-measured-mm",
        ) as HTMLInputElement
      ).value,
    ).toBe("");
  });
});

describe("runFlangeCalc", () => {
  beforeEach(() => {
    globalThis.localStorage = ls();
    mountFlangeCalcPanel();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("writes L, R, F, half-width for valid hub dimensions", () => {
    (document.getElementById("flange-calc-overall-mm") as HTMLInputElement).value =
      "100";
    (document.getElementById("flange-calc-x-mm") as HTMLInputElement).value =
      "35";
    (document.getElementById("flange-calc-y-mm") as HTMLInputElement).value =
      "20";
    runFlangeCalc();
    expect(document.getElementById("flange-calc-out-L")?.textContent).toBe(
      "15.00",
    );
    expect(document.getElementById("flange-calc-out-R")?.textContent).toBe(
      "30.00",
    );
    expect(document.getElementById("flange-calc-out-F")?.textContent).toBe(
      "45.00",
    );
    expect(document.getElementById("flange-calc-out-h")?.textContent).toBe(
      "50.00",
    );
    const raw = localStorage.getItem(FLANGE_CALC_KEY);
    expect(raw).toBeTruthy();
    const o = JSON.parse(raw!) as { schema: number };
    expect(o.schema).toBe(FLANGE_CALC_SCHEMA);
  });

  it("shows dashes and error hint when x/y are inconsistent", () => {
    (document.getElementById("flange-calc-overall-mm") as HTMLInputElement).value =
      "50";
    (document.getElementById("flange-calc-x-mm") as HTMLInputElement).value =
      "40";
    (document.getElementById("flange-calc-y-mm") as HTMLInputElement).value =
      "40";
    runFlangeCalc();
    expect(document.getElementById("flange-calc-out-L")?.textContent).toBe(
      "—",
    );
    const hint = document.getElementById("flange-calc-hint");
    expect(hint?.className).toContain("flange-calc-hint--error");
    expect(hint?.textContent).toMatch(/negative|larger|half/i);
  });

  it("notes when measured F matches L+R", () => {
    (document.getElementById("flange-calc-overall-mm") as HTMLInputElement).value =
      "100";
    (document.getElementById("flange-calc-x-mm") as HTMLInputElement).value =
      "35";
    (document.getElementById("flange-calc-y-mm") as HTMLInputElement).value =
      "20";
    (
      document.getElementById("flange-calc-f-measured-mm") as HTMLInputElement
    ).value = "45";
    runFlangeCalc();
    expect(
      document.getElementById("flange-calc-hint")?.textContent,
    ).toMatch(/matches/i);
  });
});

describe("applyFlangeCalcToForm", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("fills spoke form offset fields when geometry is valid", () => {
    document.body.innerHTML = `
      <input id="flange-calc-overall-mm" value="100" />
      <input id="flange-calc-x-mm" value="35" />
      <input id="flange-calc-y-mm" value="20" />
      <input id="id_left_flange_offset_mm" />
      <input id="id_right_flange_offset_mm" />
    `;
    applyFlangeCalcToForm();
    expect(
      (document.getElementById("id_left_flange_offset_mm") as HTMLInputElement)
        .value,
    ).toBe("15.00");
    expect(
      (document.getElementById("id_right_flange_offset_mm") as HTMLInputElement)
        .value,
    ).toBe("30.00");
  });

  it("does nothing when offsets cannot be computed", () => {
    document.body.innerHTML = `
      <input id="flange-calc-overall-mm" value="50" />
      <input id="flange-calc-x-mm" value="40" />
      <input id="flange-calc-y-mm" value="40" />
      <input id="id_left_flange_offset_mm" value="9" />
      <input id="id_right_flange_offset_mm" value="9" />
    `;
    applyFlangeCalcToForm();
    expect(
      (document.getElementById("id_left_flange_offset_mm") as HTMLInputElement)
        .value,
    ).toBe("9");
  });
});
