/* eslint-disable object-shorthand */

var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm"),
    { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm"),
    win = Services.wm.getMostRecentWindow("mail:3pane");

console.log("quickFilters - implementation utilities");
var Utilities = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {    
    
    return {
      Utilities: {
        
        latestMainWindow : function() {
          return Services.wm.getMostRecentWindow("mail:3pane");
        },

        logDebug (text) {
          win.quickFilters.Util.logDebug(text);
        },
        
        getUserName : function () {
          const util = win.quickFilters.Util;
          let Accounts = util.Accounts; 
          for (let a=0; a<Accounts.length; a++) {
            let account = Accounts[a];
            if (account.defaultIdentity) 
            { 
              let name = account.defaultIdentity.fullName;
              if (name) return name;
            }
          }    
          return "user"; // anonymous
        },
        
        showVersionHistory: function() {
          // It makes sense to only show this in the latest main window
          let win = this.latestMainWindow();
          win.quickFilters.Util.showVersionHistory();
        },

        showXhtmlPage: function(uri) {
          let win = this.latestMainWindow();
          // let mail3PaneWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
            // .getService(Components.interfaces.nsIWindowMediator)
            // .getMostRecentWindow("mail:3pane");  
          win.openDialog(uri).focus();
        },
        
        showLicenseDialog: function(referrer) {
          win.quickFilters.Util.showLicenseDialog(referrer);
        }       
  
        // get may only return something, if a value is set
      }
    }
  };
}

