/* BEGIN LICENSE BLOCK

quickFolders is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK */

quickFilters.Util = {
  lastTime: 0,
  logTime: function () {
    let timePassed = "",
      end = new Date(),
      endTime = end.getTime();
    try {
      if (this.lastTime === 0) {
        this.lastTime = endTime;
        return "[logTime init]";
      }
      let elapsed = new String(endTime - this.lastTime); // time in milliseconds
      timePassed = "[" + elapsed + " ms]   ";
      this.lastTime = endTime; // remember last time
    } catch {;}
    return (
      `${end.getHours()}:${end.getMinutes()}:${end.getSeconds()}.${end.getMilliseconds()} ` +
      timePassed
    );
  },
  logToConsole: function (...args) {
    let msg = "quickFilters " + quickFilters.Util.logTime() + "\n";
    console.log(msg, ...args);
  },
  logException: function (aMessage, ex) {
    /*
    let stack = "";
    if (typeof ex.stack != "undefined") {
      stack = ex.stack.replace("@", "\n  ");
    }

    let srcName = ex.fileName ? ex.fileName : "";
    */
    console.error(aMessage, ex);
    // this.logError(aMessage + "\n" + ex.message, srcName, stack, ex.lineNumber, 0, 0x1); // use warning flag, as this is an exception we caught ourselves
  },

  logWithOption: function (_a) {
    // first argument is the option tag
    arguments[0] =
      "quickFilters " + `{${arguments[0].toUpperCase()}} ${quickFilters.Util.logTime()}\n`;
    console.log(...arguments);
  },

  logDebug: async function (...args) {
    const isDebug = await messenger.LegacyPrefs.getPref("extensions.quickfilters.debug");
    if (isDebug) {
      this.logToConsole(...args);
    }
  },

  logHighlightDebug: async function (txt, color = "white", background = "rgb(80,0,0)", ...args) {
    const isDebug = await messenger.LegacyPrefs.getPref("extensions.quickfilters.debug");
    if (isDebug) {
      console.log(`quickFilters %c${txt}`, `color: ${color}; background: ${background}`, ...args);
    }
  },

  logDebugOptional: async function (optionString, _msg) {
    try {
      const options = optionString.split(",");
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const isDebug = await messenger.LegacyPrefs.getPref(
          `extensions.quickfilters.debug.${option}`
        );
        if (isDebug) {
          this.logWithOption(...arguments);
          break; // only log once, in case multiple log switches are on
        }
      }
    } catch {;}
  },

  showHomePage: function (page) {
    const dataUrl = "https://quickfilters.quickfolders.org/" + page;
    messenger.tabs.create({ active: true, url: dataUrl });
  },
};
