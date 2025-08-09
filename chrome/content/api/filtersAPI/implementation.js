
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
        getFilters: async function (folderUri, options = "all") {
          const FA = Components.interfaces.nsMsgFilterAction;
          options = (options || "all").toLowerCase();
          console.log("quickFilters - filtersAPI.getFilters()");
          const win = Services.wm.getMostRecentWindow("mail:3pane");
          const util = win.quickFilters.Util;
          if (folderUri === "local") {
            folderUri = "mailbox://nobody@Local%20Folders";
          }
          util.logDebug(`FiltersAPI.getFilters(${folderUri})`);
          const folder = util.getMsgFolderFromUri(folderUri);
          if (!folder) {
            throw new Error(`Folder with URI ${folderUri} not found`);
          }
          const localFolderList = folder.getEditableFilterList(null),
            filterCount = localFolderList.filterCount;
          const results = [];

          // get accountId from folder server
          const accountId = folder.server?.accountKey || folder.server?.key || null;

          for (let i = 0; i < filterCount; i++) {
            const filter = localFolderList.getFilterAt(i);
            const result = {
              filterName: filter.filterName,
              accountId,
            };

            const token = filter.filterName.split(":");
            if (token[0] && token[0].indexOf("quickFilterCustomTemplate") == 0) {
              result.type = "template";
              result.templateName = token[1] ? token[1].trim() : "";
            } else {
              result.type = "filter";
            }
            result.description = filter.description;
            result.enabled = filter.enabled;
            if (options !== "merge") {
              // only return filters that match the folder URI
              results.push(result);
              continue;
            }
            // merge: check all actions for folder URI
            for (let a = 0; a < filter.actionCount; a++) {
              const action = filter.getActionAt(a);
              if (action.type === FA.MoveToFolder || action.type === FA.CopyToFolder) {
                if (action?.targetFolderUri === folderUri) {
                  results.push(result);
                  break; // no need to check further actions
                }
              }
            }
          }
          return results;
        },
      },
    };
  }
};
