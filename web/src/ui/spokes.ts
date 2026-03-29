import nipplesDoc from "../data/nipples.json";
import { illustrativeOtherAsPctOfReference } from "../math/hubGeometry";
import {
  buildSpokeResults,
  maxCrosses,
  rimEntryAngleDeg,
  spokeHeadClearanceApproxMm,
} from "../math/spokeLength";
import { computeNippleFit } from "../section/nippleFit";
import {
  buildSectionDetail,
  buildSectionLayout,
  type NippleLike,
} from "../section/layout";
import { renderSectionDetailHtml } from "../section/sectionHtml";
import { confirmAndClearWheelData } from "../storage/clearWheelSession";
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

function fmtMmPreset(x: number): string {
  const r = Math.round(x * 10) / 10;
  return Number.isInteger(r) ? String(Math.trunc(r)) : r.toFixed(1);
}

/** One-line geometry for tooltips and the live hint under the nipple field. */
function nipplePresetDimsText(n: NippleRow): string {
  const f = fmtMmPreset;
  return [
    `Head ${f(n.headDiameterMm)}×${f(n.headHeightMm)} mm`,
    `barrel ${f(n.bodyLengthMm)} mm`,
    `shank Ø${f(n.shankDiameterMm)} mm`,
    `thread ${f(n.internalThreadLengthMm)} mm`,
  ].join(" · ");
}

function nippleSelectOptions(selectedId: string): string {
  const opts = [
    `<option value="">— None (hide diagrams) —</option>`,
    ...NIPPLES.map((n) => {
      const dimsTitle = escapeAttr(nipplePresetDimsText(n));
      const sel = n.id === selectedId ? " selected" : "";
      return `<option value="${n.id}" title="${dimsTitle}"${sel}>${escapeAttr(n.name)}</option>`;
    }),
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

const WHEEL_BSD_MM: Record<string, number> = {
  "700c-29": 622,
  "27.5": 584,
  "26": 559,
};

function wheelSizeOptions(selected: string): string {
  const opts = [
    `<option value="">— Select wheel size —</option>`,
    `<option value="700c-29"${selected === "700c-29" ? " selected" : ""}>700c / 29&quot; (BSD 622)</option>`,
    `<option value="27.5"${selected === "27.5" ? " selected" : ""}>27.5&quot; (BSD 584)</option>`,
    `<option value="26"${selected === "26" ? " selected" : ""}>26&quot; (BSD 559)</option>`,
  ];
  return opts.join("");
}

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

function parseForm(form: HTMLFormElement): Record<string, string> {
  const fd = new FormData(form);
  const o: Record<string, string> = {};
  fd.forEach((v, k) => {
    o[k] = String(v);
  });
  return o;
}

/** Hub + ERD inputs required for spoke length; diagram / optional fields are tier B. */
interface SpokeFormModel {
  o: Record<string, string>;
  tierAErrors: string[];
  tierBErrors: string[];
  erdMm: number;
  spokeCount: number;
  crosses: number;
  lPcd: number;
  rPcd: number;
  lOff: number;
  rOff: number;
  hole: number;
  nip: number;
  /** Rim drill Ø (mm); used only with spokeDiamMm for optional seat correction. */
  rimHoleMm: number;
  /** Spoke Ø (mm); used only with rimHoleMm for optional seat correction. */
  spokeDiamMm: number;
  nippleId: string;
  wheelSizeKey: string;
  wheelBsdMm: number | null;
  rimInnerW: number | null;
  rimOuterW: number | null;
  rimWellD: number | null;
  spokeThread: number;
  iwdStr: string;
  orderedStr: string;
}

function analyzeSpokeForm(form: HTMLFormElement): SpokeFormModel {
  const o = parseForm(form);
  const erdMm = parseFloat(o.erd_mm);
  const spokeCount = parseInt(o.spoke_count, 10);
  const crosses = parseInt(o.crosses, 10);
  const lPcd = parseFloat(o.left_flange_diameter_mm);
  const rPcd = parseFloat(o.right_flange_diameter_mm);
  const lOff = parseFloat(o.left_flange_offset_mm);
  const rOff = parseFloat(o.right_flange_offset_mm);
  const hole =
    o.flange_hole_diameter_mm === "" ? 0 : parseFloat(o.flange_hole_diameter_mm);
  const nip =
    o.nipple_correction_mm === "" ? 0 : parseFloat(o.nipple_correction_mm);

  const tierAErrors: string[] = [];
  if (!Number.isFinite(erdMm) || erdMm < 200 || erdMm > 700) {
    tierAErrors.push("ERD must be between 200 and 700 mm.");
  }
  if (!Number.isFinite(spokeCount) || spokeCount < 12 || spokeCount > 52 || spokeCount % 2) {
    tierAErrors.push("Invalid spoke count.");
  }
  if (!Number.isFinite(crosses) || crosses < 0) {
    tierAErrors.push("Crosses must be a non-negative integer.");
  }
  if (Number.isFinite(spokeCount) && Number.isFinite(crosses)) {
    const lim = maxCrosses(spokeCount);
    if (crosses > lim) {
      tierAErrors.push(
        `For ${spokeCount} spokes, crosses must be ≤ ${lim} (tangential hole spacing).`,
      );
    }
  }
  if (!Number.isFinite(lPcd) || lPcd < 20 || lPcd > 200) {
    tierAErrors.push("Left flange PCD must be between 20 and 200 mm.");
  }
  if (!Number.isFinite(rPcd) || rPcd < 20 || rPcd > 200) {
    tierAErrors.push("Right flange PCD must be between 20 and 200 mm.");
  }
  if (!Number.isFinite(lOff) || lOff < 0 || lOff > 120) {
    tierAErrors.push("Left flange offset must be between 0 and 120 mm.");
  }
  if (!Number.isFinite(rOff) || rOff < 0 || rOff > 120) {
    tierAErrors.push("Right flange offset must be between 0 and 120 mm.");
  }
  if (
    o.flange_hole_diameter_mm !== "" &&
    (!Number.isFinite(hole) || hole < 0 || hole > 10)
  ) {
    tierAErrors.push("Hub hole diameter must be between 0 and 10 mm.");
  }
  if (o.nipple_correction_mm !== "" && !Number.isFinite(nip)) {
    tierAErrors.push("Nipple correction must be a number.");
  }

  const rimHoleStr = o.rim_hole_diameter_mm ?? "";
  const spokeDiaStr = o.spoke_diameter_mm ?? "";
  let rimHoleMm = 0;
  let spokeDiamMm = 0;
  if (rimHoleStr !== "") {
    rimHoleMm = parseFloat(rimHoleStr.replace(",", "."));
    if (!Number.isFinite(rimHoleMm) || rimHoleMm < 0 || rimHoleMm > 10) {
      tierAErrors.push("Rim hole diameter must be between 0 and 10 mm when set.");
    }
  }
  if (spokeDiaStr !== "") {
    spokeDiamMm = parseFloat(spokeDiaStr.replace(",", "."));
    if (!Number.isFinite(spokeDiamMm) || spokeDiamMm < 0 || spokeDiamMm > 5) {
      tierAErrors.push("Spoke diameter must be between 0 and 5 mm when set.");
    }
  }

  const nippleId = (o.nipple || "").trim();
  const wheelSizeKey = (o.wheel_size || "").trim();
  let wheelBsdMm: number | null = null;
  const tierBErrors: string[] = [];
  if (wheelSizeKey !== "") {
    const bsd = WHEEL_BSD_MM[wheelSizeKey];
    if (!Number.isFinite(bsd)) {
      tierBErrors.push("Unknown wheel size.");
    } else {
      wheelBsdMm = bsd;
      if (Number.isFinite(erdMm) && erdMm >= bsd) {
        tierBErrors.push(
          "ERD must be smaller than BSD for the selected wheel size.",
        );
      }
    }
  }
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
      tierBErrors.push("Rim inner width must be between 5 and 80 mm.");
    } else {
      rimInnerW = iw;
    }
  }
  if (rimDStr !== "") {
    const wd = parseFloat(rimDStr.replace(",", "."));
    if (!Number.isFinite(wd) || wd < 2 || wd > 60) {
      tierBErrors.push("Rim depth must be between 2 and 60 mm.");
    } else {
      rimWellD = wd;
    }
  }
  if (rimOuterWStr !== "") {
    const ow = parseFloat(rimOuterWStr.replace(",", "."));
    if (!Number.isFinite(ow) || ow < 10 || ow > 100) {
      tierBErrors.push("Rim outer width must be between 10 and 100 mm.");
    } else {
      rimOuterW = ow;
    }
  }
  if (rimInnerW != null && rimOuterW != null && rimOuterW < rimInnerW) {
    tierBErrors.push(
      "Rim outer width must be greater than or equal to rim inner width.",
    );
  }
  if (
    wheelBsdMm != null &&
    rimWellD != null &&
    Number.isFinite(erdMm)
  ) {
    const seatFromBead = (wheelBsdMm - erdMm) / 2.0;
    if (seatFromBead >= rimWellD) {
      tierBErrors.push(
        `Selected wheel size and ERD imply nipple seat depth ${seatFromBead.toFixed(1)} mm, which exceeds rim depth ${rimWellD.toFixed(1)} mm.`,
      );
    }
  }
  const spokeThreadStr = o.spoke_thread_length_mm ?? "";
  let spokeThread = 0;
  if (spokeThreadStr !== "") {
    spokeThread = parseFloat(spokeThreadStr.replace(",", "."));
    if (!Number.isFinite(spokeThread) || spokeThread < 0 || spokeThread > 50) {
      tierBErrors.push("Spoke thread length must be between 0 and 50 mm.");
    }
  }
  if (nippleId) {
    if (!findNipple(nippleId)) {
      tierBErrors.push("Unknown nipple preset.");
    } else if (
      spokeThread > 0 &&
      (rimInnerW == null || rimWellD == null)
    ) {
      tierBErrors.push(
        "Enter rim inner width and rim depth to draw the spoke-tip diagram (or set spoke thread length to 0).",
      );
    }
  }
  if (iwdStr !== "") {
    const iwd = parseFloat(iwdStr.replace(",", "."));
    if (!Number.isFinite(iwd) || iwd < 1 || iwd > 58) {
      tierBErrors.push("Inner wall depth must be between 1 and 58 mm.");
    } else if (
      rimWellD != null &&
      Number.isFinite(iwd) &&
      iwd >= rimWellD
    ) {
      tierBErrors.push(
        "Inner wall depth must be less than the total rim depth.",
      );
    }
  }
  const orderedStr = o.ordered_spoke_length_mm ?? "";
  if (orderedStr !== "") {
    const ol = parseFloat(orderedStr.replace(",", "."));
    if (!Number.isFinite(ol) || ol < 100 || ol > 400) {
      tierBErrors.push("Ordered spoke length must be between 100 and 400 mm.");
    }
  }

  return {
    o,
    tierAErrors,
    tierBErrors,
    erdMm,
    spokeCount,
    crosses,
    lPcd,
    rPcd,
    lOff,
    rOff,
    hole,
    nip,
    rimHoleMm,
    spokeDiamMm,
    nippleId,
    wheelSizeKey,
    wheelBsdMm,
    rimInnerW,
    rimOuterW,
    rimWellD,
    spokeThread,
    iwdStr,
    orderedStr,
  };
}

function renderSpokeResultsToResultsCol(
  m: SpokeFormModel,
  resultsCol: HTMLElement,
  options: { skipDiagram: boolean },
): void {
  const o = m.o;
  const erd = m.erdMm;
  const sc = m.spokeCount;
  const crosses = m.crosses;
  const lPcd = m.lPcd;
  const rPcd = m.rPcd;
  const lOff = m.lOff;
  const rOff = m.rOff;
  const hole = m.hole;
  const nip = m.nip;
  const rimHoleMm = m.rimHoleMm;
  const spokeDiamMm = m.spokeDiamMm;
  const nippleId = m.nippleId;
  const wheelSizeKey = m.wheelSizeKey;
  const wheelBsdMm = m.wheelBsdMm;
  const rimInnerW = m.rimInnerW;
  const rimOuterW = m.rimOuterW;
  const rimWellD = m.rimWellD;
  const spokeThread = m.spokeThread;
  const iwdStr = m.iwdStr;

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
    rimHoleDiameterMm: rimHoleMm,
    spokeDiameterMm: spokeDiamMm,
  });

  const leftSpokes = spokes.filter((s) => s.side === "left");
  const rightSpokes = spokes.filter((s) => s.side === "right");
  const avgLenLeftMm =
    leftSpokes.reduce((a, s) => a + s.lengthMm, 0) / leftSpokes.length;
  const avgLenRightMm =
    rightSpokes.reduce((a, s) => a + s.lengthMm, 0) / rightSpokes.length;
  const lenLeftStr = lengthKey(avgLenLeftMm).toFixed(1);
  const lenRightStr = lengthKey(avgLenRightMm).toFixed(1);
  const headClearLeft = spokeHeadClearanceApproxMm({
    flangePcdMm: lPcd,
    spokeCount: sc,
    crosses,
    flangeHoleDiameterMm: hole,
  });
  const headClearRight = spokeHeadClearanceApproxMm({
    flangePcdMm: rPcd,
    spokeCount: sc,
    crosses,
    flangeHoleDiameterMm: hole,
  });
  const rimEntryLeft = rimEntryAngleDeg({
    erdMm: erd,
    flangeRadiusMm: lPcd / 2,
    crosses,
    spokeCount: sc,
    side: "left",
  });
  const rimEntryRight = rimEntryAngleDeg({
    erdMm: erd,
    flangeRadiusMm: rPcd / 2,
    crosses,
    spokeCount: sc,
    side: "right",
  });
  /** Right-side tension as % of left (left = 100% ref). Matches common calculators; reciprocal of “right = 100% ref”. */
  const tensionRightPctOfLeft = illustrativeOtherAsPctOfReference({
    referenceSide: "left",
    wLeftMm: lOff,
    wRightMm: rOff,
    avgLenLeftMm,
    avgLenRightMm,
  });

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
  if (
    !options.skipDiagram &&
    nippleId &&
    rimInnerW != null &&
    rimWellD != null &&
    spokeThread > 0
  ) {
    const nipRow = findNipple(nippleId);
    if (nipRow) {
      const nippleShape: NippleLike = {
        headDiameterMm: nipRow.headDiameterMm,
        headHeightMm: nipRow.headHeightMm,
        bodyLengthMm: nipRow.bodyLengthMm,
        shankDiameterMm: nipRow.shankDiameterMm,
        internalThreadLengthMm: nipRow.internalThreadLengthMm,
      };
      const side = "right";
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
            rimHoleDiameterMm: rimHoleMm,
            spokeDiameterMm: spokeDiamMm,
          },
        );
        const orderedRaw = o.ordered_spoke_length_mm ?? "";
        const orderedLen =
          orderedRaw === ""
            ? diagram.spokeLengthMm
            : parseFloat(orderedRaw.replace(",", "."));
        const seatFromBeadMm =
          wheelBsdMm != null ? (wheelBsdMm - erd) / 2.0 : null;
        const seatDepthForFitMm =
          seatFromBeadMm != null ? seatFromBeadMm : rimWellD;
        const fit = computeNippleFit({
          calculatedSpokeLengthMm: diagram.spokeLengthMm,
          orderedSpokeLengthMm: orderedLen,
          nippleBodyLengthMm: nipRow.bodyLengthMm,
          internalThreadLengthMm: nipRow.internalThreadLengthMm,
          spokeThreadLengthMm: spokeThread,
          wellDepthMm: seatDepthForFitMm,
        });
        const iwdParsed =
          iwdStr !== ""
            ? parseFloat(iwdStr.replace(",", "."))
            : undefined;
        const detail = buildSectionDetail(nippleShape, {
          wellDepthMm: rimWellD,
          innerWidthMm: rimInnerW,
          outerWidthMm: rimOuterW ?? undefined,
          seatFromTopMm: seatFromBeadMm ?? undefined,
          tipFromSeatMm: fit.tipFromSeatMm,
          spokeThreadLengthMm: spokeThread,
          innerWallDepthMm:
            iwdParsed !== undefined && Number.isFinite(iwdParsed)
              ? iwdParsed
              : null,
        });
        sectionPanelsHtml = renderSectionDetailHtml(detail, fit, {
          wheelSizeLabel:
            wheelSizeKey === "700c-29"
              ? "700c / 29\""
              : wheelSizeKey === "27.5"
                ? "27.5\""
                : wheelSizeKey === "26"
                  ? "26\""
                  : null,
          bsdMm: wheelBsdMm,
          seatFromBeadMm,
          seatRadiusMm: erd / 2.0,
        });
      } catch (e) {
        sectionPanelsHtml = `<p class="hint prose">Spoke tip diagram could not be drawn: ${e instanceof Error ? e.message : String(e)}</p>`;
      }
    }
  }

  if (resultsCol) {
    resultsCol.innerHTML = `
      <section class="results prose spoke-build-summary" role="region" aria-label="Spoke build summary">
        <div class="tension-stat-block-title">Build summary</div>
        <p class="hint spoke-build-summary-hint">Averages per flange side (odd spoke # = left, even = right). Ordering length = triangle − hub hole Ø/2 + nipple − optional <strong>seat trim</strong> (rim drill + spoke Ø)/10 when both trim fields are set — not lateral rim “hole width” stagger. Head clearance: pitch × cos(lacing angle) − hub hole Ø. Rim entry angle in the wheel plane. <strong>Tension ratio</strong> (axial balance): <strong>left = 100%</strong>, right = % of left. Wrong offsets skew ratio badly.</p>
        <table class="spoke-build-summary-table">
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">Left</th>
              <th scope="col">Right</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Spoke lengths (mm)</th>
              <td>${lenLeftStr}</td>
              <td>${lenRightStr}</td>
            </tr>
            <tr>
              <th scope="row">Spoke head clearance (mm)</th>
              <td>${headClearLeft.toFixed(1)}</td>
              <td>${headClearRight.toFixed(1)}</td>
            </tr>
            <tr>
              <th scope="row">Rim entry angle (°)</th>
              <td>${rimEntryLeft.toFixed(1)}</td>
              <td>${rimEntryRight.toFixed(1)}</td>
            </tr>
            <tr>
              <th scope="row">Spoke tension ratio</th>
              <td>100%</td>
              <td>${tensionRightPctOfLeft.toFixed(0)}%</td>
            </tr>
          </tbody>
        </table>
      </section>
      ${sectionPanelsHtml}`;
  }
}

function debounceSpokeRecompute(fn: () => void, ms: number): () => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (t !== undefined) clearTimeout(t);
    t = setTimeout(() => {
      t = undefined;
      fn();
    }, ms);
  };
}

function runSpokeFormUpdate(
  form: HTMLFormElement,
  mode: "auto" | "submit",
  spokeValidationFromSubmit: { current: boolean },
): void {
  const errEl = form.querySelector("#spoke-form-errors") as HTMLElement;
  const resultsCol = document.querySelector(
    ".spoke-page-results-col",
  ) as HTMLElement | null;
  const m = analyzeSpokeForm(form);
  const allErrors = [...m.tierAErrors, ...m.tierBErrors];

  if (mode === "submit") {
    spokeValidationFromSubmit.current = true;
  }

  if (allErrors.length === 0) {
    spokeValidationFromSubmit.current = false;
    errEl.textContent = "";
    errEl.style.display = "none";
    if (resultsCol) {
      renderSpokeResultsToResultsCol(m, resultsCol, { skipDiagram: false });
    }
    return;
  }

  if (spokeValidationFromSubmit.current || mode === "submit") {
    errEl.textContent = allErrors.join(" ");
    errEl.style.display = "block";
  } else {
    errEl.textContent = "";
    errEl.style.display = "none";
  }

  if (m.tierAErrors.length === 0) {
    if (resultsCol) {
      renderSpokeResultsToResultsCol(m, resultsCol, {
        skipDiagram: m.tierBErrors.length > 0,
      });
    }
  } else if (resultsCol) {
    const hint = spokeValidationFromSubmit.current
      ? "Fix the form and use <strong>Calculate</strong> again."
      : "Enter valid hub and ERD fields to see spoke lengths.";
    resultsCol.innerHTML = `<div class="spoke-page-results-placeholder prose"><p class="hint">${hint}</p></div>`;
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
      <p class="lede">ERD, hub PCDs, <strong>left/right flange offsets</strong> (type them in or use the <strong>Flange offset calculator</strong> from overall width and <em>x</em> / <em>y</em>), crosses. Spoke numbering: <strong>odd</strong> (#1, 3, …) = <strong>left</strong>; <strong>even</strong> (#2, 4, …) = <strong>right</strong> — same order as the tension map.</p>
      <p class="hint">After building, use <strong>Tension</strong> in the top bar to plot TM-1 readings in the same spoke order. Spoke lengths update as you type when hub and ERD fields are valid. Use <strong>Calculate</strong> to check optional rim/nipple fields and see validation errors. <strong>Clear</strong> wipes autosaved spokes, tension, hub params, and flange calc (named saved builds are kept).</p>
    </div>
    <div class="spoke-page-form-col">
      <form class="form-grid spoke-page-form-grid" id="spoke-calculator-form" novalidate data-form-persist-key="${FORM_SPOKE_KEY}">
        <div id="spoke-form-errors" class="form-errors" style="display:none"></div>
        <div class="field-span field-row field-row-3">
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
        </div>
        <div class="field-span field-row field-row-2">
          <div class="field">
            <label for="id_left_flange_diameter_mm">Left flange PCD (mm)</label>
            <input type="number" name="left_flange_diameter_mm" id="id_left_flange_diameter_mm" required min="20" max="200" step="any" />
          </div>
          <div class="field">
            <label for="id_right_flange_diameter_mm">Right flange PCD (mm)</label>
            <input type="number" name="right_flange_diameter_mm" id="id_right_flange_diameter_mm" required min="20" max="200" step="any" />
          </div>
        </div>
        ${flangePanelHtml()}
        <p class="hint field-span">Left / right offsets = distance from <strong>hub center plane</strong> (mid-width) to that flange, same as <strong>L</strong> / <strong>R</strong> above. Rear wheels: non-drive is usually the <strong>larger</strong> offset; drive side the smaller — if those are reversed, tension ratio will read high (~120–140% instead of ~80–90%).</p>
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
        <p class="hint field-span">Elsewhere, <strong>hole width</strong> often means <strong>lateral stagger</strong> between left and right rim holes (0 if centered; negative for crossover lacing). <strong>Wuild does not model that.</strong> The optional pair below is unrelated: nipple-seat drill Ø + spoke Ø for a small ordering-length trim <strong>(sum) / 10 mm</strong> when both are filled.</p>
        <div class="field-span field-row field-row-2">
          <div class="field">
            <label for="id_rim_hole_diameter_mm">Rim drill Ø at seat (mm)</label>
            <input type="number" name="rim_hole_diameter_mm" id="id_rim_hole_diameter_mm" min="0" max="10" step="any" placeholder="e.g. 2.6" />
            <p class="hint">Nipple / rim seat drilling — <em>not</em> left–right hole stagger.</p>
          </div>
          <div class="field">
            <label for="id_spoke_diameter_mm">Spoke Ø (mm)</label>
            <input type="number" name="spoke_diameter_mm" id="id_spoke_diameter_mm" min="0" max="5" step="any" placeholder="e.g. 2.0" />
            <p class="hint">Used only with rim drill Ø for the trim above.</p>
          </div>
        </div>
        <fieldset class="field-span section-fieldset">
          <legend>Spoke tip detail (optional)</legend>
          <p class="hint">Choose a nipple preset, rim cavity dimensions, and a positive <strong>spoke thread length</strong> to show the zoomed spoke-tip diagram.</p>
          <div class="form-grid">
            <div class="field">
              <label for="id_wheel_size">Wheel size (for nipple seat reference)</label>
              <select name="wheel_size" id="id_wheel_size">${wheelSizeOptions(stored?.wheel_size ?? "")}</select>
              <p class="hint">Used with ERD to estimate nipple seat position from bead seat (BSD).</p>
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
              <select name="nipple" id="id_nipple" aria-describedby="id_nipple_dims">${nippleSelectOptions("")}</select>
              <p class="hint nipple-preset-dims" id="id_nipple_dims" aria-live="polite" hidden></p>
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
        <div class="field field-span spoke-form-actions">
          <button type="button" class="btn btn--clear btn-clear-session">Clear</button>
          <button type="submit" class="btn">Calculate</button>
        </div>
      </form>
    </div>
    <div class="spoke-page-results-col">
      <div class="spoke-page-results-placeholder prose">
        <p class="hint">Spoke lengths appear here when hub and ERD inputs are valid.</p>
      </div>
    </div>
  </div>`;

  const form = container.querySelector("#spoke-calculator-form") as HTMLFormElement;
  if (!form) return;

  container.querySelectorAll(".btn-clear-session").forEach((btn) => {
    btn.addEventListener("click", () => confirmAndClearWheelData());
  });

  const { restored } = attachFormPersist(form, FORM_SPOKE_KEY, {
    restore: true,
  });

  const nippleSelect = form.querySelector("#id_nipple") as HTMLSelectElement | null;
  const nippleDimsHint = document.getElementById("id_nipple_dims");
  function syncNipplePresetDimsUi(): void {
    if (!nippleSelect || !nippleDimsHint) return;
    const id = nippleSelect.value.trim();
    const row = id ? findNipple(id) : undefined;
    if (!row) {
      nippleSelect.removeAttribute("title");
      nippleDimsHint.textContent = "";
      nippleDimsHint.hidden = true;
      return;
    }
    const text = nipplePresetDimsText(row);
    nippleSelect.title = text;
    nippleDimsHint.textContent = text;
    nippleDimsHint.hidden = false;
  }
  nippleSelect?.addEventListener("change", syncNipplePresetDimsUi);
  syncNipplePresetDimsUi();

  const spokeValidationFromSubmit = { current: false };
  const scheduleSpokeRecompute = debounceSpokeRecompute(() => {
    runSpokeFormUpdate(form, "auto", spokeValidationFromSubmit);
  }, 320);

  form.addEventListener("input", scheduleSpokeRecompute);
  form.addEventListener("change", scheduleSpokeRecompute);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    runSpokeFormUpdate(form, "submit", spokeValidationFromSubmit);
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
    applyBtn.addEventListener("click", () => {
      applyFlangeCalcToForm();
      scheduleSpokeRecompute();
    });
  }
  runFlangeCalc();

  if (restored && form.checkValidity()) {
    runSpokeFormUpdate(form, "auto", spokeValidationFromSubmit);
  }
}
