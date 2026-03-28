/**
 * Remember form fields in localStorage (debounced) and restore on GET.
 * Keys: wuild.form.spoke.v1, wuild.form.tension.v1 — { schema: 1, fields: { name: value } }
 */
(function () {
  "use strict";

  var SCHEMA = 1;
  var DEBOUNCE_MS = 400;

  function loadFields(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || o.schema !== SCHEMA || !o.fields || typeof o.fields !== "object") {
        return null;
      }
      return o.fields;
    } catch (e) {
      return null;
    }
  }

  function saveFields(key, fields) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ schema: SCHEMA, fields: fields })
      );
    } catch (e) {}
  }

  function captureForm(form) {
    var fd = new FormData(form);
    var fields = {};
    fd.forEach(function (v, k) {
      if (k === "csrfmiddlewaretoken") return;
      fields[k] = v;
    });
    return fields;
  }

  function escName(name) {
    return String(name).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function applyFields(form, fields) {
    Object.keys(fields).forEach(function (name) {
      if (name === "csrfmiddlewaretoken") return;
      var val = fields[name];
      var nodes = form.querySelectorAll('[name="' + escName(name) + '"]');
      if (!nodes.length) return;
      var first = nodes[0];
      if (first.type === "radio") {
        for (var i = 0; i < nodes.length; i++) {
          nodes[i].checked = String(nodes[i].value) === String(val);
        }
        return;
      }
      if (first.type === "checkbox") {
        first.checked =
          val === "on" || val === true || val === "true" || val === "1";
        return;
      }
      first.value = val == null ? "" : String(val);
    });
  }

  function maybeRedirectForSpokeCount(form, key) {
    var fields = loadFields(key);
    if (!fields || fields.spoke_count == null || fields.spoke_count === "") {
      return false;
    }
    var sel = form.elements.spoke_count;
    if (!sel) return false;
    var cur = parseInt(sel.value, 10);
    var want = parseInt(String(fields.spoke_count), 10);
    if (!Number.isFinite(want) || want === cur) return false;
    var u = new URL(window.location.href);
    u.searchParams.set("spoke_count", String(want));
    window.location.replace(u.toString());
    return true;
  }

  /**
   * @returns {{ restored: boolean }}
   */
  function attach(form) {
    var key = form.getAttribute("data-form-persist-key");
    if (!key) return { restored: false };

    var doRestore = form.getAttribute("data-form-persist-restore") === "1";
    var spokeRedirect =
      form.getAttribute("data-form-persist-spoke-redirect") === "1";

    if (doRestore && spokeRedirect && maybeRedirectForSpokeCount(form, key)) {
      return { restored: false };
    }

    var restored = false;
    if (doRestore) {
      var stored = loadFields(key);
      if (stored) {
        applyFields(form, stored);
        restored = true;
      }
    } else {
      saveFields(key, captureForm(form));
    }

    var timer = null;
    function scheduleSave() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        saveFields(key, captureForm(form));
      }, DEBOUNCE_MS);
    }

    form.addEventListener("input", scheduleSave);
    form.addEventListener("change", scheduleSave);
    form.addEventListener("submit", function () {
      if (timer) clearTimeout(timer);
      saveFields(key, captureForm(form));
    });

    return { restored: restored };
  }

  window.WuildFormPersist = {
    SCHEMA: SCHEMA,
    attach: attach,
    loadFields: loadFields,
    saveFields: saveFields,
    captureForm: captureForm,
    applyFields: applyFields,
  };
})();
