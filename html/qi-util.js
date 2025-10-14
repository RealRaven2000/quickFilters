console.log("Loading qi-util.js");
quickFilters.Util = {
  ADDON_SUPPORT_MAIL: "axel.grude@gmail.com",
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