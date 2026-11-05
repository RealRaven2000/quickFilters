var { ExtensionCommon } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionCommon.sys.mjs"
);
var win = Services.wm.getMostRecentWindow("mail:3pane");

var { MailServices } = ChromeUtils.importESModule("resource:///modules/MailServices.sys.mjs");

// console.log("quickFilters - implementation utilities");

// eslint-disable-next-line no-unused-vars
var Utilities = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {   
    const highlightStyle = { color: "#ffff0bff", background: "rgba(112, 15, 161, 1)" };
    console.log("quickFilters exp API: Utilities.getAPI() called"); 
    // Private per-API scope: extension reloads must not reuse a cached system module.
    const loadPackageScript = (path, target) => {
      Services.scriptloader.loadSubScriptWithOptions(context.extension.rootURI.resolve(path), {
        target,
        charset: "UTF-8",
        ignoreCache: true,
        // Match WindowListener: opt in to our package's file:/jar: URLs.
        allowUnsafeURL: true,
      });
    };
    const usageScope = { quickFiltersPremium: {} };
    loadPackageScript("scripts/premium/usage-policy.js", usageScope);
    loadPackageScript("scripts/premium/usage-store.js", usageScope);
    // Extension-owned state coordinates API scopes without adding window globals.
    const shared = context.extension.quickFiltersPremiumUsage ||=
      { pending: Promise.resolve() };
    const usage = usageScope.quickFiltersPremium.createUsageStore(Services.prefs, undefined, {
      queue: shared,
      sessionId: String(Services.appinfo.processID) + ":" + Number(Services.startup.getStartupInfo().process),
      storage: {
        async get(defaults) {
          const storage = context.apiCan.findAPIPath("storage");
          return storage.local.callMethodInParentProcess("get", [defaults]);
        },
        async set(values) {
          const storage = context.apiCan.findAPIPath("storage");
          return storage.local.callMethodInParentProcess("set", [values]);
        },
      },
    });
    return {
      Utilities: {
        initializeProFeatureUsage: async () => usage.initialize(),
        consumeProFeatureUsage: async (feature) => usage.consume(feature),
        updateProFeatureUsageLicenseState: async (valid) => usage.updateLicenseState(valid),
        async ensureQuickFoldersButtons() {
          // #396: a notification cannot recover a document whose listener was never injected.
          let initializedTabs = 0;
          let integratedTabs = 0;
          for (const mainWindow of Services.wm.getEnumerator("mail:3pane")) {
            const documents = [];
            for (const tab of mainWindow.document.getElementById("tabmail")?.tabInfo || []) {
              if (tab.mode.name !== "mail3PaneTab") {
                continue;
              }
              const target = tab.chromeBrowser?.contentWindow;
              if (!target || target.closed || target.location.href !== "about:3pane") {
                continue;
              }
              const scope = target["AddOnNS" + context.extension.instanceId];
              if (!scope?.injectQuickFoldersNavigationBarElements) {
                continue;
              }
              await scope.injectQuickFoldersNavigationBarElements(target);
              initializedTabs++;
              documents.push(target.document);
            }
            if (mainWindow.quickFilters) {
              await mainWindow.quickFilters.toggleCurrentFolderButtons();
            }
            for (const document of documents) {
              const toolbar = document.getElementById("QuickFolders-CurrentFolderTools");
              if (toolbar && [
                "quickfilters-current-runbutton",
                "quickfilters-current-msg-runbutton",
                "quickfilters-current-listbutton",
                "quickfilters-current-searchfilterbutton",
              ].every(id => document.getElementById(id)?.parentNode === toolbar)) {
                integratedTabs++;
              }
            }
          }
          return {
            ok: initializedTabs > 0 && integratedTabs === initializedTabs,
            initializedTabs,
            integratedTabs,
          };
        },


        latestMainWindow: function () {
          return Services.wm.getMostRecentWindow("mail:3pane");
        },

        showToolbarPopup: async function () {
          // The toolbar can be clicked before WindowListener finishes injection.
          // Use an API-owned timer: the main window may close while we wait.
          const { setTimeout } = ChromeUtils.importESModule("resource://gre/modules/Timer.sys.mjs");
          const TIMEOUTSECONDS = 25;
          const deadline = Date.now() + TIMEOUTSECONDS * 1000;
          while (true) {
            const win = Services.wm.getMostRecentWindow("mail:3pane");
            if (
              win && !win.closed &&
              typeof win.quickFilters?.Util?.showToolbarPopup === "function" &&
              win.document.getElementById("quickFiltersMainPopup")
            ) {
              win.quickFilters.Util.showToolbarPopup();
              return;
            }
            if (Date.now() >= deadline) {
              throw new Error(`Utilities.showToolbarPopup(): quickFilters object not ready within ${TIMEOUTSECONDS} seconds.`);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        },

        logDebug(...args) {
          let win = this.latestMainWindow();
          if (win?.quickFilters?.Util?.logDebug) {
            win.quickFilters.Util.logDebug(...args);
            return;
          }
          console.log("quickFilters logDebug (early):", ...args);
        },

        getUserName: function () {
          try {
            const Accounts = MailServices.accounts;
            for (let a = 0; a < Accounts.length; a++) {
              let account = Accounts[a];
              if (account.defaultIdentity) {
                let name = account.defaultIdentity.fullName;
                if (name) {
                  return name;
                }
              }
            }
          } catch (ex) {
            console.warn("Utilities.getUserName() failed:", ex);
          }
          return "User"; // anonymous
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

        showAboutConfig: function (filter) {
          const name = "Preferences:ConfigManager",
            mediator = Services.wm,
            uri = "about:config";

          let w = mediator.getMostRecentWindow(name),
            win = mediator.getMostRecentWindow("mail:3pane");

          if (!w) {
            let watcher = Services.ww;
            w = watcher.openWindow(
              win,
              uri,
              name,
              "chrome,resizable,centerscreen,width=800px,height=380px",
              null
            );
          }
          w.focus();
          w.addEventListener("load", function () {
            let id = "about-config-search",
              flt = w.document.getElementById(id);
            if (flt) {
              flt.value = filter;
              // make filter box readonly to prevent damage!
              flt.setAttribute("readonly", true);
              if (w.self.FilterPrefs) {
                w.self.FilterPrefs();
              }
            }
          });
        },

        // Uses quickFilters' custom experiment bridge: context.extension.folderManager.get(accountId, path).
        // This is not a stock MailExtension API and intentionally maps accountId/path to nsIMsgFolder.URI.
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
            if (folder.isServer) {
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

        resolveAssistant: async (requestId, result, params) => {
          win.quickFilters.Util.logHighlightDebug(
            "quickFilters API",
            highlightStyle,
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

            win.quickFilters.Util.logHighlightDebug(
              "quickFilters API",
              highlightStyle,
              `Resolving ${requestId} with Result:`,
              results
            );

            // Call the stored resolve function with the full results object
            resolve(results);

            return true;
          }
          console.warn(
            `resolveAssistant(): requestId "${requestId}" not found in pending requests.`
          );
          return false; // request ID not found
        },

        createCustomTemplate: () => {
          win.quickFilters.Util.createCustomTemplate();
        },

        editCustomTemplates: () => {
          return win.quickFilters.Util.editCustomTemplates();
        },

        updatePreferencesCache: (data) => {
          const windowTypes = ["mail:3pane", "mail:messageWindow"]; // "msgcompose",
          for (const type of windowTypes) {
            const enumerator = Services.wm.getEnumerator(type);
            while (enumerator.hasMoreElements()) {
              const targetWindow = enumerator.getNext();
              if (targetWindow.quickFilters?.Preferences?.cache?.updateFromBackend) {
                targetWindow.quickFilters.Preferences.cache.updateFromBackend(data);
              }
            }
          }
          return true;
        },

      },
    };
  };
}
