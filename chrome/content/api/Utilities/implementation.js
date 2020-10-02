/* eslint-disable object-shorthand */

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm"),
    { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm"),
    win = Services.wm.getMostRecentWindow("mail:3pane");
//das geht nicht:
//Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-preferences.js", window, "UTF-8");

console.log("quickFilters - implementation utilities");
var Utilities = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {    
    
    const PrefTypes = {
      [Services.prefs.PREF_STRING] : "string",
      [Services.prefs.PREF_INT] : "number",
      [Services.prefs.PREF_BOOL] : "boolean",
      [Services.prefs.PREF_INVALID] : "invalid"
    };

    return {
      Utilities: {

        logDebug (text) {
          win.quickFilters.Util.logDebug(text);
        },

        isLicensed() {
          return  (win.quickFilters.Licenser).isValidated;
        },
        
        LicenseIsExpired() {
          return  win.quickFilters.Licenser.isExpired;
        },

        LicenseIsProUser() {
          return  win.quickFilters.Util.hasPremiumLicense(false);
        },


        getAddonVersion() {
          const util = win.quickFilters.Util;
          return util.Version;
        },

        getTBVersion() { //somehow(??), we can also get this in MX
          return Services.appinfo.version;//win.quickFilters.Util.VersionSanitized;
        },


        getAddonName() {
          const util = win.quickFilters.Util;
          return 'quickFilters';
        },


        openLinkExternally(url) {
          let uri = url;
          if (!(uri instanceof Ci.nsIURI)) {
            uri = Services.io.newURI(url);
          }
          
          Cc["@mozilla.org/uriloader/external-protocol-service;1"]
            .getService(Ci.nsIExternalProtocolService)
            .loadURI(uri);
        },

        showXhtmlPage(uri) {
          let mail3PaneWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
            .getService(Components.interfaces.nsIWindowMediator)
            .getMostRecentWindow("mail:3pane");  
          mail3PaneWindow.openDialog(uri);
        }
  
        // get may only return something, if a value is set
     }
  }
};
}
