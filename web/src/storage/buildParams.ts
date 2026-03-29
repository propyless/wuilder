import { BUILD_PARAMS_KEY, BUILD_PARAMS_SCHEMA } from "./keys";

export interface BuildParamsPayload {
  schema?: number;
  erd_mm: number;
  spoke_count: number;
  crosses: number;
  left_flange_diameter_mm: number;
  right_flange_diameter_mm: number;
  left_flange_offset_mm: number;
  right_flange_offset_mm: number;
  flange_hole_diameter_mm: number;
  nipple_correction_mm: number;
}

const TENSION_MAP: Record<string, string> = {
  erd_mm: "hub_erd_mm",
  spoke_count: "spoke_count",
  crosses: "hub_crosses",
  left_flange_diameter_mm: "hub_left_flange_pcd_mm",
  right_flange_diameter_mm: "hub_right_flange_pcd_mm",
  left_flange_offset_mm: "hub_left_offset_mm",
  right_flange_offset_mm: "hub_right_offset_mm",
  flange_hole_diameter_mm: "hub_flange_hole_diameter_mm",
  nipple_correction_mm: "hub_nipple_correction_mm",
};

export function saveBuildParams(payload: BuildParamsPayload): void {
  const body = { schema: BUILD_PARAMS_SCHEMA, ...payload };
  try {
    localStorage.setItem(BUILD_PARAMS_KEY, JSON.stringify(body));
  } catch {
    /* */
  }
}

export function loadBuildParams(): BuildParamsPayload | null {
  try {
    const raw = localStorage.getItem(BUILD_PARAMS_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as BuildParamsPayload & { schema?: number };
    if (!o || o.schema !== BUILD_PARAMS_SCHEMA) return null;
    return o;
  } catch {
    return null;
  }
}

export function clearBuildParams(): void {
  try {
    localStorage.removeItem(BUILD_PARAMS_KEY);
  } catch {
    /* */
  }
}

function setById(id: string, value: string | number | undefined): void {
  if (value === undefined || value === null) return;
  const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
  if (!el) return;
  el.value = String(value);
}

/** Apply saved spoke build params to tension form fields (by id). */
export function applyBuildParamsToTensionForm(): boolean {
  const o = loadBuildParams();
  if (!o) return false;
  let applied = false;
  for (const k of Object.keys(TENSION_MAP)) {
    if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
    const tid = `id_${TENSION_MAP[k]}`;
    setById(tid, (o as unknown as Record<string, unknown>)[k] as string | number);
    applied = true;
  }
  return applied;
}
