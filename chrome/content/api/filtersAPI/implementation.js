
var { ExtensionCommon } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionCommon.sys.mjs"
);
var { AppConstants } = ChromeUtils.importESModule("resource://gre/modules/AppConstants.sys.mjs");
var quickFilters_ESM = parseInt(AppConstants.MOZ_APP_VERSION, 10) >= 128;
var { MailServices } = quickFilters_ESM
  ? ChromeUtils.importESModule("resource:///modules/MailServices.sys.mjs")
  : ChromeUtils.import("resource:///modules/MailServices.jsm");


// eslint-disable-next-line no-unused-vars
var FiltersAPI = class extends ExtensionCommon.ExtensionAPI {
  // eslint-disable-next-line no-unused-vars
  getAPI(context) {
    return {
      FiltersAPI: {
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
