import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyBuildParamsToTensionForm,
  type BuildParamsPayload,
  clearBuildParams,
  loadBuildParams,
  saveBuildParams,
} from "./buildParams";
import { BUILD_PARAMS_KEY } from "./keys";

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

const SAMPLE: BuildParamsPayload = {
  erd_mm: 600,
  spoke_count: 28,
  crosses: 3,
  left_flange_diameter_mm: 58,
  right_flange_diameter_mm: 58,
  left_flange_offset_mm: 35,
  right_flange_offset_mm: 20,
  flange_hole_diameter_mm: 2.6,
  nipple_correction_mm: 0,
};

/** Minimal tension-form controls as expected by applyBuildParamsToTensionForm. */
function mountTensionHubFields(): void {
  document.body.innerHTML = `
    <form>
      <select id="id_spoke_count" name="spoke_count">
        <option value="28">28</option>
        <option value="32" selected>32</option>
      </select>
      <input id="id_hub_erd_mm" name="hub_erd_mm" />
      <input id="id_hub_crosses" name="hub_crosses" />
      <input id="id_hub_left_flange_pcd_mm" name="hub_left_flange_pcd_mm" />
      <input id="id_hub_right_flange_pcd_mm" name="hub_right_flange_pcd_mm" />
      <input id="id_hub_left_offset_mm" name="hub_left_offset_mm" />
      <input id="id_hub_right_offset_mm" name="hub_right_offset_mm" />
      <input id="id_hub_flange_hole_diameter_mm" name="hub_flange_hole_diameter_mm" value="0" />
      <input id="id_hub_nipple_correction_mm" name="hub_nipple_correction_mm" value="0" />
    </form>`;
}

describe("loadBuildParams / saveBuildParams", () => {
  beforeEach(() => {
    globalThis.localStorage = ls();
  });

  it("returns null for wrong schema", () => {
    localStorage.setItem(
      BUILD_PARAMS_KEY,
      JSON.stringify({ schema: 0, ...SAMPLE }),
    );
    expect(loadBuildParams()).toBeNull();
  });

  it("round-trips payload", () => {
    saveBuildParams(SAMPLE);
    expect(loadBuildParams()).toMatchObject(SAMPLE);
  });

  afterEach(() => {
    clearBuildParams();
  });
});

describe("applyBuildParamsToTensionForm", () => {
  beforeEach(() => {
    globalThis.localStorage = ls();
    mountTensionHubFields();
    saveBuildParams(SAMPLE);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    clearBuildParams();
  });

  it("applies all mapped fields including spoke_count", () => {
    const ok = applyBuildParamsToTensionForm();
    expect(ok).toBe(true);
    expect(
      (document.getElementById("id_spoke_count") as HTMLSelectElement).value,
    ).toBe("28");
    expect(( document.getElementById("id_hub_erd_mm") as HTMLInputElement).value).toBe(
      "600",
    );
    expect(
      (document.getElementById("id_hub_crosses") as HTMLInputElement).value,
    ).toBe("3");
    expect(
      (document.getElementById("id_hub_left_offset_mm") as HTMLInputElement).value,
    ).toBe("35");
    expect(
      (
        document.getElementById(
          "id_hub_flange_hole_diameter_mm",
        ) as HTMLInputElement
      ).value,
    ).toBe("2.6");
  });

  it("with hubGeomOnly + onlyIfEmpty, does not change spoke_count or non-empty hub fields", () => {
    applyBuildParamsToTensionForm();
    (
      document.getElementById("id_hub_erd_mm") as HTMLInputElement
    ).value = "601";
    saveBuildParams({
      ...SAMPLE,
      erd_mm: 599,
      spoke_count: 32,
    });
    expect(
      applyBuildParamsToTensionForm({
        onlyIfEmpty: true,
        hubGeomOnly: true,
      }),
    ).toBe(false);
    expect(
      (document.getElementById("id_spoke_count") as HTMLSelectElement).value,
    ).toBe("28");
    expect(
      (document.getElementById("id_hub_erd_mm") as HTMLInputElement).value,
    ).toBe("601");
  });

  it("with hubGeomOnly + onlyIfEmpty, fills blank hub fields from storage", () => {
    applyBuildParamsToTensionForm();
    (document.getElementById("id_hub_crosses") as HTMLInputElement).value =
      "";
    saveBuildParams({ ...SAMPLE, crosses: 4 });
    expect(
      applyBuildParamsToTensionForm({ onlyIfEmpty: true, hubGeomOnly: true }),
    ).toBe(true);
    expect(
      (document.getElementById("id_hub_crosses") as HTMLInputElement).value,
    ).toBe("4");
  });

  it("returns false when nothing in storage", () => {
    localStorage.removeItem(BUILD_PARAMS_KEY);
    mountTensionHubFields();
    expect(applyBuildParamsToTensionForm()).toBe(false);
  });
});
