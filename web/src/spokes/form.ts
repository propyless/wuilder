import { maxCrosses } from "../math/spokeLength";
import { WHEEL_BSD_MM } from "./constants";
import { findNipple } from "./nipples";

export function parseForm(form: HTMLFormElement): Record<string, string> {
  const fd = new FormData(form);
  const o: Record<string, string> = {};
  fd.forEach((v, k) => {
    o[k] = String(v);
  });
  return o;
}

/** Hub + ERD inputs required for spoke length; diagram / optional fields are tier B. */
export interface SpokeFormModel {
  o: Record<string, string>;
  tierAErrors: string[];
  tierBErrors: string[];
  erdMm: number;
  spokeCount: number;
  crosses: number;
  lPcd: number;
  rPcd: number;
  lOff: number;
  rOff: number;
  hole: number;
  nip: number;
  nippleId: string;
  wheelSizeKey: string;
  wheelBsdMm: number | null;
  rimInnerW: number | null;
  rimOuterW: number | null;
  rimWellD: number | null;
  spokeThread: number;
  iwdStr: string;
  orderedStr: string;
}

export function analyzeSpokeForm(form: HTMLFormElement): SpokeFormModel {
  const o = parseForm(form);
  const erdMm = parseFloat(o.erd_mm);
  const spokeCount = parseInt(o.spoke_count, 10);
  const crosses = parseInt(o.crosses, 10);
  const lPcd = parseFloat(o.left_flange_diameter_mm);
  const rPcd = parseFloat(o.right_flange_diameter_mm);
  const lOff = parseFloat(o.left_flange_offset_mm);
  const rOff = parseFloat(o.right_flange_offset_mm);
  const hole =
    o.flange_hole_diameter_mm === "" ? 0 : parseFloat(o.flange_hole_diameter_mm);
  const nip =
    o.nipple_correction_mm === "" ? 0 : parseFloat(o.nipple_correction_mm);

  const tierAErrors: string[] = [];
  if (!Number.isFinite(erdMm) || erdMm < 200 || erdMm > 700) {
    tierAErrors.push("ERD must be between 200 and 700 mm.");
  }
  if (!Number.isFinite(spokeCount) || spokeCount < 12 || spokeCount > 52 || spokeCount % 2) {
    tierAErrors.push("Invalid spoke count.");
  }
  if (!Number.isFinite(crosses) || crosses < 0) {
    tierAErrors.push("Crosses must be a non-negative integer.");
  }
  if (Number.isFinite(spokeCount) && Number.isFinite(crosses)) {
    const lim = maxCrosses(spokeCount);
    if (crosses > lim) {
      tierAErrors.push(
        `For ${spokeCount} spokes, crosses must be ≤ ${lim} (tangential hole spacing).`,
      );
    }
  }
  if (!Number.isFinite(lPcd) || lPcd < 20 || lPcd > 200) {
    tierAErrors.push("Left flange PCD must be between 20 and 200 mm.");
  }
  if (!Number.isFinite(rPcd) || rPcd < 20 || rPcd > 200) {
    tierAErrors.push("Right flange PCD must be between 20 and 200 mm.");
  }
  if (!Number.isFinite(lOff) || lOff < 0 || lOff > 120) {
    tierAErrors.push("Left flange offset must be between 0 and 120 mm.");
  }
  if (!Number.isFinite(rOff) || rOff < 0 || rOff > 120) {
    tierAErrors.push("Right flange offset must be between 0 and 120 mm.");
  }
  if (
    o.flange_hole_diameter_mm !== "" &&
    (!Number.isFinite(hole) || hole < 0 || hole > 10)
  ) {
    tierAErrors.push("Hub hole diameter must be between 0 and 10 mm.");
  }
  if (o.nipple_correction_mm !== "" && !Number.isFinite(nip)) {
    tierAErrors.push("Nipple correction must be a number.");
  }

  const nippleId = (o.nipple || "").trim();
  const wheelSizeKey = (o.wheel_size || "").trim();
  let wheelBsdMm: number | null = null;
  const tierBErrors: string[] = [];
  if (wheelSizeKey !== "") {
    const bsd = WHEEL_BSD_MM[wheelSizeKey];
    if (!Number.isFinite(bsd)) {
      tierBErrors.push("Unknown wheel size.");
    } else {
      wheelBsdMm = bsd;
      if (Number.isFinite(erdMm) && erdMm >= bsd) {
        tierBErrors.push(
          "ERD must be smaller than BSD for the selected wheel size.",
        );
      }
    }
  }
  const rimWStr = o.rim_inner_width_mm ?? "";
  const rimOuterWStr = o.rim_outer_width_mm ?? "";
  const rimDStr = o.rim_well_depth_mm ?? "";
  const iwdStr = o.rim_inner_wall_depth_mm ?? "";
  let rimInnerW: number | null = null;
  let rimOuterW: number | null = null;
  let rimWellD: number | null = null;
  if (rimWStr !== "") {
    const iw = parseFloat(rimWStr.replace(",", "."));
    if (!Number.isFinite(iw) || iw < 5 || iw > 80) {
      tierBErrors.push("Rim inner width must be between 5 and 80 mm.");
    } else {
      rimInnerW = iw;
    }
  }
  if (rimDStr !== "") {
    const wd = parseFloat(rimDStr.replace(",", "."));
    if (!Number.isFinite(wd) || wd < 2 || wd > 60) {
      tierBErrors.push("Rim depth must be between 2 and 60 mm.");
    } else {
      rimWellD = wd;
    }
  }
  if (rimOuterWStr !== "") {
    const ow = parseFloat(rimOuterWStr.replace(",", "."));
    if (!Number.isFinite(ow) || ow < 10 || ow > 100) {
      tierBErrors.push("Rim outer width must be between 10 and 100 mm.");
    } else {
      rimOuterW = ow;
    }
  }
  if (rimInnerW != null && rimOuterW != null && rimOuterW < rimInnerW) {
    tierBErrors.push(
      "Rim outer width must be greater than or equal to rim inner width.",
    );
  }
  if (
    wheelBsdMm != null &&
    rimWellD != null &&
    Number.isFinite(erdMm)
  ) {
    const seatFromBead = (wheelBsdMm - erdMm) / 2.0;
    if (seatFromBead >= rimWellD) {
      tierBErrors.push(
        `Selected wheel size and ERD imply nipple seat depth ${seatFromBead.toFixed(1)} mm, which exceeds rim depth ${rimWellD.toFixed(1)} mm.`,
      );
    }
  }
  const spokeThreadStr = o.spoke_thread_length_mm ?? "";
  let spokeThread = 0;
  if (spokeThreadStr !== "") {
    spokeThread = parseFloat(spokeThreadStr.replace(",", "."));
    if (!Number.isFinite(spokeThread) || spokeThread < 0 || spokeThread > 50) {
      tierBErrors.push("Spoke thread length must be between 0 and 50 mm.");
    }
  }
  if (nippleId) {
    if (!findNipple(nippleId)) {
      tierBErrors.push("Unknown nipple preset.");
    } else if (spokeThread > 0) {
      const innerInvalid =
        rimWStr !== "" && rimInnerW == null;
      const wellInvalid = rimDStr !== "" && rimWellD == null;
      if (rimInnerW != null && rimWellD != null) {
        /* diagram inputs OK */
      } else if (innerInvalid || wellInvalid) {
        /* Range/parse errors already added above */
      } else if (rimDStr === "" && iwdStr !== "") {
        tierBErrors.push(
          "Enter rim depth (mm)—the total inner well depth—not only inner wall depth—to draw the spoke-tip diagram (or set spoke thread length to 0).",
        );
        if (rimWStr === "") {
          tierBErrors.push(
            "Enter rim inner width (mm) as well.",
          );
        }
      } else if (rimWStr === "" && rimDStr === "") {
        tierBErrors.push(
          "Enter rim inner width and rim depth to draw the spoke-tip diagram (or set spoke thread length to 0).",
        );
      } else if (rimWStr === "") {
        tierBErrors.push(
          "Enter rim inner width (mm) to draw the spoke-tip diagram (or set spoke thread length to 0).",
        );
      } else if (rimDStr === "") {
        tierBErrors.push(
          "Enter rim depth (mm) to draw the spoke-tip diagram (or set spoke thread length to 0).",
        );
      }
    }
  }
  if (iwdStr !== "") {
    const iwd = parseFloat(iwdStr.replace(",", "."));
    if (!Number.isFinite(iwd) || iwd < 1 || iwd > 58) {
      tierBErrors.push("Inner wall depth must be between 1 and 58 mm.");
    } else if (
      rimWellD != null &&
      Number.isFinite(iwd) &&
      iwd >= rimWellD
    ) {
      tierBErrors.push(
        "Inner wall depth must be less than the total rim depth.",
      );
    }
  }
  const orderedStr = o.ordered_spoke_length_mm ?? "";
  if (orderedStr !== "") {
    const ol = parseFloat(orderedStr.replace(",", "."));
    if (!Number.isFinite(ol) || ol < 100 || ol > 400) {
      tierBErrors.push("Ordered spoke length must be between 100 and 400 mm.");
    }
  }

  return {
    o,
    tierAErrors,
    tierBErrors,
    erdMm,
    spokeCount,
    crosses,
    lPcd,
    rPcd,
    lOff,
    rOff,
    hole,
    nip,
    nippleId,
    wheelSizeKey,
    wheelBsdMm,
    rimInnerW,
    rimOuterW,
    rimWellD,
    spokeThread,
    iwdStr,
    orderedStr,
  };
}
