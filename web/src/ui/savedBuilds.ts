import { confirmAndClearWheelData } from "../storage/clearWheelSession";
import {
  addSavedBuild,
  applySavedBuild,
  deleteSavedBuild,
  getSavedBuild,
  listSavedBuilds,
} from "../storage/savedBuilds";
import { escapeHtml } from "../util/escape";

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function hasSpokeData(b: { spokeFields: Record<string, string> }): boolean {
  return Object.keys(b.spokeFields).some(
    (k) => String(b.spokeFields[k] ?? "").trim() !== "",
  );
}

function hasTensionData(b: { tensionFields: Record<string, string> }): boolean {
  return Object.keys(b.tensionFields).some(
    (k) => String(b.tensionFields[k] ?? "").trim() !== "",
  );
}

export function renderSavedBuilds(container: HTMLElement): void {
  const builds = listSavedBuilds();

  container.innerHTML = `
<div class="saved-builds-page prose">
  <h1>Saved builds</h1>
  <p class="lede">Named snapshots of your <strong>Spoke length</strong> and <strong>Tension</strong> forms (plus hub build params and flange offset calculator data when present). Data stays in your browser only.</p>
  <p class="hint">Forms autosave a few hundred ms after you edit. Visit each tool or edit both before saving so the snapshot is complete.</p>
  <section class="saved-builds-save-panel" aria-label="Save current forms">
    <h2 class="tension-stat-block-title">Save current</h2>
    <form class="saved-builds-save-form" id="saved-builds-save-form">
      <div class="saved-builds-save-row">
        <label for="saved-build-name">Name</label>
        <input type="text" id="saved-build-name" name="name" maxlength="120" placeholder="e.g. rear Hunt 32h" autocomplete="off" />
        <button type="submit" class="btn">Save</button>
        <button type="button" class="btn btn--clear btn-clear-session">Clear</button>
      </div>
    </form>
    <p class="hint saved-builds-status" id="saved-builds-status" role="status" aria-live="polite"></p>
  </section>

  <section class="saved-builds-list-section" aria-label="Saved builds list">
    <h2 class="tension-stat-block-title">Your builds</h2>
    <p class="hint"><strong>Load</strong> restores everything stored in that snapshot (spoke form, tension form, hub params, flange calc when saved) and opens Spokes.</p>
    ${
      builds.length === 0
        ? `<p class="hint" id="saved-builds-empty">No saved builds yet.</p>`
        : `<div class="saved-builds-table-wrap">
      <table class="saved-builds-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Saved</th>
            <th scope="col">Contents</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody id="saved-builds-tbody">
          ${builds
            .map((b) => {
              const bits = [
                hasSpokeData(b) ? "Spokes" : null,
                hasTensionData(b) ? "Tension" : null,
                b.buildParamsJson ? "Hub params" : null,
                b.flangeCalcJson ? "Flange calc" : null,
              ].filter(Boolean);
              return `<tr data-build-id="${escapeHtml(b.id)}">
            <td>${escapeHtml(b.name)}</td>
            <td>${escapeHtml(formatWhen(b.createdAt))}</td>
            <td>${escapeHtml(bits.length ? bits.join(" · ") : "—")}</td>
            <td class="saved-builds-actions">
              <button type="button" class="btn btn--small saved-build-load">Load</button>
              <button type="button" class="btn btn--small btn--danger saved-build-delete">Delete</button>
            </td>
          </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>`
    }
  </section>
</div>`;

  container.querySelectorAll(".btn-clear-session").forEach((btn) => {
    btn.addEventListener("click", () => confirmAndClearWheelData());
  });

  const statusEl = container.querySelector("#saved-builds-status") as HTMLElement;
  const saveForm = container.querySelector("#saved-builds-save-form") as HTMLFormElement;
  const nameInput = container.querySelector("#saved-build-name") as HTMLInputElement;

  function setStatus(msg: string, isError = false): void {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.classList.toggle("saved-builds-status--error", isError);
  }

  saveForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput?.value ?? "";
    const result = addSavedBuild(name);
    if (!result.ok) {
      setStatus(result.reason, true);
      return;
    }
    setStatus(`Saved “${result.build.name}”.`, false);
    if (nameInput) nameInput.value = "";
    renderSavedBuilds(container);
  });

  container.querySelectorAll("tr[data-build-id]").forEach((row) => {
    const id = row.getAttribute("data-build-id");
    if (!id) return;

    row.querySelector(".saved-build-load")?.addEventListener("click", () => {
      if (!applySavedBuild(id)) {
        setStatus("Could not load that build.", true);
        return;
      }
      setStatus("Loaded. Opening Spokes…", false);
      window.location.hash = "#/spokes";
    });

    row.querySelector(".saved-build-delete")?.addEventListener("click", () => {
      if (!window.confirm(`Delete saved build “${getSavedBuild(id)?.name ?? id}”?`)) return;
      deleteSavedBuild(id);
      renderSavedBuilds(container);
      const freshStatus = container.querySelector("#saved-builds-status") as HTMLElement | null;
      if (freshStatus) {
        freshStatus.textContent = "Deleted.";
        freshStatus.classList.remove("saved-builds-status--error");
      }
    });
  });
}
