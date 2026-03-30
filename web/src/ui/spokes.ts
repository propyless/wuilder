import { spokeTensionBalanceDisplayPercents } from "../math/hubGeometry";
import {
  buildSpokeResults,
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
import { analyzeSpokeForm, type SpokeFormModel } from "../spokes/form";
import {
  flangePanelHtml,
  nippleSelectOptions,
  wheelSizeOptions,
} from "../spokes/html";
import { findNipple, nipplePresetDimsText, NIPPLES } from "../spokes/nipples";
import { debounce } from "../util/debounce";
import { confirmAndClearWheelData } from "../storage/clearWheelSession";
import { saveBuildParams, type BuildParamsPayload } from "../storage/buildParams";
import { FORM_SPOKE_KEY } from "../storage/keys";
import { attachFormPersist, loadFields } from "../storage/formPersist";
import {
  applyFlangeCalcToForm,
  loadFlangeCalcInputs,
  runFlangeCalc,
} from "../storage/flangeCalc";
import { escapeHtml } from "../util/escape";
import { spokeOptions } from "./spokeOptions";

function lengthKey(mm: number): number {
  return Math.round(mm * 10) / 10;
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
  });

  const leftSpokes = spokes.filter((s) => s.side === "left");
  const rightSpokes = spokes.filter((s) => s.side === "right");
  if (!leftSpokes.length || !rightSpokes.length) return;
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
  const tensionPct = spokeTensionBalanceDisplayPercents({
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
        sectionPanelsHtml = `<p class="hint prose">Spoke tip diagram could not be drawn: ${escapeHtml(e instanceof Error ? e.message : String(e))}</p>`;
      }
    }
  }

  if (resultsCol) {
    resultsCol.innerHTML = `
      <section class="results prose spoke-build-summary" role="region" aria-label="Spoke build summary">
        <div class="tension-stat-block-title">Build summary</div>
        <p class="hint spoke-build-summary-hint">Averages per flange side (odd spoke # = left, even = right). Ordering length = triangle − hub hole Ø/2 + nipple correction. Head clearance: pitch × cos(lacing angle) − hub hole Ø. Rim entry angle in the wheel plane. <strong>Tension ratio</strong> (equilibrium axial balance): the <strong>tighter</strong> side = 100%, the other = its % of that — same convention as typical spoke-length calculators.</p>
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
              <td>${tensionPct.leftPct.toFixed(0)}%</td>
              <td>${tensionPct.rightPct.toFixed(0)}%</td>
            </tr>
          </tbody>
        </table>
      </section>
      ${sectionPanelsHtml}`;
  }
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
        <p class="hint field-span">Left / right offsets = distance from <strong>hub center plane</strong> (mid-width) to that flange, same as <strong>L</strong> / <strong>R</strong> above. Rear wheels: non-drive is usually the <strong>larger</strong> offset; drive side the smaller — if those are reversed, the looser side’s % will look too high vs other calculators.</p>
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
              <select name="nipple" id="id_nipple" aria-describedby="id_nipple_dims">${nippleSelectOptions(NIPPLES, "")}</select>
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
  const scheduleSpokeRecompute = debounce(() => {
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
