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
    return quickFilters.Preferences.cache.getValue(p);
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
    this.setBoolPref("actions.moveFolder", b);
  },

  get isAssistantModeHTML() {
    return this.getBoolPref("assistant.html");
  },

  getCurrentFilterTemplate: function () {
    let current = quickFilters.Preferences.getStringPref("filters.currentTemplate");
    if (current == "undefined" || current == "null" || typeof current == "undefined" || current == null) {
      current = ""; // issue 383
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
    awaitReady: null /* init-only gate; NOT a lock for updates */,
    getValue: (k) => cache._data[k],

    waitForNotifyTools: async (maxAttempts = 20, delayMs = 50) => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const notifyTools = quickFilters?.Util?.notifyTools;
        if (notifyTools?.notifyBackground) {
          return notifyTools;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      return null;
    },

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
        case "undefined":
          console.warn("quickFilters.Preferences.cache.setValue- ignoring undefined preference value:", k);
          return;
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
      console.log("quickFilters.Preferences", "Preferences Cache - init()");
      // create an async blocker.
      cache.awaitReady = new Promise((resolve) => {
        // blocks all external callers until we're done here
        cache._resolveReady = resolve;
      });

      let loaded = false;
      try {
        for (let attempt = 0; attempt < 40; attempt++) {
          const notifyTools = await cache.waitForNotifyTools(1, 100);
          if (!notifyTools) {
            continue;
          }
          try {
            console.log("Preferences Cache - notifyTools:", notifyTools);
            const {prefs} = await notifyTools.notifyBackground({
              func: "requestPrefCache",
            });
            console.log("Received preferences Cache:", prefs);
            // remove all old data
            Object.keys(cache._data).forEach((k) => delete cache._data[k]);
            Object.assign(cache._data, prefs);
            loaded = true;
            break;
          } catch (ex) {
            console.warn("requestPrefCache retry failed:", attempt + 1, ex);
          }
        }
      } catch (ex) {
        console.error("requestPrefCache failed:", ex);
      }
      if (!loaded) {
        console.error("Preferences Cache init incomplete: no backend snapshot available yet.");
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
