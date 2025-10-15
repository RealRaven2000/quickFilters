"use strict";
/* BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK */
quickFilters.Preferences = {
  root: "extensions.quickfilters.",

  getBoolPref: async function getBoolPref(p) {
    let ans = false,
      key = p.startsWith(quickFilters.Preferences.root) ? p : quickFilters.Preferences.root + p;

    try {
      ans = await browser.LegacyPrefs.getPref(key);
    } catch (ex) {
      quickFilters.Util.logException("getBoolPref(" + p + ") failed\n", ex);
      throw ex;
    }
    return ans;
  },

  setBoolPref: async function setBoolPref(p, v) {
    let key = p.startsWith(quickFilters.Preferences.root) ? p : quickFilters.Preferences.root + p;
    return await browser.LegacyPrefs.setPref(key, v);
  },

  isDebug: async function () {
    return await this.getBoolPref("debug");
  },

  isDebugOption: async function (option) {
    // granular debugging
    if (!(await this.isDebug())) {
      return false;
    }
    try {
      return this.getBoolPref("debug." + option);
    } catch {
      return true; // more info is probably better in this case - this is an illegal value after all.
    }
  },
};