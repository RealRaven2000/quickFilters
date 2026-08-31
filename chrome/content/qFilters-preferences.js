"use strict";

/* 
BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK 
*/


quickFilters.Preferences = {
  Prefix: "extensions.quickfilters.", // obsolete for local storage
  service: Services.prefs, // obsolete for local storage

  get isDebug() {
    return quickFilters.Preferences.getBoolPref("debug");
  },

  isDebugOption: function (option) {
    // granular debugging
    if (!this.isDebug) {
      return false;
    }
    try {
      return this.getBoolPref("debug." + option);
    } catch {
      return false;
    }
  },

  getIntPref(p) {
    return quickFilters.Preferences.cache.getValue(p);
  },

  async setIntPref(p, v) {
    return quickFilters.Preferences.cache.setValue(p, v);
  },

  isAbortAfterCreateFilter: function () {
    return this.getBoolPref("abortAfterCreate");
  },

  getBoolPrefSilent(p) {
    try {
      return this.getBoolPref(p);
    } catch {
      return false;
    }
  },

  getBoolPref(p) {
    return quickFilters.Preferences.cache.getValue(p);
  },

  async setBoolPref(p, v) {
    return quickFilters.Preferences.cache.setValue(p, v);
  },

  getCharPref(p) {
    return quickFilters.Preferences.cache.getValue(p);
  },

  async setCharPref(p, v) {
    return quickFilters.Preferences.cache.setValue(p, v);
  },

  getStringPref(p) {
    const value = quickFilters.Preferences.cache.getValue(p);
    if (value === null || value === undefined) {
      console.warn(
        `quickFilters Preferences Cache Failure: getStringPref("${p}") returned ${value === null ? "null" : "undefined"} - preference missing from cache`
      );
    }
    return value;
  },

  async setStringPref(p, v) {
    return quickFilters.Preferences.cache.setValue(p, v);
  },

  get isStarAction() {
    let pref = "actions.star"; // SeaMonkey: actions.flag
    return this.getBoolPref(pref);
  },

  get isMoveFolderAction() {
    return this.getBoolPref("actions.moveFolder");
  },

  async setMoveFolderAction(b) {
    return this.setBoolPref("actions.moveFolder", b);
  },

  get isAssistantModeHTML() {
    return this.getBoolPref("assistant.html");
  },

  getCurrentFilterTemplate: function () {
    let current = quickFilters.Preferences.getStringPref("filters.currentTemplate");
    if (
      typeof current !== "string" ||
      current === "" ||
      current === "undefined" ||
      current === "null" ||
      current.trim() === ""
    ) {
      quickFilters?.Util?.logDebugOptional(
        "buildFilter",
        "Current filter template preference is invalid or empty:",
        current
      );
      return "";
    }
    return current;
  },

  setCurrentFilterTemplate: async function (pref) {
    quickFilters?.Util?.logDebugOptional("buildFilter", `setCurrentFilterTemplate: ${pref}`);
    return quickFilters.Preferences.setStringPref("filters.currentTemplate", pref);
  },

  // scope: "folder" | "mails"
  isShortcut: function (scope) {
    switch (scope) {
      case "folder":
        break;
      case "mails":
        break;
      default:
        return false;
    }
    try {
      return this.getBoolPref("shortcuts." + scope);
    } catch { ; }
    return false;
  },

  getShortcut: function (scope) {
    switch (scope) {
      case "folder":
        break;
      case "mails":
        break;
      default:
        return null;
    }
    return this.getStringPref("shortcuts." + scope + ".key");
  },
  ensureReady: async function () {
    await quickFilters.Preferences.cache.awaitReady;
  },
};

quickFilters.Preferences.cache = (() => {
  const cache = {
    _data: {},
    _resolveReady: null,
    _rejectReady: null,
    awaitReady: null /* init-only gate; NOT a lock for updates */,
    getValue: (k) => cache._data[k],

    setValue: async (k, v) => {
      if (v === undefined) {
        throw new Error(`Cannot set preference "${k}" to undefined`);
      }
      cache._data[k] = v;
      try {
        const isDebug = k === "debug" || k.startsWith("debug.");
        const storageKey = isDebug ? "debug" : "settings";
        const dataKey = k === "debug" ? "debugActive" : k;
        const current = await quickFilters.Storage.get({ [storageKey]: {} });
        current[storageKey][dataKey] = v;
        await quickFilters.Storage.set(current);
      } catch (ex) {
        console.error("Pref sync failed:", k, ex);
      }      
    },

    init: async () => {
      // create an async blocker.
      const ready = Promise.withResolvers();
      cache.awaitReady = ready.promise;
      cache._resolveReady = ready.resolve;
      cache._rejectReady = ready.reject;

      try {
        const data = await quickFilters.Storage.getWithRetry({ settings: {}, debug: {} });
        const prefs = { ...data.settings };
        for (const [k, v] of Object.entries(data.debug)) {
          prefs[k === "debugActive" ? "debug" : k] = v;
        }
        Object.keys(cache._data).forEach((k) => delete cache._data[k]);
        Object.assign(cache._data, prefs);
      } catch (ex) {
        console.error("Preferences Cache init failed:", ex);
        cache._rejectReady(ex);
        return;
      }
      cache._resolveReady();
    },

    updateFromBackend: (data) => {
      // copies all enumerable own properties
      Object.assign(cache._data, data);
    },
  };

  return cache;
})();

// start the init process. 
// guard with await cache.awaitReady in each window onLoad
const openerCache = window.opener?.quickFilters?.Preferences?.cache;
if (openerCache?.awaitReady) {
  // Standalone modal dialogs reuse the initialized cache from their opener.
  quickFilters.Preferences.cache = openerCache;
} else {
  quickFilters.Preferences.cache.init();
}
