import { describe, it, expect, beforeEach } from "vitest";
import {
  SAVED_BUILDS_KEY,
  FORM_SPOKE_KEY,
  FORM_TENSION_KEY,
  BUILD_PARAMS_KEY,
  FORM_SCHEMA,
} from "./keys";
import {
  addSavedBuild,
  applySavedBuild,
  deleteSavedBuild,
  getSavedBuild,
  listSavedBuilds,
} from "./savedBuilds";
import { saveFields } from "./formPersist";

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

describe("savedBuilds", () => {
  beforeEach(() => {
    globalThis.localStorage = ls();
  });

  it("adds and retrieves a build", () => {
    saveFields(FORM_SPOKE_KEY, { erd_mm: "599", spoke_count: "32" });
    const r = addSavedBuild("test wheel");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const list = listSavedBuilds();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("test wheel");
    expect(list[0].spokeFields.erd_mm).toBe("599");
    const g = getSavedBuild(list[0].id);
    expect(g?.tensionFields).toEqual({});
  });

  it("rejects empty snapshot", () => {
    const r = addSavedBuild("x");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toMatch(/Nothing to save/);
  });

  it("applySavedBuild restores keys", () => {
    saveFields(FORM_SPOKE_KEY, { erd_mm: "601" });
    saveFields(FORM_TENSION_KEY, { spoke_count: "28", tm1_chart: "a" });
    localStorage.setItem(BUILD_PARAMS_KEY, '{"schema":1,"erd_mm":601}');
    const add = addSavedBuild("both");
    expect(add.ok).toBe(true);
    if (!add.ok) return;
    localStorage.removeItem(FORM_SPOKE_KEY);
    localStorage.removeItem(FORM_TENSION_KEY);
    localStorage.removeItem(BUILD_PARAMS_KEY);
    expect(applySavedBuild(add.build.id)).toBe(true);
    const rawSpoke = localStorage.getItem(FORM_SPOKE_KEY);
    expect(rawSpoke).toBeTruthy();
    const o = JSON.parse(rawSpoke!) as {
      schema?: number;
      fields: Record<string, string>;
    };
    expect(o.schema).toBe(FORM_SCHEMA);
    expect(o.fields.erd_mm).toBe("601");
  });

  it("deleteSavedBuild removes entry", () => {
    saveFields(FORM_SPOKE_KEY, { erd_mm: "1" });
    const add = addSavedBuild("d");
    expect(add.ok).toBe(true);
    if (!add.ok) return;
    deleteSavedBuild(add.build.id);
    expect(listSavedBuilds()).toHaveLength(0);
    expect(localStorage.getItem(SAVED_BUILDS_KEY)).toContain('"builds":[]');
  });
});
