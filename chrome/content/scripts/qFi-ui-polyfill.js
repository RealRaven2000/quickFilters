/* globals 
  WL
*/



(function quickFiltersUIPolyfills() {
  const Util = window.quickFilters.Util;
  Util.logDebug("Polyfills loading in window:", window.location.href);
  var Services =
    globalThis.Services || ChromeUtils.import("resource://gre/modules/Services.jsm").Services;

  const isPoly143 = Util.versionGreaterOrEqual(Services.appinfo.version, "143");
  // add more in the future here...

  if (!isPoly143) {
    Util.logDebug("quickFiltersUIPolyfills()\n","Nothing to do, early exit...");
  }

  const willy = typeof WL !== "undefined" ? WL : window.quickFilters?.WL;

  if (!willy) {
    Util.logHighlightDebug(
      "Can't polyfill menu items, no WindowListener in:",
      "pink",
      "rgb(40,0,0)",
      `window location= ${window.location.href}`
    );
    return;
  }

  // Style all menu items.

  // Tb143+ override
  // Deals with [issue 390] Thunderbird 143: all menu icons of all popups broken
  if (isPoly143) {
    willy.injectCSS("chrome://quickfilters/content/quickfilters-menus-143.css?v=3");
  }

  // Future regression patches can be added here
})();