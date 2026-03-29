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

/** Maps to optional hub/rim block only (tension spoke count stays on the tension form). */
const HUB_GEOM_PARAM_KEYS = [
  "erd_mm",
  "crosses",
  "left_flange_diameter_mm",
  "right_flange_diameter_mm",
  "left_flange_offset_mm",
  "right_flange_offset_mm",
  "flange_hole_diameter_mm",
  "nipple_correction_mm",
] as const;

export interface ApplyBuildParamsOptions {
  /**
   * Only set when the control’s current value is blank. Use after a full
   * tension restore so hub geometry can be filled from Spoke length storage
   * without clobbering other persisted fields.
   */
  onlyIfEmpty?: boolean;
  /** Apply hub/rim inputs only; does not change tension spoke count. */
  hubGeomOnly?: boolean;
}

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

function tensionFieldLooksEmpty(
  el: HTMLInputElement | HTMLSelectElement,
): boolean {
  return String(el.value ?? "").trim() === "";
}

/** Apply saved spoke build params to tension form fields (by id). */
export function applyBuildParamsToTensionForm(
  options?: ApplyBuildParamsOptions,
): boolean {
  const o = loadBuildParams();
  if (!o) return false;
  const onlyIfEmpty = options?.onlyIfEmpty ?? false;
  const hubGeomOnly = options?.hubGeomOnly ?? false;
  const keys: readonly string[] = hubGeomOnly
    ? HUB_GEOM_PARAM_KEYS
    : Object.keys(TENSION_MAP);
  let applied = false;
  for (const k of keys) {
    if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
    const formField = TENSION_MAP[k];
    if (!formField) continue;
    const el = document.getElementById(`id_${formField}`) as
      | HTMLInputElement
      | HTMLSelectElement
      | null;
    if (!el) continue;
    if (onlyIfEmpty && !tensionFieldLooksEmpty(el)) continue;
    const val = (o as unknown as Record<string, unknown>)[k];
    if (val === undefined || val === null) continue;
    el.value = String(val);
    applied = true;
  }
  return applied;
}
