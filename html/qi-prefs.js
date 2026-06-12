"use strict";
/* BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK */
quickFilters.Preferences = {
  async getBoolPref(p) {
    if (p.startsWith("debug")) {
      const { debug } = await browser.storage.local.get({ debug: {} });
      if (p === "debug") {
        return debug.debugActive;
      }
      return debug[p];
    }

    const { options } = await browser.storage.local.get({ options: {} });
    return options[p];
  },

  async setBoolPref(p, v) {
    if (p === "debugActive") {
      const { debug } = await browser.storage.local.get({ debug: {} });
      debug.debugActive = v;
      await browser.storage.local.set({ debug });
      return;
    }

    const { options } = await browser.storage.local.get({ options: {} });
    options[p] = v;
    return browser.storage.local.set({ options });
  },

  async isDebug() {
    return await this.getBoolPref("debug");
  },

  async isDebugOption(option) {
    if (!(await this.isDebug())) {
      return false;
    }

    return await this.getBoolPref("debug." + option);
  },
};