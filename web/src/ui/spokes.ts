import nipplesDoc from "../data/nipples.json";
import { buildSpokeResults, maxCrosses } from "../math/spokeLength";
import { computeNippleFit } from "../section/nippleFit";
import {
  buildSectionDetail,
  buildSectionLayout,
  type NippleLike,
} from "../section/layout";
import { renderSectionDetailHtml } from "../section/sectionHtml";
import { saveBuildParams, type BuildParamsPayload } from "../storage/buildParams";
import { FORM_SPOKE_KEY } from "../storage/keys";
import { attachFormPersist, loadFields } from "../storage/formPersist";
import {
  applyFlangeCalcToForm,
  loadFlangeCalcInputs,
  runFlangeCalc,
} from "../storage/flangeCalc";

interface NippleRow extends NippleLike {
  id: string;
  name: string;
}

interface NipplesFile {
  nipples: NippleRow[];
}

const NIPPLES = (nipplesDoc as NipplesFile).nipples;

function nippleSelectOptions(selectedId: string): string {
  const opts = [
    `<option value="">— None (hide diagrams) —</option>`,
    ...NIPPLES.map(
      (n) =>
        `<option value="${n.id}"${n.id === selectedId ? " selected" : ""}>${escapeAttr(n.name)}</option>`,
    ),
  ];
  return opts.join("");
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function findNipple(id: string): NippleRow | undefined {
  return NIPPLES.find((n) => n.id === id);
}

const LENGTH_COLORS = [
  "#1b6b5c",
  "#b85c14",
  "#4a5a9c",
  "#7a3e6a",
  "#6b7c3a",
  "#c44f4f",
  "#2c6a8f",
  "#8f4725",
];

function spokeOptions(selected: number): string {
  const opts: string[] = [];
  for (let n = 12; n <= 52; n += 2) {
    opts.push(
      `<option value="${n}"${n === selected ? " selected" : ""}>${n}</option>`,
    );
  }
  return opts.join("");
}

function lengthKey(mm: number): number {
  return Math.round(mm * 10) / 10;
}

function flangePanelHtml(): string {
  return `
<details class="field-span flange-offset-calc-details">
  <summary class="flange-offset-calc-summary">Flange offset calculator (hub width &amp; x, y)</summary>
  <div class="flange-offset-calc-inner">
    <p class="hint">
      Same convention as many hub sheets: <strong>overall width</strong> is the full span between outer faces (e.g. locknut to locknut).
      <strong>x</strong> = from the <strong>left</strong> face to the <strong>left</strong> flange (hole circle center);
      <strong>y</strong> = from the <strong>right</strong> face to the <strong>right</strong> flange.
      Center plane = midway between those faces. Then <strong>L</strong> = <em>h</em> − <em>x</em>, <strong>R</strong> = <em>h</em> − <em>y</em>, <strong>F</strong> = <em>L</em> + <em>R</em> (flange-to-flange).
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

function parseForm(form: HTMLFormElement): Record<string, string> {
  const fd = new FormData(form);
  const o: Record<string, string> = {};
  fd.forEach((v, k) => {
    o[k] = String(v);
  });
  return o;
}

function validateAndCompute(form: HTMLFormElement): void {
  const errEl = form.querySelector("#spoke-form-errors") as HTMLElement;
  const resultsCol = document.querySelector(
    ".spoke-page-results-col",
  ) as HTMLElement;
  errEl.textContent = "";
  errEl.style.display = "none";

  const o = parseForm(form);
  const erd = parseFloat(o.erd_mm);
  const sc = parseInt(o.spoke_count, 10);
  const crosses = parseInt(o.crosses, 10);
  const lPcd = parseFloat(o.left_flange_diameter_mm);
  const rPcd = parseFloat(o.right_flange_diameter_mm);
  const lOff = parseFloat(o.left_flange_offset_mm);
  const rOff = parseFloat(o.right_flange_offset_mm);
  const hole = o.flange_hole_diameter_mm === "" ? 0 : parseFloat(o.flange_hole_diameter_mm);
  const nip = o.nipple_correction_mm === "" ? 0 : parseFloat(o.nipple_correction_mm);
  const rot = o.rotation_deg === "" ? 0 : parseFloat(o.rotation_deg);

  const errors: string[] = [];
  if (!Number.isFinite(erd) || erd < 200 || erd > 700) {
    errors.push("ERD must be between 200 and 700 mm.");
  }
  if (!Number.isFinite(sc) || sc < 12 || sc > 52 || sc % 2) {
    errors.push("Invalid spoke count.");
  }
  if (!Number.isFinite(crosses) || crosses < 0) {
    errors.push("Crosses must be a non-negative integer.");
  }
  if (Number.isFinite(sc) && Number.isFinite(crosses)) {
    const lim = maxCrosses(sc);
    if (crosses > lim) {
      errors.push(
        `For ${sc} spokes, crosses must be ≤ ${lim} (tangential hole spacing).`,
      );
    }
  }
  if (!Number.isFinite(lPcd) || lPcd < 20 || lPcd > 200) {
    errors.push("Left flange PCD must be between 20 and 200 mm.");
  }
  if (!Number.isFinite(rPcd) || rPcd < 20 || rPcd > 200) {
    errors.push("Right flange PCD must be between 20 and 200 mm.");
  }
  if (!Number.isFinite(lOff) || lOff < 0 || lOff > 120) {
    errors.push("Left flange offset must be between 0 and 120 mm.");
  }
  if (!Number.isFinite(rOff) || rOff < 0 || rOff > 120) {
    errors.push("Right flange offset must be between 0 and 120 mm.");
  }
  if (o.flange_hole_diameter_mm !== "" && (!Number.isFinite(hole) || hole < 0 || hole > 10)) {
    errors.push("Hub hole diameter must be between 0 and 10 mm.");
  }
  if (o.nipple_correction_mm !== "" && !Number.isFinite(nip)) {
    errors.push("Nipple correction must be a number.");
  }
  if (o.rotation_deg !== "" && !Number.isFinite(rot)) {
    errors.push("Rotation must be a number.");
  }

  const nippleId = (o.nipple || "").trim();
  const rimWStr = o.rim_inner_width_mm ?? "";
  const rimOuterWStr = o.rim_outer_width_mm ?? "";
  const rimDStr = o.rim_well_depth_mm ?? "";
  const iwdStr = o.rim_inner_wall_depth_mm ?? "";
  let rimInnerW: number | null = null;
  let rimOuterW: number | null = null;
  let rimWellD: number | null = null;
  if (rimWStr !== "") {
    const iw = parseFloat(rimWStr.replace(",", "."));
    if (!Number.isFinite(iw) || iw < 5 || iw > 80) {
      errors.push("Rim inner width must be between 5 and 80 mm.");
    } else {
      rimInnerW = iw;
    }
  }
  if (rimDStr !== "") {
    const wd = parseFloat(rimDStr.replace(",", "."));
    if (!Number.isFinite(wd) || wd < 2 || wd > 60) {
      errors.push("Rim depth must be between 2 and 60 mm.");
    } else {
      rimWellD = wd;
    }
  }
  if (rimOuterWStr !== "") {
    const ow = parseFloat(rimOuterWStr.replace(",", "."));
    if (!Number.isFinite(ow) || ow < 10 || ow > 100) {
      errors.push("Rim outer width must be between 10 and 100 mm.");
    } else {
      rimOuterW = ow;
    }
  }
  if (rimInnerW != null && rimOuterW != null && rimOuterW < rimInnerW) {
    errors.push("Rim outer width must be greater than or equal to rim inner width.");
  }
  const spokeThreadStr = o.spoke_thread_length_mm ?? "";
  let spokeThread = 0;
  if (spokeThreadStr !== "") {
    spokeThread = parseFloat(spokeThreadStr.replace(",", "."));
    if (!Number.isFinite(spokeThread) || spokeThread < 0 || spokeThread > 50) {
      errors.push("Spoke thread length must be between 0 and 50 mm.");
    }
  }
  if (nippleId) {
    if (!findNipple(nippleId)) {
      errors.push("Unknown nipple preset.");
    } else if (
      spokeThread > 0 &&
      (rimInnerW == null || rimWellD == null)
    ) {
      errors.push(
        "Enter rim inner width and rim depth to draw the spoke-tip diagram (or set spoke thread length to 0).",
      );
    }
  }
  if (iwdStr !== "") {
    const iwd = parseFloat(iwdStr.replace(",", "."));
    if (!Number.isFinite(iwd) || iwd < 1 || iwd > 58) {
      errors.push("Inner wall depth must be between 1 and 58 mm.");
    } else if (
      rimWellD != null &&
      Number.isFinite(iwd) &&
      iwd >= rimWellD
    ) {
      errors.push("Inner wall depth must be less than the total rim depth.");
    }
  }
  const orderedStr = o.ordered_spoke_length_mm ?? "";
  if (orderedStr !== "") {
    const ol = parseFloat(orderedStr.replace(",", "."));
    if (!Number.isFinite(ol) || ol < 100 || ol > 400) {
      errors.push("Ordered spoke length must be between 100 and 400 mm.");
    }
  }

  if (errors.length) {
    errEl.textContent = errors.join(" ");
    errEl.style.display = "block";
    if (resultsCol) {
      resultsCol.innerHTML = `<div class="spoke-page-results-placeholder prose"><p class="hint">Fix the form and use <strong>Calculate</strong> again.</p></div>`;
    }
    return;
  }

  const rotationRad = (rot * Math.PI) / 180;
  const spokes = buildSpokeResults({
    erdMm: erd,
    spokeCount: sc,
    crosses,
    leftFlangeRadiusMm: lPcd / 2,
    rightFlangeRadiusMm: rPcd / 2,
    leftFlangeOffsetMm: lOff,
    rightFlangeOffsetMm: rOff,
    flangeHoleDiameterMm: hole,
    nippleCorrectionMm: nip,
    rotationRad,
  });

  const uniqueLengths = [...new Set(spokes.map((s) => lengthKey(s.lengthMm)))].sort(
    (a, b) => a - b,
  );
  const colorByLength: Record<number, string> = {};
  uniqueLengths.forEach((ln, i) => {
    colorByLength[ln] = LENGTH_COLORS[i % LENGTH_COLORS.length];
  });

  const leftSpokes = spokes.filter((s) => s.side === "left");
  const rightSpokes = spokes.filter((s) => s.side === "right");
  const summary = [
    {
      sideLabel: "Left",
      lengthMm: lengthKey(leftSpokes[0].lengthMm),
      count: leftSpokes.length,
      color: colorByLength[lengthKey(leftSpokes[0].lengthMm)],
    },
    {
      sideLabel: "Right",
      lengthMm: lengthKey(rightSpokes[0].lengthMm),
      count: rightSpokes.length,
      color: colorByLength[lengthKey(rightSpokes[0].lengthMm)],
    },
  ];

  const cx = 120;
  const cy = 120;
  const rimR = 95;
  const avgPcd = (lPcd + rPcd) / 2;
  const hubR = rimR * (avgPcd / erd);
  const displayTwist = -Math.PI / 2;

  const spokeLines = spokes
    .map((s) => {
      const lk = lengthKey(s.lengthMm);
      const phiR = s.rimAngleRad + displayTwist;
      const phiH = s.hubAngleRad + displayTwist;
      const x1 = cx + rimR * Math.cos(phiR);
      const y1 = cy + rimR * Math.sin(phiR);
      const x2 = cx + hubR * Math.cos(phiH);
      const y2 = cy + hubR * Math.sin(phiH);
      return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${colorByLength[lk]}" stroke-width="1.6" stroke-linecap="round" />`;
    })
    .join("\n");

  const payload: BuildParamsPayload = {
    erd_mm: erd,
    spoke_count: sc,
    crosses,
    left_flange_diameter_mm: lPcd,
    right_flange_diameter_mm: rPcd,
    left_flange_offset_mm: lOff,
    right_flange_offset_mm: rOff,
    flange_hole_diameter_mm: hole,
    nipple_correction_mm: nip,
  };
  saveBuildParams(payload);

  let sectionPanelsHtml = "";
  if (nippleId && rimInnerW != null && rimWellD != null && spokeThread > 0) {
    const nipRow = findNipple(nippleId);
    if (nipRow) {
      const nippleShape: NippleLike = {
        headDiameterMm: nipRow.headDiameterMm,
        headHeightMm: nipRow.headHeightMm,
        bodyLengthMm: nipRow.bodyLengthMm,
        shankDiameterMm: nipRow.shankDiameterMm,
        internalThreadLengthMm: nipRow.internalThreadLengthMm,
      };
      const side = o.section_side === "left" ? "left" : "right";
      try {
        const diagram = buildSectionLayout(
          {
            erdMm: erd,
            innerWidthMm: rimInnerW,
            wellDepthMm: rimWellD,
          },
          {
            leftFlangePcdMm: lPcd,
            rightFlangePcdMm: rPcd,
            leftFlangeOffsetMm: lOff,
            rightFlangeOffsetMm: rOff,
          },
          nippleShape,
          {
            side,
            spokeCount: sc,
            crosses,
            flangeHoleDiameterMm: hole,
            nippleCorrectionMm: nip,
          },
        );
        const orderedRaw = o.ordered_spoke_length_mm ?? "";
        const orderedLen =
          orderedRaw === ""
            ? diagram.spokeLengthMm
            : parseFloat(orderedRaw.replace(",", "."));
        const fit = computeNippleFit({
          calculatedSpokeLengthMm: diagram.spokeLengthMm,
          orderedSpokeLengthMm: orderedLen,
          nippleBodyLengthMm: nipRow.bodyLengthMm,
          internalThreadLengthMm: nipRow.internalThreadLengthMm,
          spokeThreadLengthMm: spokeThread,
          wellDepthMm: rimWellD,
        });
        const iwdParsed =
          iwdStr !== ""
            ? parseFloat(iwdStr.replace(",", "."))
            : undefined;
        const detail = buildSectionDetail(nippleShape, {
          wellDepthMm: rimWellD,
          innerWidthMm: rimInnerW,
          outerWidthMm: rimOuterW ?? undefined,
          tipFromSeatMm: fit.tipFromSeatMm,
          spokeThreadLengthMm: spokeThread,
          innerWallDepthMm:
            iwdParsed !== undefined && Number.isFinite(iwdParsed)
              ? iwdParsed
              : null,
        });
        sectionPanelsHtml = renderSectionDetailHtml(detail, fit);
      } catch (e) {
        sectionPanelsHtml = `<p class="hint prose">Spoke tip diagram could not be drawn: ${e instanceof Error ? e.message : String(e)}</p>`;
      }
    }
  }

  if (resultsCol) {
    const [leftRow, rightRow] = summary;
    resultsCol.innerHTML = `
      <section class="results prose">
        <div class="tension-side-averages spoke-page-lengths-card" role="region" aria-label="Spoke lengths by side">
          <div class="tension-stat-block-title">Spoke lengths</div>
          <div class="tension-stat-dual">
            <div class="tension-stat-dual-item tension-stat-dual-left">
              <span class="tension-stat-side">${leftRow.sideLabel}</span>
              <span class="tension-stat-num">${leftRow.lengthMm}</span>
              <span class="tension-stat-unit">mm</span>
              <span class="spoke-length-meta">${leftRow.count} spokes</span>
              <span class="swatch spoke-length-swatch" style="background:${leftRow.color}" title="Wheel map color"></span>
            </div>
            <div class="tension-stat-dual-divider" aria-hidden="true"></div>
            <div class="tension-stat-dual-item tension-stat-dual-right">
              <span class="tension-stat-side">${rightRow.sideLabel}</span>
              <span class="tension-stat-num">${rightRow.lengthMm}</span>
              <span class="tension-stat-unit">mm</span>
              <span class="spoke-length-meta">${rightRow.count} spokes</span>
              <span class="swatch spoke-length-swatch" style="background:${rightRow.color}" title="Wheel map color"></span>
            </div>
          </div>
        </div>
      </section>
      <section class="wheel-panel spoke-page-wheel-panel">
        <div class="wheel-wrap spoke-page-wheel-wrap">
          <div class="tension-stat-block-title">Spoke lengths</div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="Spokes from rim to hub; colors match length groups">
            <circle cx="${cx}" cy="${cy}" r="${hubR}" class="wheel-hub" />
            <circle cx="${cx}" cy="${cy}" r="${rimR}" class="wheel-rim" />
            ${spokeLines}
          </svg>
        </div>
      </section>
      ${sectionPanelsHtml}`;
  }
}

export function renderSpokes(container: HTMLElement): void {
  const stored = loadFields(FORM_SPOKE_KEY);
  const initialSpokes = stored?.spoke_count
    ? parseInt(stored.spoke_count, 10)
    : 32;
  const sc = Number.isFinite(initialSpokes) ? initialSpokes : 32;

  container.innerHTML = `
  <div class="spoke-page-layout">
    <div class="spoke-page-prose prose">
      <h1>Spoke length</h1>
      <p class="lede">ERD, hub PCDs, <strong>left/right flange offsets</strong> (type them in or use the <strong>Flange offset calculator</strong> from overall width and <em>x</em> / <em>y</em>), crosses. Wheel map: <strong>odd</strong> spoke numbers (#1, 3, …) = <strong>left</strong>; <strong>even</strong> (#2, 4, …) = <strong>right</strong> — same order as the tension map.</p>
      <p class="hint">After building, <a href="#/tension">plot TM-1 readings</a> in the same spoke order. Your inputs are saved in the browser and restored after a refresh.</p>
    </div>
    <div class="spoke-page-form-col">
      <form class="form-grid spoke-page-form-grid" id="spoke-calculator-form" novalidate data-form-persist-key="${FORM_SPOKE_KEY}">
        <div id="spoke-form-errors" class="form-errors" style="display:none"></div>
        <div class="field">
          <label for="id_erd_mm">ERD (mm)</label>
          <input type="number" name="erd_mm" id="id_erd_mm" required min="200" max="700" step="any" />
          <p class="hint">Effective rim diameter at the nipple seat.</p>
        </div>
        <div class="field">
          <label for="id_spoke_count">Spokes</label>
          <select name="spoke_count" id="id_spoke_count">${spokeOptions(sc)}</select>
        </div>
        <div class="field">
          <label for="id_crosses">Crosses</label>
          <input type="number" name="crosses" id="id_crosses" required min="0" max="20" value="3" step="1" />
          <p class="hint">Per side; same pattern on left and right.</p>
        </div>
        <div class="field">
          <label for="id_left_flange_diameter_mm">Left flange PCD (mm)</label>
          <input type="number" name="left_flange_diameter_mm" id="id_left_flange_diameter_mm" required min="20" max="200" step="any" />
        </div>
        <div class="field">
          <label for="id_right_flange_diameter_mm">Right flange PCD (mm)</label>
          <input type="number" name="right_flange_diameter_mm" id="id_right_flange_diameter_mm" required min="20" max="200" step="any" />
        </div>
        ${flangePanelHtml()}
        <div class="field">
          <label for="id_left_flange_offset_mm">Left flange offset (mm)</label>
          <input type="number" name="left_flange_offset_mm" id="id_left_flange_offset_mm" required min="0" max="120" step="any" />
        </div>
        <div class="field">
          <label for="id_right_flange_offset_mm">Right flange offset (mm)</label>
          <input type="number" name="right_flange_offset_mm" id="id_right_flange_offset_mm" required min="0" max="120" step="any" />
        </div>
        <div class="field">
          <label for="id_flange_hole_diameter_mm">Hub spoke hole diameter (mm)</label>
          <input type="number" name="flange_hole_diameter_mm" id="id_flange_hole_diameter_mm" min="0" max="10" step="any" value="0" />
        </div>
        <div class="field">
          <label for="id_nipple_correction_mm">Nipple correction (mm)</label>
          <input type="number" name="nipple_correction_mm" id="id_nipple_correction_mm" step="any" value="0" />
        </div>
        <div class="field">
          <label for="id_rotation_deg">Rotation (deg)</label>
          <input type="number" name="rotation_deg" id="id_rotation_deg" step="any" value="0" />
          <p class="hint">Rotate the diagram CCW; does not change lengths.</p>
        </div>
        <fieldset class="field-span section-fieldset">
          <legend>Spoke tip detail (optional)</legend>
          <p class="hint">Choose a nipple preset, rim cavity dimensions, and a positive <strong>spoke thread length</strong> to show the zoomed spoke-tip diagram.</p>
          <div class="form-grid">
            <div class="field">
              <label for="id_section_side">Show spoke to</label>
              <select name="section_side" id="id_section_side">
                <option value="right">Right flange</option>
                <option value="left">Left flange</option>
              </select>
            </div>
            <div class="field">
              <label for="id_rim_inner_width_mm">Rim inner width (mm)</label>
              <input type="number" name="rim_inner_width_mm" id="id_rim_inner_width_mm" min="5" max="80" step="any" />
            </div>
            <div class="field">
              <label for="id_rim_outer_width_mm">Rim outer width (mm)</label>
              <input type="number" name="rim_outer_width_mm" id="id_rim_outer_width_mm" min="10" max="100" step="any" />
              <p class="hint">Optional; if blank, outer width follows inner width.</p>
            </div>
            <div class="field">
              <label for="id_rim_well_depth_mm">Rim depth (mm)</label>
              <input type="number" name="rim_well_depth_mm" id="id_rim_well_depth_mm" min="2" max="60" step="any" />
            </div>
            <div class="field">
              <label for="id_rim_inner_wall_depth_mm">Inner wall depth (mm)</label>
              <input type="number" name="rim_inner_wall_depth_mm" id="id_rim_inner_wall_depth_mm" min="1" max="58" step="any" />
            </div>
            <div class="field">
              <label for="id_nipple">Nipple</label>
              <select name="nipple" id="id_nipple">${nippleSelectOptions("")}</select>
            </div>
            <div class="field">
              <label for="id_spoke_thread_length_mm">Spoke thread length (mm)</label>
              <input type="number" name="spoke_thread_length_mm" id="id_spoke_thread_length_mm" min="0" max="50" step="any" value="16" />
              <p class="hint">Must be greater than <strong>0</strong> to draw the spoke-tip diagram.</p>
            </div>
            <div class="field">
              <label for="id_ordered_spoke_length_mm">Ordered spoke length (mm)</label>
              <input type="number" name="ordered_spoke_length_mm" id="id_ordered_spoke_length_mm" min="100" max="400" step="any" />
              <p class="hint">Leave blank to use calculated length for this side.</p>
            </div>
          </div>
        </fieldset>
        <div class="field field-span">
          <button type="submit" class="btn">Calculate</button>
        </div>
      </form>
    </div>
    <div class="spoke-page-results-col">
      <div class="spoke-page-results-placeholder prose">
        <p class="hint">Use <strong>Calculate</strong> to see spoke lengths and the wheel map here.</p>
      </div>
    </div>
  </div>`;

  const form = container.querySelector("#spoke-calculator-form") as HTMLFormElement;
  if (!form) return;

  const { restored } = attachFormPersist(form, FORM_SPOKE_KEY, {
    restore: true,
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    validateAndCompute(form);
  });

  const ids = [
    "flange-calc-overall-mm",
    "flange-calc-x-mm",
    "flange-calc-y-mm",
    "flange-calc-f-measured-mm",
  ];
  loadFlangeCalcInputs();
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => runFlangeCalc());
      el.addEventListener("change", () => runFlangeCalc());
    }
  });
  const applyBtn = document.getElementById("flange-calc-apply");
  if (applyBtn) {
    applyBtn.addEventListener("click", () => applyFlangeCalcToForm());
  }
  runFlangeCalc();

  if (restored && form.checkValidity()) {
    validateAndCompute(form);
  }
}
