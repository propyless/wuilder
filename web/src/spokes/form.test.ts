import { afterEach, describe, expect, it } from "vitest";
import { analyzeSpokeForm } from "./form";

const tierAFields = `
  <input name="erd_mm" value="600" />
  <input name="spoke_count" value="32" />
  <input name="crosses" value="3" />
  <input name="left_flange_diameter_mm" value="58" />
  <input name="right_flange_diameter_mm" value="58" />
  <input name="left_flange_offset_mm" value="35" />
  <input name="right_flange_offset_mm" value="20" />
  <input name="flange_hole_diameter_mm" value="2.6" />
  <input name="nipple_correction_mm" value="0" />
`;

function formWithRim(opts: {
  rimInner: string;
  rimWell: string;
  innerWall: string;
  nipple: string;
  spokeThread: string;
}): HTMLFormElement {
  document.body.innerHTML = `
    <form>
      ${tierAFields}
      <input name="wheel_size" value="" />
      <input name="rim_outer_width_mm" value="" />
      <input name="rim_inner_width_mm" value="${opts.rimInner}" />
      <input name="rim_well_depth_mm" value="${opts.rimWell}" />
      <input name="rim_inner_wall_depth_mm" value="${opts.innerWall}" />
      <select name="nipple"><option value="${opts.nipple}" selected>x</option></select>
      <input name="spoke_thread_length_mm" value="${opts.spokeThread}" />
      <input name="ordered_spoke_length_mm" value="" />
    </form>`;
  return document.querySelector("form") as HTMLFormElement;
}

describe("analyzeSpokeForm spoke-tip diagram hints", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("when inner wall is filled but rim well depth is empty, explains the distinction", () => {
    const form = formWithRim({
      rimInner: "25",
      rimWell: "",
      innerWall: "14",
      nipple: "demo_12",
      spokeThread: "16",
    });
    const m = analyzeSpokeForm(form);
    expect(m.tierAErrors).toEqual([]);
    expect(m.tierBErrors.some((e) => e.includes("not only inner wall"))).toBe(
      true,
    );
    expect(
      m.tierBErrors.some((e) => e.includes("Enter rim inner width and rim depth")),
    ).toBe(false);
  });

  it("does not add diagram nudge when rim depth is present but out of range", () => {
    const form = formWithRim({
      rimInner: "25",
      rimWell: "1",
      innerWall: "",
      nipple: "demo_12",
      spokeThread: "16",
    });
    const m = analyzeSpokeForm(form);
    expect(m.tierAErrors).toEqual([]);
    expect(m.tierBErrors).toContain("Rim depth must be between 2 and 60 mm.");
    expect(
      m.tierBErrors.some((e) => e.includes("spoke-tip diagram")),
    ).toBe(false);
  });

  it("has no diagram-related errors when inner width and well depth are valid", () => {
    const form = formWithRim({
      rimInner: "25",
      rimWell: "18",
      innerWall: "",
      nipple: "demo_12",
      spokeThread: "16",
    });
    const m = analyzeSpokeForm(form);
    expect(m.tierAErrors).toEqual([]);
    expect(m.rimInnerW).toBe(25);
    expect(m.rimWellD).toBe(18);
    expect(
      m.tierBErrors.some((e) => e.includes("spoke-tip diagram")),
    ).toBe(false);
  });

  it("nudges both fields when rim diagram inputs are empty", () => {
    const form = formWithRim({
      rimInner: "",
      rimWell: "",
      innerWall: "",
      nipple: "demo_12",
      spokeThread: "16",
    });
    const m = analyzeSpokeForm(form);
    expect(m.tierBErrors).toContain(
      "Enter rim inner width and rim depth to draw the spoke-tip diagram (or set spoke thread length to 0).",
    );
  });
});
