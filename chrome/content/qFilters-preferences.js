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

  isDebug() {
    return quickFilters.Preferences.getBoolPref("debug");
  },

  isDebugOption: function (option) {
    // granular debugging
    if (!this.isDebug()) {
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
    return quickFilters.Preferences.cache.getValue(p);
  },

  async setStringPref(p, v) {
    return quickFilters.Preferences.cache.setValue(p, v);
  },

  isStarAction() {
    let pref = "actions.star"; // SeaMonkey: actions.flag
    return this.getBoolPref(pref);
  },

  isMoveFolderAction() {
    return this.getBoolPref("actions.moveFolder");
  },

  async setMoveFolderAction(b) {
    this.setBoolPref("actions.moveFolder", b);
  },

  isAssistantModeHTML() {
    return this.getBoolPref("assistant.html");
  },

  getCurrentFilterTemplate: function () {
    let current = quickFilters.Preferences.getStringPref("filters.currentTemplate");
    if (current == "undefined") {
      current = null;
    }
    return current;
  },

  setCurrentFilterTemplate: async function (pref) {
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
};

quickFilters.Preferences.cache = (() => {
  const cache = {
    _data: {},
    _resolveReady: null,
    awaitReady: null /* init-only gate; NOT a lock for updates */,
    getValue: (k) => cache._data[k],

    setValue: async (k, v) => {
      cache._data[k] = v;
      let varType = "undefined";
      switch (typeof v) {
        case "number":
          varType = "int";
          break;
        case "boolean":
          varType = "bool";
          break;
        case "string":
          varType = "string";
          break;
      }
      try {
        await quickFilters.Util.notifyTools.notifyBackground({
          func: "prefs:set",
          kind: varType,
          key: k,
          value: v,
        });
      } catch (ex) {
        console.error("Pref sync failed:", k, ex);
      }      
    },

    init: async () => {
      // create an async blocker.
      cache.awaitReady = new Promise((resolve) => {
        // blocks all external callers until we're done here
        cache._resolveReady = resolve;
      });

      try {
        console.log("Preferences Cache - notifyTools:", quickFilters.Util?.notifyTools);
        const data = await quickFilters.Util.notifyTools.notifyBackground({
          func: "requestPrefCache",
        });
        console.log("Received preferences Cache:", data);
        // remove all old data
        Object.keys(cache._data).forEach((k) => delete cache._data[k]);
        Object.assign(cache._data, data);
        // fill cache._data from backend snapshot
      } catch (ex) {
        console.error("requestPrefCache failed:", ex);
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
quickFilters.Preferences.cache.init();