/**
 * Flange offsets L, R and F from overall hub width and x, y (locknut-face convention).
 * Formulas match core.spoke_length.flange_offsets_from_hub_overall_width.
 *
 * Optional: remembers last calculator inputs in localStorage (wuild.flangeCalc.v1).
 */
(function () {
  "use strict";

  var FLANGE_CALC_KEY = "wuild.flangeCalc.v1";
  var FLANGE_SCHEMA = 1;

  function loadCalcInputs() {
    try {
      var raw = localStorage.getItem(FLANGE_CALC_KEY);
      if (!raw) return;
      var o = JSON.parse(raw);
      if (!o || o.schema !== FLANGE_SCHEMA) return;
      ["overall", "x", "y", "fMeasured"].forEach(function (k) {
        if (o[k] === undefined || o[k] === null) return;
        var id =
          k === "overall"
            ? "flange-calc-overall-mm"
            : k === "x"
              ? "flange-calc-x-mm"
              : k === "y"
                ? "flange-calc-y-mm"
                : "flange-calc-f-measured-mm";
        var el = document.getElementById(id);
        if (el) el.value = String(o[k]);
      });
    } catch (e) {}
  }

  function saveCalcInputs() {
    var overall = parseMm("flange-calc-overall-mm");
    var x = parseMm("flange-calc-x-mm");
    var y = parseMm("flange-calc-y-mm");
    if (!Number.isFinite(overall) || !Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }
    var fmEl = document.getElementById("flange-calc-f-measured-mm");
    var fm =
      fmEl && fmEl.value !== ""
        ? parseFloat(String(fmEl.value).replace(",", "."), 10)
        : null;
    try {
      localStorage.setItem(
        FLANGE_CALC_KEY,
        JSON.stringify({
          schema: FLANGE_SCHEMA,
          overall: overall,
          x: x,
          y: y,
          fMeasured: Number.isFinite(fm) ? fm : null,
        })
      );
    } catch (e) {}
  }

  function parseMm(id) {
    var el = document.getElementById(id);
    if (!el) return NaN;
    var v = parseFloat(String(el.value).replace(",", "."), 10);
    return Number.isFinite(v) ? v : NaN;
  }

  function compute(overall, x, y) {
    if (!(overall > 0)) return { error: "Enter a positive hub width." };
    var h = overall / 2;
    if (!(x >= 0) || !(y >= 0))
      return { error: "x and y must be zero or positive." };
    var L = h - x;
    var R = h - y;
    if (L < 0 || R < 0)
      return {
        error:
          "x or y is larger than half the hub width (would make L or R negative).",
      };
    var F = L + R;
    return { h: h, L: L, R: R, F: F, error: null };
  }

  function fmt(n) {
    return (Math.round(n * 100) / 100).toFixed(2);
  }

  function run() {
    var overall = parseMm("flange-calc-overall-mm");
    var x = parseMm("flange-calc-x-mm");
    var y = parseMm("flange-calc-y-mm");
    var outL = document.getElementById("flange-calc-out-L");
    var outR = document.getElementById("flange-calc-out-R");
    var outF = document.getElementById("flange-calc-out-F");
    var outH = document.getElementById("flange-calc-out-h");
    var hint = document.getElementById("flange-calc-hint");
    var fMeasEl = document.getElementById("flange-calc-f-measured-mm");
    if (!outL || !outR || !outF) return;

    if (!Number.isFinite(overall) || !Number.isFinite(x) || !Number.isFinite(y)) {
      outL.textContent = "—";
      outR.textContent = "—";
      outF.textContent = "—";
      if (outH) outH.textContent = "—";
      if (hint) {
        hint.textContent = "";
        hint.className = "hint flange-calc-hint";
      }
      return;
    }

    var r = compute(overall, x, y);
    if (r.error) {
      outL.textContent = "—";
      outR.textContent = "—";
      outF.textContent = "—";
      if (outH) outH.textContent = "—";
      if (hint) {
        hint.textContent = r.error;
        hint.className = "hint flange-calc-hint flange-calc-hint--error";
      }
      saveCalcInputs();
      return;
    }

    outL.textContent = fmt(r.L);
    outR.textContent = fmt(r.R);
    outF.textContent = fmt(r.F);
    if (outH) outH.textContent = fmt(r.h);

    if (hint) {
      hint.className = "hint flange-calc-hint";
      var extra = "";
      if (fMeasEl && fMeasEl.value !== "") {
        var fm = parseFloat(String(fMeasEl.value).replace(",", "."), 10);
        if (Number.isFinite(fm)) {
          var d = Math.abs(r.F - fm);
          if (d < 0.05)
            extra = " Measured F matches L+R within 0.05 mm.";
          else
            extra =
              " Δ(F): L+R is " +
              fmt(r.F) +
              " mm vs measured F " +
              fmt(fm) +
              " mm (diff " +
              fmt(d) +
              " mm) — double-check x, y, or width.";
        }
      }
      hint.textContent =
        "L and R are distances from the wheel center plane (midway between hub outer faces) to each flange — same as the fields below." +
        extra;
    }
    saveCalcInputs();
  }

  function applyToForm() {
    var overall = parseMm("flange-calc-overall-mm");
    var x = parseMm("flange-calc-x-mm");
    var y = parseMm("flange-calc-y-mm");
    var r = compute(overall, x, y);
    if (r.error) return;
    var leftEl = document.getElementById("id_left_flange_offset_mm");
    var rightEl = document.getElementById("id_right_flange_offset_mm");
    if (leftEl) leftEl.value = fmt(r.L);
    if (rightEl) rightEl.value = fmt(r.R);
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadCalcInputs();
    var ids = [
      "flange-calc-overall-mm",
      "flange-calc-x-mm",
      "flange-calc-y-mm",
      "flange-calc-f-measured-mm",
    ];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", run);
        el.addEventListener("change", run);
      }
    });
    var btn = document.getElementById("flange-calc-apply");
    if (btn) btn.addEventListener("click", applyToForm);
    run();
  });
})();
