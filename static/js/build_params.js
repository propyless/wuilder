/**
 * Cross-page wheel build parameters (localStorage).
 *
 * Schema v1 — keys mirror SpokeCalculatorForm field names. Tension page uses
 * hub_* prefixed fields; see TENSION_MAP below.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "wuild.buildParams.v1";
  var SCHEMA = 1;

  var TENSION_MAP = {
    erd_mm: "hub_erd_mm",
    spoke_count: "spoke_count",
    crosses: "hub_crosses",
    left_flange_diameter_mm: "hub_left_flange_pcd_mm",
    right_flange_diameter_mm: "hub_right_flange_pcd_mm",
    left_flange_offset_mm: "hub_left_offset_mm",
    right_flange_offset_mm: "hub_right_offset_mm",
    flange_hole_diameter_mm: "hub_flange_hole_diameter_mm",
    nipple_correction_mm: "hub_nipple_correction_mm",
  };

  function _setById(id, value) {
    var el = document.getElementById(id);
    if (!el || value === undefined || value === null) {
      return;
    }
    var s = String(value);
    if (el.tagName === "SELECT") {
      el.value = s;
      return;
    }
    el.value = s;
  }

  function save(payload) {
    if (!payload || typeof payload !== "object") {
      return;
    }
    var body = Object.assign({ schema: SCHEMA }, payload);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(body));
    } catch (e) {
      /* quota / private mode */
    }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      var o = JSON.parse(raw);
      if (!o || o.schema !== SCHEMA) {
        return null;
      }
      return o;
    } catch (e) {
      return null;
    }
  }

  function clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  /**
   * Read JSON from <script type="application/json" id="..."> and save to storage.
   */
  function saveFromOutputEl(elementId) {
    var node = document.getElementById(elementId);
    if (!node || !node.textContent) {
      return;
    }
    try {
      var data = JSON.parse(node.textContent);
      save(data);
    } catch (e) {}
  }

  function applyToTensionForm() {
    var o = load();
    if (!o) {
      return false;
    }
    var applied = false;
    Object.keys(TENSION_MAP).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(o, k)) {
        return;
      }
      var tid = "id_" + TENSION_MAP[k];
      _setById(tid, o[k]);
      applied = true;
    });
    return applied;
  }

  window.WuildBuildParams = {
    STORAGE_KEY: STORAGE_KEY,
    SCHEMA: SCHEMA,
    save: save,
    load: load,
    clear: clear,
    saveFromOutputEl: saveFromOutputEl,
    applyToTensionForm: applyToTensionForm,
  };
})();
