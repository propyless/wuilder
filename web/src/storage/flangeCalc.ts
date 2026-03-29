import { FLANGE_CALC_KEY, FLANGE_CALC_SCHEMA } from "./keys";
import { flangeOffsetsFromHubOverallWidth } from "../math/spokeLength";

interface FlangeCalcStored {
  schema: number;
  overall: number;
  x: number;
  y: number;
  fMeasured: number | null;
}

export function loadFlangeCalcInputs(): void {
  try {
    const raw = localStorage.getItem(FLANGE_CALC_KEY);
    if (!raw) return;
    const o = JSON.parse(raw) as FlangeCalcStored;
    if (!o || o.schema !== FLANGE_CALC_SCHEMA) return;
    const map: [keyof FlangeCalcStored, string][] = [
      ["overall", "flange-calc-overall-mm"],
      ["x", "flange-calc-x-mm"],
      ["y", "flange-calc-y-mm"],
    ];
    for (const [k, id] of map) {
      const v = o[k];
      if (v === undefined || v === null) continue;
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = String(v);
    }
    if (o.fMeasured != null) {
      const el = document.getElementById("flange-calc-f-measured-mm") as HTMLInputElement | null;
      if (el) el.value = String(o.fMeasured);
    }
  } catch {
    /* */
  }
}

export function saveFlangeCalcInputs(
  overall: number,
  x: number,
  y: number,
  fMeasured: number | null,
): void {
  try {
    localStorage.setItem(
      FLANGE_CALC_KEY,
      JSON.stringify({
        schema: FLANGE_CALC_SCHEMA,
        overall,
        x,
        y,
        fMeasured,
      }),
    );
  } catch {
    /* */
  }
}

export function parseMm(id: string): number {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el) return NaN;
  const v = parseFloat(String(el.value).replace(",", "."));
  return Number.isFinite(v) ? v : NaN;
}

export function runFlangeCalc(): void {
  const overall = parseMm("flange-calc-overall-mm");
  const x = parseMm("flange-calc-x-mm");
  const y = parseMm("flange-calc-y-mm");
  const outL = document.getElementById("flange-calc-out-L");
  const outR = document.getElementById("flange-calc-out-R");
  const outF = document.getElementById("flange-calc-out-F");
  const outH = document.getElementById("flange-calc-out-h");
  const hint = document.getElementById("flange-calc-hint");
  const fMeasEl = document.getElementById("flange-calc-f-measured-mm") as HTMLInputElement | null;
  if (!outL || !outR || !outF) return;

  const fmt = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

  if (!Number.isFinite(overall) || !Number.isFinite(x) || !Number.isFinite(y)) {
    outL.textContent = "—";
    outR.textContent = "—";
    outF.textContent = "—";
    if (outH) outH.textContent = "—";
    if (hint) {
      hint.textContent = "";
      hint.className = "hint flange-calc-hint";
    }
    return;
  }

  let r: { L: number; R: number; F: number; h: number } | null = null;
  let err: string | null = null;
  try {
    const o = flangeOffsetsFromHubOverallWidth(overall, x, y);
    r = {
      L: o.leftFlangeOffsetMm,
      R: o.rightFlangeOffsetMm,
      F: o.flangeToFlangeMm,
      h: o.halfWidthMm,
    };
  } catch (e) {
    err =
      e instanceof Error
        ? e.message
        : "x or y is larger than half the hub width (would make L or R negative).";
  }

  if (err || !r) {
    outL.textContent = "—";
    outR.textContent = "—";
    outF.textContent = "—";
    if (outH) outH.textContent = "—";
    if (hint) {
      hint.textContent =
        err ||
        "Enter a positive hub width and non-negative x, y.";
      hint.className = "hint flange-calc-hint flange-calc-hint--error";
    }
    saveFlangeCalcInputs(overall, x, y, null);
    return;
  }

  outL.textContent = fmt(r.L);
  outR.textContent = fmt(r.R);
  outF.textContent = fmt(r.F);
  if (outH) outH.textContent = fmt(r.h);
  if (hint) {
    hint.className = "hint flange-calc-hint";
    let extra = "";
    if (fMeasEl && fMeasEl.value !== "") {
      const fm = parseFloat(String(fMeasEl.value).replace(",", "."));
      if (Number.isFinite(fm)) {
        const d = Math.abs(r.F - fm);
        if (d < 0.05) extra = " Measured F matches L+R within 0.05 mm.";
        else {
          extra = ` Δ(F): L+R is ${fmt(r.F)} mm vs measured F ${fmt(fm)} mm (diff ${fmt(d)} mm) — double-check x, y, or width.`;
        }
      }
    }
    hint.textContent =
      "L and R are distances from the wheel center plane (midway between hub outer faces) to each flange — same as the fields below." +
      extra;
  }
  const fm =
    fMeasEl && fMeasEl.value !== ""
      ? parseFloat(String(fMeasEl.value).replace(",", "."))
      : NaN;
  saveFlangeCalcInputs(
    overall,
    x,
    y,
    Number.isFinite(fm) ? fm : null,
  );
}

export function applyFlangeCalcToForm(): void {
  const overall = parseMm("flange-calc-overall-mm");
  const x = parseMm("flange-calc-x-mm");
  const y = parseMm("flange-calc-y-mm");
  let o;
  try {
    o = flangeOffsetsFromHubOverallWidth(overall, x, y);
  } catch {
    return;
  }
  const fmt = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
  const leftEl = document.getElementById("id_left_flange_offset_mm") as HTMLInputElement | null;
  const rightEl = document.getElementById("id_right_flange_offset_mm") as HTMLInputElement | null;
  if (leftEl) leftEl.value = fmt(o.leftFlangeOffsetMm);
  if (rightEl) rightEl.value = fmt(o.rightFlangeOffsetMm);
}
