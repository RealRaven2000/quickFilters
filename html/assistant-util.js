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
    } catch { ; }
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
    let stack = "";
    if (typeof ex.stack != "undefined") {
      stack = ex.stack.replace("@", "\n  ");
    }

    let srcName = ex.fileName ? ex.fileName : "";
    this.logError(aMessage + "\n" + ex.message, srcName, stack, ex.lineNumber, 0, 0x1); // use warning flag, as this is an exception we caught ourselves
  },

  logDebug: async function (...args) {
    const isDebug = await messenger.LegacyPrefs.getPref("extensions.quickfilters.debug");
    if (isDebug) {
      this.logToConsole(...args);
    }
  },
  showHomePage: function (page) {
		const dataUrl = "https://quickfilters.quickfolders.org/" + page;
    messenger.tabs.create({ active: true, url: dataUrl });
  }
};