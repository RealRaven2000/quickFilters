/* BEGIN LICENSE BLOCK

quickFolders is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK */

quickFilters.Util = {
  lastTime: 0,
  debugStyle: { color: "#ffffe0", background: "#008000" },
  debugStyleImportant: { color: "rgba(250, 235, 119, 1)", background: "#9d4201ff" },
  debugStyleWarning: { color: "rgba(250, 235, 119, 1)", background: "#930f08ff" },
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
    const { debug } = await browser.storage.local.get({ debug: {} });
    if (debug.debugActive) {
      this.logToConsole(...args);
    }
  },

  /**
   * Optional logging for important points in flow.
   *
   * Supports two calling styles:
   *
   * Preferred:
   *   logHighlightDebug("Message", { color: "yellow", background: "black"}, ...args);
   *
   * The style object defaults to:
   *   { color: "white", background: "rgb(80,0,0)" }
   *
   * Backwards compatible:
   *   logHighlightDebug("Message", "yellow", "black", ...args);
   *
   * @param {string} txt               Message text to highlight.
   * @param {object|string} style      Formatting options or legacy color string.
   * @param {string} style.color       [legacy calling style] CSS text color.
   * @param {string} style.background  [legacy calling style] CSS background color.
   * @param {...any} args              Additional values passed to console.log().
   */
  logHighlightDebug: function (txt, format = {}, ...args) {
    let p = quickFilters.Preferences.isDebug;
    if (!p) {
      return;
    }
    const defaultBackground = "#008000"; // dark green

    // backwards compatibility:
    // logHighlightDebug(txt, "white", "rgb(80,0,0)", ...args)
    if (typeof format === "string") {
      format = {
        color: format,
        background: args.shift() ?? defaultBackground,
      };
    }

    let { color = "white", background = defaultBackground } = format;

    console.log(`%c${txt}`, `color: ${color}; background: ${background}`, ...args);
  },

  logDebugOptional: async function (optionString, _msg) {
    try {
      const { debug } = await browser.storage.local.get({ debug: {} });
      if (!debug.debugActive) {
        return;
      }
      const options = optionString.split(",");
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const key = `debug.${option}`;
        // TODO: check if works
        if (debug[key] === true) {
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
