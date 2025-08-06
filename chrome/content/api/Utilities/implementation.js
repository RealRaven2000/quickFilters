var { ExtensionCommon } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionCommon.sys.mjs"
);
var win = Services.wm.getMostRecentWindow("mail:3pane");

var { AppConstants } = ChromeUtils.importESModule("resource://gre/modules/AppConstants.sys.mjs");
var quickFilters_ESM = parseInt(AppConstants.MOZ_APP_VERSION, 10) >= 128;
var { MailServices } = quickFilters_ESM
  ? ChromeUtils.importESModule("resource:///modules/MailServices.sys.mjs")
  : ChromeUtils.import("resource:///modules/MailServices.jsm");

// console.log("quickFilters - implementation utilities");

// eslint-disable-next-line no-unused-vars
var Utilities = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {   
     console.log("quickFilters exp API: Utilities.getAPI() called"); 
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

        // retrieve the API messageId for a given folderURI and messageID
        async getApiMessageId(folderURI, messageID) {
          // Get a MessageHeader from an nsIMsgDBHdr.messageId and a folderURI:
          let folder = MailServices.folderLookup.getFolderForURL(folderURI);
          if (!folder) {
            console.warn(`getMessageId: No folder found for URI: ${folderURI}`);
            return null;
          }
          const db = folder.msgDatabase;
          if (!db) {
            console.warn(`Folder database not ready yet for ${folderURI}`);
            return null; // Or throw new Error("DB not ready")
          }
          const messageHdr = db.getMsgHdrForMessageID(messageID); //  nsIMsgDBHdr;
          if (!messageHdr) {
            console.warn(`getMessageId: No message found for msgHdr: ${messageID}`, folderURI);
            return null;
          }
          // https://webextension-api.thunderbird.net/en/stable/experiments/folders_and_messages.html
          try {
            let MessageHeader = await context.extension.messageManager.convert(messageHdr);
            const apiId = MessageHeader?.id; // this is the API messageId
            // what about MessageHeader.headerMessageId
            if (!apiId) {
              console.warn(`getMessageId: No message found for msgHdr: ${messageID}`, messageHdr);
              return null;
            }
            return apiId;
          } catch (ex) {
            console.error("messageManager.convert failed:", ex);
            return -1;
          }
        },

        resolveAssistant:  async (requestId, result, params) => {
          win.quickFilters.Util.logDebugOptional(
            "assistant",
            `resolveAssistant(${requestId}) called with result: ${result}, params: ${params}`
          );

          let pending = win.quickFilters._pendingAssistantRequests;
          if (pending && pending[requestId]) {
            let resolve = pending[requestId];
            delete pending[requestId]; // clean up after resolving

            // Create the full results object as expected
            const results = {
              result,
              params,
            };

            win.quickFilters.Util.logDebugOptional(
              "assistant",
              `Resolving ${requestId} with Result:`,
              results
            );

            // Call the stored resolve function with the full results object
            resolve(results);

            return true;
          }
          return false; // request ID not found
        },
      },
    };
  };
}

