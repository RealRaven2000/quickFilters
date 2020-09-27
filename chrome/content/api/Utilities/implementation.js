/* eslint-disable object-shorthand */

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
//das geht nicht:
//var { QF } = ChromeUtils.import("chrome://quickfolders/content/quickfolders.js");  
//var { utils } = ChromeUtils.import("chrome://quickfolders/content/quickfolders-util.js");
//var { addonPrefs } = ChromeUtils.import("chrome://quickfolders/content/quickfolders-preferences.js");
//Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-preferences.js", window, "UTF-8");
var win= Services.wm.getMostRecentWindow("mail:3pane");

console.log("impl utilities");
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

        isLicensed() {
          const util = win.QuickFolders.Util;
          let licenser = util.Licenser;
          let isPremiumLicense = util.hasPremiumLicense(false) || util.Licenser.isExpired;
      
        return  isPremiumLicense;//(win.QuickFolders.Licenser).isLicensed;
         
        },


        getAddonVersion() {
          return "qFi yyy";//TODOwin.QuickFolders.Util.Version;
        },

        getTBVersion() { //somehow(??), we can also get this in MX
          return Services.appinfo.version;//win.QuickFolders.Util.VersionSanitized;
        },


        getAddonName() {
          return "qFi";//TODOwin.QuickFolders.Util.ADDON_NAME;
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
