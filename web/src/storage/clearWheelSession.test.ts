import { describe, it, expect, beforeEach } from "vitest";
import {
  BUILD_PARAMS_KEY,
  FLANGE_CALC_KEY,
  FORM_SPOKE_KEY,
  FORM_TENSION_KEY,
  SAVED_BUILDS_KEY,
} from "./keys";
import { clearWheelSessionStorage } from "./clearWheelSession";

describe("clearWheelSessionStorage", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    globalThis.localStorage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => {
        store.set(k, v);
      },
      removeItem: (k) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      length: 0,
      key: () => null,
    } as Storage;
  });

  it("removes wheel session keys only", () => {
    store.set(FORM_SPOKE_KEY, "{}");
    store.set(FORM_TENSION_KEY, "{}");
    store.set(BUILD_PARAMS_KEY, "{}");
    store.set(FLANGE_CALC_KEY, "{}");
    const savedBlob = '{"schema":1,"builds":[]}';
    store.set(SAVED_BUILDS_KEY, savedBlob);
    clearWheelSessionStorage();
    expect(store.get(FORM_SPOKE_KEY)).toBeUndefined();
    expect(store.get(FORM_TENSION_KEY)).toBeUndefined();
    expect(store.get(BUILD_PARAMS_KEY)).toBeUndefined();
    expect(store.get(FLANGE_CALC_KEY)).toBeUndefined();
    expect(store.get(SAVED_BUILDS_KEY)).toBe(savedBlob);
  });
});
