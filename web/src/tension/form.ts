import { maxCrosses } from "../math/spokeLength";
import { loadFields } from "../storage/formPersist";
import { FORM_TENSION_KEY } from "../storage/keys";
import { tensionKgf, TM1LookupError } from "../tm1/lookup";

export function captureTm1InputValues(
  form: HTMLFormElement,
  nSpokes: number,
): Record<string, string> {
  const fd = new FormData(form);
  const nh = nSpokes / 2;
  const o: Record<string, string> = {};
  for (let j = 0; j < nh; j++) {
    for (const side of ["left", "right"] as const) {
      const name = `${side}_${j}`;
      const v = fd.get(name);
      if (v != null) o[name] = String(v);
    }
  }
  return o;
}

export function readingsToInputValues(readings: number[]): Record<string, string> {
  const o: Record<string, string> = {};
  const nh = readings.length / 2;
  for (let j = 0; j < nh; j++) {
    o[`left_${j}`] = String(readings[2 * j]);
    o[`right_${j}`] = String(readings[2 * j + 1]);
  }
  return o;
}

export function resolveInitialSpokeCount(): number {
  const stored = loadFields(FORM_TENSION_KEY);
  if (stored?.spoke_count) {
    const v = parseInt(stored.spoke_count, 10);
    if (Number.isFinite(v) && v >= 12 && v <= 52 && v % 2 === 0) return v;
  }
  const q = new URLSearchParams(window.location.search).get("spoke_count");
  if (q) {
    const v = parseInt(q, 10);
    if (Number.isFinite(v) && v >= 12 && v <= 52 && v % 2 === 0) return v;
  }
  return 32;
}

export interface ParsedTension {
  readings: number[];
  tensionsKgf: number[];
  fieldErrors: Record<string, string>;
  nonFieldErrors: string[];
}

export function parseTensionForm(
  form: HTMLFormElement,
  n: number,
  chartId: string,
): ParsedTension {
  const nHalf = n / 2;
  const fd = new FormData(form);
  const readings: number[] = [];
  const fieldErrors: Record<string, string> = {};
  const nonFieldErrors: string[] = [];

  for (let i = 0; i < nHalf; i++) {
    for (const side of ["left", "right"] as const) {
      const name = `${side}_${i}`;
      const raw = fd.get(name);
      if (raw === null || raw === "") {
        fieldErrors[name] = "Enter a TM-1 reading.";
        return { readings: [], tensionsKgf: [], fieldErrors, nonFieldErrors };
      }
      const v = parseFloat(String(raw).replace(",", "."));
      if (!Number.isFinite(v) || v < 0 || v > 60) {
        fieldErrors[name] = "Invalid reading.";
        return { readings: [], tensionsKgf: [], fieldErrors, nonFieldErrors };
      }
      readings.push(v);
    }
  }

  const tensionsKgf: number[] = [];
  for (let i = 0; i < readings.length; i++) {
    try {
      tensionsKgf.push(tensionKgf(chartId, readings[i]));
    } catch (e) {
      const j = i;
      const fname = j % 2 === 0 ? `left_${j / 2}` : `right_${(j - 1) / 2}`;
      fieldErrors[fname] =
        e instanceof TM1LookupError ? e.message : String(e);
      return { readings: [], tensionsKgf: [], fieldErrors, nonFieldErrors };
    }
  }

  const hubCrossesRaw = fd.get("hub_crosses");
  if (hubCrossesRaw != null && String(hubCrossesRaw) !== "") {
    const hc = parseInt(String(hubCrossesRaw), 10);
    if (Number.isFinite(hc) && hc >= 0 && hc > maxCrosses(n)) {
      nonFieldErrors.push(
        `For ${n} spokes, crosses must be ≤ ${maxCrosses(n)} (tangential hole spacing).`,
      );
      return { readings: [], tensionsKgf: [], fieldErrors, nonFieldErrors };
    }
  }

  return { readings, tensionsKgf, fieldErrors, nonFieldErrors };
}
