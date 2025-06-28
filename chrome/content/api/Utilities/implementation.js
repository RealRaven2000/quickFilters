/* eslint-disable object-shorthand */

var { ExtensionCommon } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionCommon.sys.mjs"
)
var win = Services.wm.getMostRecentWindow("mail:3pane");

var { AppConstants } = ChromeUtils.importESModule("resource://gre/modules/AppConstants.sys.mjs");
var quickFilters_ESM = parseInt(AppConstants.MOZ_APP_VERSION, 10) >= 128;
var { MailServices } = quickFilters_ESM
  ? ChromeUtils.importESModule("resource:///modules/MailServices.sys.mjs")
  : ChromeUtils.import("resource:///modules/MailServices.jsm");


console.log("quickFilters - implementation utilities");
// eslint-disable-next-line no-unused-vars
var Utilities = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {    
    
    return {
      Utilities: {
        latestMainWindow: function () {
          return Services.wm.getMostRecentWindow("mail:3pane");
        },

        showToolbarPopup: function () {
          let win = this.latestMainWindow();
          win.quickFilters.Util.showToolbarPopup();
        },

        logDebug(text) {
          win.quickFilters.Util.logDebug(text);
        },

        getUserName: function () {
          const util = win.quickFilters.Util;
          let Accounts = util.Accounts;
          for (let a = 0; a < Accounts.length; a++) {
            let account = Accounts[a];
            if (account.defaultIdentity) {
              let name = account.defaultIdentity.fullName;
              if (name) {
                return name;
              }
            }
          }
          return "user"; // anonymous
        },

        showVersionHistory: function () {
          // It makes sense to only show this in the latest main window
          let win = this.latestMainWindow();
          win.quickFilters.Util.showVersionHistory();
        },

        showXhtmlPage: function (uri) {
          let win = this.latestMainWindow();
          win.openDialog(uri).focus();
        },

        showLicenseDialog: function (referrer) {
          win.quickFilters.Util.showLicenseDialog(referrer);
        },

        getFolderUri: async function (accountId, path = null) {
          const win = Services.wm.getMostRecentWindow("mail:3pane");
          try {
            let retVal = null;
            if (path) {
              // folderManager:
              // https://webextension-api.thunderbird.net/en/128-esr-mv3/experiments/folders_and_messages.html
              let folder = context.extension.folderManager.get(accountId, path);
              if (!folder) {
                return null;
              }
              retVal = folder.URI;
            } else {
              // this is an account.
              retVal = null; 
            }
            return retVal;
          } catch (ex) {
            win.quickFilters.Util.logException("Utilities.getFolderUri()", ex);
            return null;
          }
        },

        async setApplyIncomingFilters(folderURI, enabled) {
          try {
            const Ci = Components.interfaces;
            let folder = MailServices.folderLookup.getFolderForURL(folderURI);
            if (!folder || folder.server.type !== "imap") {
              throw new Error("Only IMAP folders are supported.");
            }
            // Guard: skip if folder is inbox
            if (folder.getFlag && folder.getFlag(Ci.nsMsgFolderFlags.Inbox)) {
              console.warn("setApplyIncomingFilters skipped for inbox folder");
              return false;
            }
            folder.QueryInterface(Ci.nsIMsgImapMailFolder);
            folder.setStringProperty("applyIncomingFilters", enabled ? "true" : "false");
            return true;
          } catch (ex) {
            console.error("setApplyIncomingFilters failed:", ex);
            return false;
          }
        },

        async getApplyIncomingFilters(folderURI) {
          try {
            const Ci = Components.interfaces;
            let folder = MailServices.folderLookup.getFolderForURL(folderURI);
            if (!folder || folder.server.type !== "imap") {
              return false;
            }
            folder.QueryInterface(Ci.nsIMsgImapMailFolder);
            return "true" === folder.getStringProperty("applyIncomingFilters");
          } catch (ex) {
            console.error("getApplyIncomingFilters failed:", ex);
            return false;
          }
        },

        // get may only return something, if a value is set
      },
    };
  };
}

