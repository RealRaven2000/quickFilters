
var { ExtensionCommon } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionCommon.sys.mjs"
);
var { MailServices } = ChromeUtils.importESModule("resource:///modules/MailServices.sys.mjs");


// eslint-disable-next-line no-unused-vars
var FiltersAPI = class extends ExtensionCommon.ExtensionAPI {
  // eslint-disable-next-line no-unused-vars
  getAPI(context) {
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
    const t = (key, substitutions = []) => context.extension.localeData.localizeMessage(key, substitutions.map(String));
    const backupAPI = { Services, IOUtils, Components, ChromeUtils, console, t };
    loadPackageScript("chrome/content/api/filtersAPI/backup.js", backupAPI);
    const restoreAPI = { Services, Components, ChromeUtils, console, t };
    loadPackageScript("chrome/content/api/filtersAPI/restore.js", restoreAPI);
    const usageScope = { quickFiltersPremium: {} };
    loadPackageScript("scripts/premium/usage-policy.js", usageScope);
    loadPackageScript("scripts/premium/usage-store.js", usageScope);
    const usage = usageScope.quickFiltersPremium.createUsageStore(Services.prefs);
    const troubleshooterAPI = { Services, Components, ChromeUtils, console, t,
      // Background synchronizes this flag after startup and every license validation.
      isTroubleshooterLicensed: () => Services.prefs.getBoolPref("extensions.quickFilters.usage.wasLicensed", false),
      consumeTroubleshooterUsage: () => usage.consume("troubleshooter"),
      getSessionStorage: () => context.apiCan.findAPIPath("storage").session };
    loadPackageScript("chrome/content/api/filtersAPI/troubleshooter.js", troubleshooterAPI);
    return {
      FiltersAPI: {
        getTroubleshooterInfo: async () => troubleshooterAPI.getTroubleshooterInfo(),
        beginTroubleshooting: async () => troubleshooterAPI.beginTroubleshooting(),
        endTroubleshooting: async (session) => troubleshooterAPI.endTroubleshooting(session),
        scanFilters: async (session, accountId, checks) => troubleshooterAPI.scanFilters(session, accountId, checks),
        getFilterConditionText: async (session, token) => troubleshooterAPI.getFilterConditionText(session, token),
        remedyFilter: async (session, token, remedy) => troubleshooterAPI.remedyFilter(session, token, remedy),
        openFilterLog: async (accountId) => troubleshooterAPI.openFilterLog(accountId),
        openFilterAddons: async () => troubleshooterAPI.openFilterAddons(),
        confirmFilterDeletion: async (name) => {
          const checked = { value: false };
          const confirmed = Services.prompt.confirmCheck(Services.wm.getMostRecentWindow("mail:3pane"),
            "quickFilters", t("backup.confirm.deleteFilter", [name]), t("backup.confirm.doNotAskAgain"), checked);
          return { confirmed, doNotAskAgain: checked.value };
        },
        confirmBackupChanges: async () => {
          const prompt = Services.prompt;
          const flags = prompt.BUTTON_POS_0 * prompt.BUTTON_TITLE_YES + prompt.BUTTON_POS_1 * prompt.BUTTON_TITLE_NO;
          return prompt.confirmEx(Services.wm.getMostRecentWindow("mail:3pane"), "quickFilters",
            t("backup.confirm.backupChanges"),
            flags, null, null, null, null, {}) === 0;
        },
        restoreFilters: async (request) => restoreAPI.restoreFilters(request),
        editImportedFilter: async (token) => restoreAPI.editImportedFilter(token),
        deleteImportedFilter: async (token) => restoreAPI.deleteImportedFilter(token),
        saveRestoreReport: async (text, directory) => backupAPI.saveRestoreReport(text, directory),
        getBackupInfo: async (accountIds) => {
          return backupAPI.getBackupInfo(accountIds);
        },
        getBackupSelection: async (token) => backupAPI.getBackupSelection(token),
        exportBackupAccounts: async (accountIds, selectionToken) => {
          return backupAPI.exportBackupAccounts(accountIds, restoreAPI.registerReviewFilter, selectionToken);
        },
        saveBackupFile: async (filename, text, directory) => {
          return backupAPI.saveBackupFile(filename, text, directory);
        },
        readBackupFile: async (directory) => {
          return backupAPI.readBackupFile(directory);
        },
        returnToFilterList: async (token) => {
          return backupAPI.returnToFilterList(token);
        },

        /**
         * Convert nsIMsgFilter to a simple { accountId, filterName } object.
         * @param {nsIMsgFilter} filter
         * @returns {Object} tuple
         */
        convertFilterToApi: function (filter) {
          if (!filter) {
            throw new Error("No filter provided");
          }
          const folder = filter.folder;
          if (!folder) {
            throw new Error("Filter has no associated folder");
          }
          const accountId = folder.server?.serverURI;
          const filterName = filter.filterName;
          return { accountId, filterName };
        },

        /**
         * Convert a tuple back to nsIMsgFilter object.
         * @param {Object} tuple {accountId, filterName}
         * @returns {nsIMsgFilter}
         */
        convertFilterFromApi: function ({ accountId, filterName }) {
          if (!accountId || !filterName) {
            throw new Error("Invalid tuple: accountId and filterName required");
          }

          const account = MailServices.accounts.allAccounts.find(
            (acct) => acct.incomingServer?.serverURI === accountId
          );

          if (!account) {
            throw new Error(`Account with URI ${accountId} not found`);
          }

          const rootFolder = account.incomingServer.rootFolder;
          const filterList = MailServices.filters.getTempFilterList(rootFolder);

          for (let i = 0; i < filterList.filterCount; i++) {
            let f = filterList.getFilterAt(i);
            if (f.filterName === filterName) {
              return f;
            }
          }

          throw new Error(`Filter named "${filterName}" not found in account "${accountId}"`);
        },

        // retrieve a list of filters for a given account (through a folder URI)
        // options: set to "merge" to only return filters that move / copy mail to the folder
        getFilters: async function (
          sourceUri,
          targetUri = "",
          filterAction = null,
          filterActionExt = null
        ) {
          const FA = Components.interfaces.nsMsgFilterAction;

          console.log("quickFilters - filtersAPI.getFilters()");
          const win = Services.wm.getMostRecentWindow("mail:3pane");
          const util = win.quickFilters.Util;

          if (sourceUri === "local") {
            sourceUri = "mailbox://nobody@Local%20Folders";
          }
          util.logDebug(`FiltersAPI.getFilters(${sourceUri})`);

          const folder = util.getMsgFolderFromUri(sourceUri);
          if (!folder) {
            throw new Error(`Folder with URI ${sourceUri} not found`);
          }

          const localFolderList = folder.getEditableFilterList(null),
            filterCount = localFolderList.filterCount;
          const results = [];

          // get accountId from folder server
          const accountId = folder.server?.accountKey || folder.server?.key || null;

          util.logDebug(
            `found ${filterCount} filters for server[${accountId}] ${folder?.server?.prettyName}. Iterating...`
          );

          const prefs = win.quickFilters.Preferences;
          const isFirstActionOnly = prefs.getBoolPref("assistant.merge.firstActionOnly");
          const isDebugDetail = prefs.getBoolPref("debug.FiltersAPI");

          for (let i = 0; i < filterCount; i++) {
            const filter = localFolderList.getFilterAt(i);
            const result = {
              filterName: filter.filterName,
              accountId,
            };
            if (isDebugDetail) { 
              console.log(`Checking filter ${i} : ${result.filterName} ...`); 
            }

            const token = filter.filterName.split(":");
            if (token[0] && token[0].indexOf("quickFilterCustomTemplate") == 0) {
              result.type = "template";
              result.templateName = token[1] ? token[1].trim() : "";
            } else {
              result.type = "filter";
            }
            result.description = filter.description || "";
            result.enabled = filter.enabled;
            result.matchedActionType = null; 
            result.matchedActionExt = null; 
            if (!targetUri && !filterAction && !filterActionExt) {
              // only return filters that match the folder URI
              results.push(result);
              continue;
            }
            // merge: check all actions for folder URI
            const bounds = isFirstActionOnly ? 1 : filter.actionCount;
            for (let a = 0; a < bounds; a++) {
              if (results.some(r => r.filterName === result.filterName && r.accountId === result.accountId)) {
                break;
              }
              let action;
              try {
                action = filter.getActionAt(a);
              } catch {
                console.warn(`No action[${a}], skipping filter ${result.filterName}...`);
                if (!filterAction) {
                  results.push(result);
                }
                continue;
              }
              result.matchedActionType = action?.type; // nsMsgFilterAction constant
              if (action.type === FA.MoveToFolder || action.type === FA.CopyToFolder) {
                if (targetUri && action?.targetFolderUri === targetUri) {
                  result.matchedActionExt = targetUri; 
                  results.push(result);
                  break; // no need to check further actions
                }
              }
              if (action.type === filterAction) {  
                switch (action.type) {
                  case FA.Delete:
                    results.push(result);
                    break;
                  case FA.AddTag:
                    if (filterActionExt && filterActionExt==action.strValue) {
                      result.matchedActionExt = action.strValue
                      results.push(result);
                    }
                    break;
                  case FA.Custom:
                    if (
                      filterActionExt === "Archive" &&
                      action.customId === "filtaquilla@mesquilla.com#archiveMessage"
                    ) {
                      result.matchedActionExt = action.customId;
                      results.push(result);
                    }
                    break;
                }
                break;
              }
            }
          }
          if (isDebugDetail) { 
            console.log("Returning results.", results);
          }
          return results;
        },
      },
    };
  }
};
