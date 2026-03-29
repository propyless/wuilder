import { escapeAttr } from "../util/escape";
import type { NippleRow } from "./nipples";
import { nipplePresetDimsText } from "./nipples";

export function wheelSizeOptions(selected: string): string {
  const opts = [
    `<option value="">— Select wheel size —</option>`,
    `<option value="700c-29"${selected === "700c-29" ? " selected" : ""}>700c / 29&quot; (BSD 622)</option>`,
    `<option value="27.5"${selected === "27.5" ? " selected" : ""}>27.5&quot; (BSD 584)</option>`,
    `<option value="26"${selected === "26" ? " selected" : ""}>26&quot; (BSD 559)</option>`,
  ];
  return opts.join("");
}

export function nippleSelectOptions(
  nipples: readonly NippleRow[],
  selectedId: string,
): string {
  const opts = [
    `<option value="">— None (hide diagrams) —</option>`,
    ...nipples.map((n) => {
      const dimsTitle = escapeAttr(nipplePresetDimsText(n));
      const sel = n.id === selectedId ? " selected" : "";
      return `<option value="${n.id}" title="${dimsTitle}"${sel}>${escapeAttr(n.name)}</option>`;
    }),
  ];
  return opts.join("");
}

export function flangePanelHtml(): string {
  return `
<details class="field-span flange-offset-calc-details">
  <summary class="flange-offset-calc-summary">Flange offset calculator (hub width &amp; x, y)</summary>
  <div class="flange-offset-calc-inner">
    <p class="hint">
      <strong>Center plane</strong> = halfway between the two outer hub faces (overall width, e.g. O.L.D.). Offsets <strong>L</strong> / <strong>R</strong> are each flange’s distance <strong>from that plane along the axle</strong> to the spoke hole circle — the same <em>w</em> used in spoke length and spoke-tension ratio.
      <strong>x</strong> = left outer face → left flange; <strong>y</strong> = right outer face → right flange; <strong>h</strong> = half overall width.
      Then <strong>L</strong> = <em>h</em> − <em>x</em>, <strong>R</strong> = <em>h</em> − <em>y</em>, <strong>F</strong> = <em>L</em> + <em>R</em> (flange-to-flange). Do not type <em>x</em> or <em>y</em> into the offset fields below unless that is what you really mean as center-plane distance (it usually is not).
      When all three inputs are valid, they are saved in your browser (localStorage) for next visit.
    </p>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 130" class="flange-offset-calc-svg" role="img" aria-label="Hub schematic: overall width, center line, x y L R F">
      <title>Hub width, center plane, and x y L R F</title>
      <rect x="36" y="48" width="348" height="28" rx="3" class="flange-calc-hub-body" />
      <line x1="210" y1="28" x2="210" y2="100" class="flange-calc-center-line" />
      <line x1="36" y1="40" x2="384" y2="40" stroke="#333" stroke-width="1" stroke-dasharray="4 3" />
      <text x="210" y="22" text-anchor="middle" class="flange-calc-svg-label">overall width</text>
      <line x1="88" y1="62" x2="88" y2="88" stroke="#1e4a8a" stroke-width="3" />
      <line x1="332" y1="62" x2="332" y2="88" stroke="#a85a18" stroke-width="3" />
      <text x="88" y="108" text-anchor="middle" class="flange-calc-svg-small">x</text>
      <text x="332" y="108" text-anchor="middle" class="flange-calc-svg-small">y</text>
      <text x="148" y="108" text-anchor="middle" class="flange-calc-svg-small">L</text>
      <text x="272" y="108" text-anchor="middle" class="flange-calc-svg-small">R</text>
      <text x="210" y="124" text-anchor="middle" class="flange-calc-svg-small">F = L + R</text>
    </svg>
    <div class="flange-offset-calc-grid">
      <div class="field flange-calc-field">
        <label for="flange-calc-overall-mm">Hub overall width (mm)</label>
        <input type="number" id="flange-calc-overall-mm" class="hub-geom-input" step="any" min="0" placeholder="e.g. 100" />
      </div>
      <div class="field flange-calc-field">
        <label for="flange-calc-x-mm">x — left face → left flange (mm)</label>
        <input type="number" id="flange-calc-x-mm" class="hub-geom-input" step="any" min="0" placeholder="e.g. 26.5" />
      </div>
      <div class="field flange-calc-field">
        <label for="flange-calc-y-mm">y — right face → right flange (mm)</label>
        <input type="number" id="flange-calc-y-mm" class="hub-geom-input" step="any" min="0" placeholder="e.g. 16.5" />
      </div>
      <div class="field flange-calc-field">
        <label for="flange-calc-f-measured-mm">Measured flange-to-flange F (mm, optional)</label>
        <input type="number" id="flange-calc-f-measured-mm" class="hub-geom-input" step="any" min="0" placeholder="Compare to L+R" />
      </div>
    </div>
    <dl class="flange-offset-calc-results">
      <div class="flange-offset-calc-result-row">
        <dt><em>h</em> (half width)</dt>
        <dd id="flange-calc-out-h">—</dd>
      </div>
      <div class="flange-offset-calc-result-row flange-offset-calc-result-lr">
        <dt>L → left offset field</dt>
        <dd id="flange-calc-out-L">—</dd>
      </div>
      <div class="flange-offset-calc-result-row flange-offset-calc-result-lr">
        <dt>R → right offset field</dt>
        <dd id="flange-calc-out-R">—</dd>
      </div>
      <div class="flange-offset-calc-result-row">
        <dt>F = L + R</dt>
        <dd id="flange-calc-out-F">—</dd>
      </div>
    </dl>
    <p class="hint flange-calc-hint" id="flange-calc-hint"></p>
    <p class="flange-offset-calc-actions">
      <button type="button" class="btn" id="flange-calc-apply">Copy L / R into form below</button>
    </p>
  </div>
</details>`;
}
