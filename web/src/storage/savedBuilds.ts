import { loadFields, saveFields } from "./formPersist";
import {
  BUILD_PARAMS_KEY,
  FLANGE_CALC_KEY,
  FORM_SPOKE_KEY,
  FORM_TENSION_KEY,
  SAVED_BUILDS_KEY,
  SAVED_BUILDS_SCHEMA,
} from "./keys";

export interface SavedBuild {
  id: string;
  name: string;
  createdAt: string;
  /** Serialized form persist fields for the spoke calculator. */
  spokeFields: Record<string, string>;
  /** Serialized form persist fields for the tension map. */
  tensionFields: Record<string, string>;
  /** Raw `localStorage` value for {@link BUILD_PARAMS_KEY}, or null if absent. */
  buildParamsJson: string | null;
  /** Raw `localStorage` value for {@link FLANGE_CALC_KEY}, or null if absent. */
  flangeCalcJson: string | null;
}

interface Envelope {
  schema: number;
  builds: SavedBuild[];
}

const MAX_BUILDS = 48;

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `b-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readEnvelope(): Envelope {
  try {
    const raw = localStorage.getItem(SAVED_BUILDS_KEY);
    if (!raw) return { schema: SAVED_BUILDS_SCHEMA, builds: [] };
    const o = JSON.parse(raw) as Envelope;
    if (!o || o.schema !== SAVED_BUILDS_SCHEMA || !Array.isArray(o.builds)) {
      return { schema: SAVED_BUILDS_SCHEMA, builds: [] };
    }
    return o;
  } catch {
    return { schema: SAVED_BUILDS_SCHEMA, builds: [] };
  }
}

function writeEnvelope(env: Envelope): void {
  try {
    localStorage.setItem(SAVED_BUILDS_KEY, JSON.stringify(env));
  } catch {
    /* quota */
  }
}

export function listSavedBuilds(): SavedBuild[] {
  return readEnvelope().builds;
}

export function getSavedBuild(id: string): SavedBuild | undefined {
  return readEnvelope().builds.find((b) => b.id === id);
}

function isNonEmptyFields(o: Record<string, string>): boolean {
  return Object.keys(o).some((k) => String(o[k] ?? "").trim() !== "");
}

/**
 * Store a snapshot of current spoke + tension forms (autosaved keys), hub build
 * params, and flange offset calculator state under a new named build.
 */
export function addSavedBuild(name: string):
  | { ok: true; build: SavedBuild }
  | { ok: false; reason: string } {
  const trimmed = name.trim() || "Saved build";
  const spokeFields = { ...(loadFields(FORM_SPOKE_KEY) ?? {}) };
  const tensionFields = { ...(loadFields(FORM_TENSION_KEY) ?? {}) };
  if (!isNonEmptyFields(spokeFields) && !isNonEmptyFields(tensionFields)) {
    return {
      ok: false,
      reason:
        "Nothing to save yet — change at least one field on Spokes or Tension (forms autosave in the browser).",
    };
  }
  const build: SavedBuild = {
    id: newId(),
    name: trimmed.slice(0, 120),
    createdAt: new Date().toISOString(),
    spokeFields,
    tensionFields,
    buildParamsJson: (() => {
      try {
        return localStorage.getItem(BUILD_PARAMS_KEY);
      } catch {
        return null;
      }
    })(),
    flangeCalcJson: (() => {
      try {
        return localStorage.getItem(FLANGE_CALC_KEY);
      } catch {
        return null;
      }
    })(),
  };
  const env = readEnvelope();
  env.builds = [build, ...env.builds].slice(0, MAX_BUILDS);
  writeEnvelope(env);
  return { ok: true, build };
}

export function deleteSavedBuild(id: string): void {
  const env = readEnvelope();
  env.builds = env.builds.filter((b) => b.id !== id);
  writeEnvelope(env);
}

function setOrRemoveItem(key: string, value: string | null): void {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* */
  }
}

/** Copy a saved build into the live autosave keys (spokes, tension, hub params, flange calc). */
export function applySavedBuild(id: string): boolean {
  const b = getSavedBuild(id);
  if (!b) return false;
  saveFields(FORM_SPOKE_KEY, b.spokeFields);
  saveFields(FORM_TENSION_KEY, b.tensionFields);
  setOrRemoveItem(BUILD_PARAMS_KEY, b.buildParamsJson);
  setOrRemoveItem(FLANGE_CALC_KEY, b.flangeCalcJson);
  return true;
}
