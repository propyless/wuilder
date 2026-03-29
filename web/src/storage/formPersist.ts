import { FORM_SCHEMA } from "./keys";

const DEBOUNCE_MS = 400;

export interface PersistEnvelope {
  schema: number;
  fields: Record<string, string>;
}

function escName(name: string): string {
  return String(name).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function loadFields(key: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const o = JSON.parse(raw) as PersistEnvelope;
    if (!o || o.schema !== FORM_SCHEMA || !o.fields || typeof o.fields !== "object") {
      return null;
    }
    return o.fields;
  } catch {
    return null;
  }
}

export function saveFields(key: string, fields: Record<string, string>): void {
  try {
    localStorage.setItem(key, JSON.stringify({ schema: FORM_SCHEMA, fields }));
  } catch {
    /* quota */
  }
}

/**
 * Serializes all named, enabled fields under the form. Uses the DOM instead of
 * `new FormData(form)` so values inside a closed `<details>` (e.g. tension hub
 * geometry) are still persisted — some browsers omit those from FormData.
 */
export function captureForm(form: HTMLFormElement): Record<string, string> {
  const fields: Record<string, string> = {};
  form
    .querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input[name], select[name], textarea[name]")
    .forEach((el) => {
      if (el.disabled) return;
      const name = el.getAttribute("name");
      if (!name) return;
      if (el instanceof HTMLInputElement) {
        const t = el.type;
        if (
          t === "submit" ||
          t === "button" ||
          t === "reset" ||
          t === "image" ||
          t === "file"
        ) {
          return;
        }
        if (t === "radio") {
          if (el.checked) fields[name] = el.value;
          return;
        }
        if (t === "checkbox") {
          fields[name] = el.checked ? el.value || "on" : "";
          return;
        }
      }
      fields[name] = el.value;
    });
  return fields;
}

export function applyFields(
  form: HTMLFormElement,
  fields: Record<string, string>,
): void {
  for (const name of Object.keys(fields)) {
    const val = fields[name];
    const nodes = form.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      `[name="${escName(name)}"]`,
    );
    if (!nodes.length) continue;
    const first = nodes[0];
    if (first instanceof HTMLInputElement && first.type === "radio") {
      for (let i = 0; i < nodes.length; i++) {
        const inp = nodes[i] as HTMLInputElement;
        inp.checked = String(inp.value) === String(val);
      }
      continue;
    }
    if (first instanceof HTMLInputElement && first.type === "checkbox") {
      first.checked = val === "on" || val === "true" || val === "1";
      continue;
    }
    (first as HTMLInputElement | HTMLSelectElement).value =
      val == null ? "" : String(val);
  }
}

export interface AttachResult {
  restored: boolean;
}

export function attachFormPersist(
  form: HTMLFormElement,
  key: string,
  options: { restore: boolean; onSpokeCountMismatch?: (want: number) => void },
): AttachResult {
  let restored = false;
  if (options.restore) {
    const stored = loadFields(key);
    if (stored) {
      applyFields(form, stored);
      const sc = stored.spoke_count;
      if (sc != null && options.onSpokeCountMismatch) {
        const want = parseInt(String(sc), 10);
        if (Number.isFinite(want)) options.onSpokeCountMismatch(want);
      }
      restored = true;
    }
  } else {
    saveFields(key, captureForm(form));
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  function scheduleSave() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      saveFields(key, captureForm(form));
    }, DEBOUNCE_MS);
  }

  form.addEventListener("input", scheduleSave);
  form.addEventListener("change", scheduleSave);
  form.addEventListener("submit", () => {
    if (timer) clearTimeout(timer);
    saveFields(key, captureForm(form));
  });

  return { restored };
}
