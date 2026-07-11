/*
  globals
*/

console.log("Loading qi-util.js");
quickFilters.Util = {
  ADDON_SUPPORT_MAIL: "axel.grude@gmail.com",

  logTime: function logTime() {
    let timePassed = "",
      end = new Date(),
      endTime = end.getTime();
    try {
      // AG added time logging for test
      if (this.lastTime == 0) {
        this.lastTime = endTime;
        return "[logTime init]";
      }
      let elapsed = new String(endTime - this.lastTime); // time in milliseconds
      timePassed = "[" + elapsed + " ms]   ";
      this.lastTime = endTime; // remember last time
    } catch  { ; }
    return `${end.getHours()}:${end.getMinutes()}:${end.getSeconds()}.${end.getMilliseconds()}  ${timePassed}`;
  },

  // first argument is the option tag
  logWithOption: function logWithOption(_a) {
    arguments[0] =
      "QuickFolders " +
      "{" +
      arguments[0].toUpperCase() +
      "} " +
      quickFilters.Util.logTime() +
      "\n";
    console.log(...arguments);
  },

  logToConsole: function logToConsole(_a) {
    let msg = "QuickFolders " + quickFilters.Util.logTime() + "\n";
    console.log(msg, ...arguments);
  },

  logException: function logException(aMessage, ex) {
    /*
      let stack = "";
      if (typeof ex.stack != "undefined") {
        stack = ex.stack.replace("@", "\n  ");
      }
      // let's display a caught exception as a warning.
      let fn = ex.fileName || "?";
      this.logError(aMessage + "\n" + ex.message, fn, stack, ex.lineNumber, 0, 0x1);
    */
    console.error(aMessage, ex);
  },

  logDebug: async function (_a) {
    if (await quickFilters.Preferences.isDebug()) {
      this.logToConsole(...arguments); /* ...msg */
    }
  },

  logMissing: function (txt) {
    console.log(
      `%cFUNCTION Work in Progress - to do: %c${txt}`,
      "color:blue;",
      "background: blue; color:yellow;"
    );
  },

  getBaseURI: (URL) => {
    let hashPos = URL.indexOf("#");
    let queryPos = URL.indexOf("?");
    let baseURL = URL;

    if (hashPos > 0) {
      baseURL = URL.substring(0, hashPos);
    } else if (queryPos > 0) {
      baseURL = URL.substring(0, queryPos);
    }

    if (baseURL.endsWith("/")) {
      baseURL = baseURL.substring(0, baseURL.length - 1);
    }

    return baseURL;
  },
  openInBrowser: (url) => {
    messenger.windows.openDefaultBrowser(url);
  },
  openLinkInTab: async (URL) => {
    try {
      let baseURI = quickFilters.Util.getBaseURI(URL);
      let tabs = await messenger.tabs.query({});

      // Check if a FiltaQuilla help tab is already open
      // here I am reading tab.url which requirest the "tabs" permission in manifest.json
      let existingTab = tabs.find((t) => t.url && quickFilters.Util.getBaseURI(t.url) === baseURI);

      if (existingTab) {
        await messenger.tabs.update(existingTab.id, { active: true, url: URL });
      } else {
        await messenger.tabs.create({ url: URL });
      }
    } catch (ex) {
      console.error("quickFilters.Util.openLinkInTab() failed: ", ex);
    }
  },
  showYouTube: () => {
    // was openLinkInBrowserForced
    messenger.windows.openDefaultBrowser("https://www.youtube.com/c/thunderbirddaily");
  },
  showHomePage: () => {
    quickFilters.Util.openLinkInTab("https://quickfilters.quickfolders.org/");
  },
  showYouTubePage: () => {
    quickFilters.Util.openLinkInTab("https://www.youtube.com/c/thunderbirddaily");
  },
  showGithub: () => {
    messenger.windows.openDefaultBrowser("https://github.com/RealRaven2000/quickFilters/issues/");
  },
  showCopySentToCurrent: () => {
    quickFilters.Util.openLinkInTab(
      "https://addons.thunderbird.net/thunderbird/addon/copy-sent-to-current/"
    );
  },
  viewSplash: () => {
    messenger.runtime.sendMessage({
      command: "splashScreen",
    });
  },
};
