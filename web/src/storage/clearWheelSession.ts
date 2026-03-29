import {
  BUILD_PARAMS_KEY,
  FLANGE_CALC_KEY,
  FORM_SPOKE_KEY,
  FORM_TENSION_KEY,
} from "./keys";

/** Clears autosaved spoke & tension forms, hub handoff blob, and flange calc. Does not remove named saved builds. */
export function clearWheelSessionStorage(): void {
  for (const k of [
    FORM_SPOKE_KEY,
    FORM_TENSION_KEY,
    BUILD_PARAMS_KEY,
    FLANGE_CALC_KEY,
  ]) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* */
    }
  }
}

export const CLEAR_WHEEL_CONFIRM_MESSAGE =
  "Clear saved spoke & tension forms, hub build params, and flange offset calculator data in this browser? Named builds on the Saved builds page are kept.";

export function confirmAndClearWheelData(): void {
  if (!window.confirm(CLEAR_WHEEL_CONFIRM_MESSAGE)) return;
  clearWheelSessionStorage();
  window.location.reload();
}
