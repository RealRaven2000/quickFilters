import { Preferences } from "./scripts/preferences.js";
import * as util from "./scripts/qi-util.mjs.js";
import {Licenser} from "./scripts/Licenser.mjs.js";
import { compareVersions } from "./scripts/mozilla-version-comparator.js";
// very nice config editor by John B:
import * as webExtensionStorageEditor from "./scripts/webExtensionStorageEditor.mjs";

// Open a popup showing local storage, with an optional filter
/*
webExtensionStorageEditor.open({
    storageArea: 'local',
    baseFilter: 'debug.',
    type: 'popup',
});
*/

const QUICKFOLDERS_APPNAME = "quickfolders@curious.be";
const RUNFILTERFROMTREE_ID = "runFiltersFolderPane";
const TOGGLE_APPLY_FILTERS_ID = "toggleApplyIncomingFilters";
const FINDFILTERS_ID = "findFiltersFolder";
const CREATEFILTERFROMMSG_ID = "createFromMailContext";
const TOGGLE_ASSIST_TOOL_ID = "toggleFilterTools";

var currentLicense;
var QF_license = {status:"unknown", type: 0}
var callbacks = [];
// Worker.FilterMode
var AssistantActive = false;


function versionGreater(v1, v2) {
  return compareVersions(v1, v2) > 0;
}

const startup = Promise.withResolvers();

//TODO: textbox in CSS, search box??
//TODO mailWindowOverlay: was never in use??
//debugger;
messenger.runtime.onInstalled.addListener(async ({ reason, _temporary }) => {
  await prefsReady;
  let isDebug = Preferences.isDebug();
  // Wait until the main startup routine has finished!
  const res = await startup.promise;
  messenger.Utilities.logDebug(
    `runtime startup / installation listeners\nResult: ${res}\n` + `onInstalled Reason: ${reason}`
  );

  if (isDebug) {
    console.log("Startup has finished");
    console.log("quickFilters - currentLicense", currentLicense);
  }

  // if (temporary) return; // skip during development
  switch (reason) {
    case "install":
      if (isDebug) {
        console.log("quickFilters onInstalled Listener - install...");
      }
      await browser.windows.create({
        url: browser.runtime.getURL("popup/installed.html"),
        type: "popup",
        width: 900,
        height: 750,
      });
      break;
    // see below
    case "update":
      {
        // note quickfilters.installedVersion is currently set in legacy code (quickFilters.checkFirstRun())
        // set a flag which will be cleared by clicking the [quickFilters assistant] button once
        setTimeout(async function () {
          let origVer = Preferences.get("installedVersion") || "0";
          const manifest = await messenger.runtime.getManifest();
          let installedVersion = manifest.version.replace(/pre.*/, "").replace(/\.$/, "");
          const isUpgrade = versionGreater(installedVersion, origVer);
          if (isDebug) {
            console.log(`SmartTemplates Update:  old=${origVer}  new=${installedVersion}`);
          }

          if (isUpgrade) {
            if (
              (Preferences.get("hasNews")) &&
              installedVersion.startsWith("6.8.3")
            ) {
              if (isDebug) {
                console.log("Setting news.minimal flag, as news flag was already set / ignored.");
              }
              await Preferences.set("news.minimal", true);
            }
            // only show news if major or minor version have changed:
            await Preferences.set("hasNews", true);
            // we need to move this to local Storage so that it will be removed if the Add-on is removed.
          }
          notifyWhenUIReady({ event: "updatequickFiltersLabel" });
        }, 200);
      }
      break;
    default:
      notifyWhenUIReady({ event: "updatequickFiltersLabel" });
      break;
  }
});

messenger.runtime.onStartup.addListener(async () => {
  const res = await startup.promise;
  messenger.Utilities.logDebug(
    `startup listeners, ready to call updatequickFiltersLabel\n` + `startup result: ${res}`
  );
  notifyWhenUIReady({ event: "updatequickFiltersLabel" });
});


async function addFolderPaneListener() {
  try {
    await messenger.menus.remove(FINDFILTERS_ID);
    await messenger.menus.remove(RUNFILTERFROMTREE_ID);
  } catch { ; }
  let isDebug = Preferences.isDebug();
  let menuLabel = messenger.i18n.getMessage("quickfilters.RunButton.label");
  if (isDebug) {
    console.log("quickFilters: addFolderPaneListener()");
  }
  let menuProps = {
    contexts: ["folder_pane"],
    onclick: async (event) => {
      if (isDebug) {
        console.log("quickFilters folderpane context menu", event);
      }
      const menuItem = { id: RUNFILTERFROMTREE_ID }; // fake menu item to pass to doCommand
      let currentTab = await messenger.mailTabs.getCurrent();

      const selectedFolders = event?.selectedFolders || null;
      // multiple folders are selected, we cannot execute
      if (selectedFolders && selectedFolders.length > 1) {
        console.log(
          "quickFilters: findFiltersForFolder - cannot execute when multiple folders are selected!"
        );
        return;
      }

      // determine clicked folder of tree:
      const selectedFolder = event?.selectedFolder || null;
      const selectedAccount = event?.selectedAccount || null;
      let URI = selectedFolder
        ? await messenger.Utilities.getFolderUri(selectedFolder.accountId, selectedFolder.path)
        : await messenger.Utilities.getFolderUri(selectedAccount.id);

      // trigger win.quickFilters.doCommand(menuItem);
      messenger.NotifyTools.notifyExperiment({
        event: "doCommand",
        detail: {
          commandItem: menuItem,
          windowId: currentTab.windowId,
          tabId: currentTab.id,
          folderURI: URI,
          selectedFolder: selectedFolder,
          selectedAccount: selectedAccount,
        },
      });
    },
    icons: {
      16: "chrome/content/skin/runFilters.svg",
    },
    enabled: true,
    id: RUNFILTERFROMTREE_ID,
    title: menuLabel,
  };
  if (isDebug) {
    console.log(
      `quickFilters adding the folder tree context menu item ${menuLabel} ...`,
      menuProps
    );
  }
  messenger.menus.create(menuProps);
  // ************************* ///
  // Find filters


  menuLabel = messenger.i18n.getMessage("quickfilters.findFiltersForFolder.menu");
  menuProps = {
    contexts: ["folder_pane"],
    onclick: async (event) => {
      if (isDebug) {
        console.log("quickFilters folderpane context menu", event);
      }
      const menuItem = { id: FINDFILTERS_ID }; // fake menu item to pass to doCommand
      let currentTab = await messenger.mailTabs.getCurrent();

      const selectedFolders = event?.selectedFolders || null;
      // multiple folders are selected, we cannot execute
      if (selectedFolders && selectedFolders.length > 1) {
        console.log(
          "quickFilters: findFiltersForFolder - cannot execute when multiple folders are selected!"
        );
        return;
      }

      // determine clicked folder of tree:
      const selectedFolder = event?.selectedFolder || null;
      const selectedAccount = event?.selectedAccount || null;
      let URI = selectedFolder
        ? await messenger.Utilities.getFolderUri(selectedFolder.accountId, selectedFolder.path)
        : await messenger.Utilities.getFolderUri(selectedAccount.id);

      // trigger win.quickFilters.doCommand(menuItem);
      messenger.NotifyTools.notifyExperiment({
        event: "doCommand",
        detail: {
          commandItem: menuItem,
          windowId: currentTab.windowId,
          tabId: currentTab.id,
          folderURI: URI,
          selectedFolder: selectedFolder,
          selectedAccount: selectedAccount,
        },
      });
    },
    icons: {
      16: "chrome/content/skin/findFilters.svg",
    },
    enabled: true,
    id: FINDFILTERS_ID,
    title: menuLabel,
  };
  if (isDebug) {
    console.log(
      `quickFilters adding the other folder tree context menu item ${menuLabel} ...`,
      menuProps
    );
  }
  await messenger.menus.create(menuProps);

  const toggleLabel = messenger.i18n.getMessage("foldertree.toggleApplyIncomingFilters");
  menuProps = {
    contexts: ["folder_pane"],
    onclick: async (event) => {
      const folders = event?.selectedFolders;
      if (!Array.isArray(folders) || folders.length !== 1) {
        return;
      }
      const folder = folders[0];
      if (!folder) {
        return;
      }
      // Get the full folder URI via your Utilities API helper
      const uri = await messenger.Utilities.getFolderUri(folder.accountId, folder.path);

      try {
        let currentState = await messenger.Utilities.getApplyIncomingFilters(uri);
        await messenger.Utilities.setApplyIncomingFilters(uri, !currentState);
      } catch (ex) {
        console.error("Error toggling applyIncomingFilters:", ex);
      }
    },
    id: TOGGLE_APPLY_FILTERS_ID,
    title: toggleLabel,
    type: "checkbox", // <-- essential
    // icons: {
    //   16: "chrome/content/skin/runFilters.svg",
    // },
    enabled: true,
  };
  messenger.menus.create(menuProps);
}

async function addToolMenuListener() {
  let isDebug = Preferences.isDebug();
  const menuStart = messenger.i18n.getMessage("quickfilters.FilterAssistant.start"),
    // eslint-disable-next-line no-unused-vars
    _menuStop = messenger.i18n.getMessage("quickfilters.FilterAssistant.stop"); // it's a toggle, not sure how to do this.

  if (isDebug) {
    console.log("quickFilters: addToolMenuListener()");
  }
  let menuProps = {
    contexts: ["tools_menu"],
    checked: false,
    onclick: async (event) => {
      if (isDebug) {
        console.log("quickFilters tools menu", event);
      }
      const menuItem = { id: TOGGLE_ASSIST_TOOL_ID }; // fake menu item to pass to doCommand
      let currentTab = await messenger.mailTabs.getCurrent();

      // trigger win.quickFilters.doCommand(menuItem);
      messenger.NotifyTools.notifyExperiment({
        event: "doCommand",
        detail: { commandItem: menuItem, windowId: currentTab?.windowId, tabId: currentTab?.id },
      });
    },
    icons: {
      16: "chrome/content/skin/QuickFilters.svg",
    },
    enabled: true,
    id: TOGGLE_ASSIST_TOOL_ID,
    title: menuStart,
  };
  if (isDebug) {
    console.log(`quickFilters adding the tools menu item ${menuStart} ...`, menuProps);
  }
  await messenger.menus.create(menuProps);

  // hide the item when not in a mail tab
  browser.menus.onShown.addListener(async (_info, _tab) => {
    let currentWindow = await messenger.windows.getCurrent();

    // If we're in a compose window or no mail tab, hide the item
    let shouldShow = currentWindow.type !== "messageCompose";

    browser.menus.update(TOGGLE_ASSIST_TOOL_ID, { visible: shouldShow });
    browser.menus.refresh();
  });

}


function showSplash() {
  // alternatively display this info in a tab with browser.tabs.create(...)  
  let url = browser.runtime.getURL("popup/update.html");
  let screenH = window.screen.height,
      windowHeight = (screenH > 870) ? 870 : screenH;  
  browser.windows.create({ url, type: "popup", width: 1000, height: windowHeight, allowScriptsToClose: true});
}

async function displayAssistant(data) {
  const isDebugMsg = Preferences.isDebug("assistant.msg");
  // [issue 309] open the HTML version of the assistant
  messenger.Utilities.logDebug(
    `displayAssistant()\ncontext=${data?.context}\nrequestId=${data?.requestId}`
  );
  const assistantURL = browser.runtime.getURL("html/filterAssistant.html");
  messenger.Utilities.logDebug(`assistantURL=${assistantURL}`);
  const url = new URL(assistantURL);
  messenger.Utilities.logDebug(`url=${url}`);
  url.searchParams.set("context", data?.context || "");
  // Add unique id for this request, used for async duties
  url.searchParams.set("requestId", data.requestId);

  let sourceFolder = data.sourceFolder; 
  let targetFolder = data?.targetFolder; 
  let currentTab; 

  if (
    !sourceFolder &&
    (data.context === "fromSelectedMessages" || data.context === "fromMessageContext")
  ) {
    const tabs = await messenger.mailTabs.query({ active: true, currentWindow: true });
    // possible contexts:
    // - currentMail: simulate right click on selected message
    currentTab = tabs?.length ? tabs[0] : null;

    if (currentTab?.displayedFolder) {
      sourceFolder = currentTab.displayedFolder;
    }
  }

  // possibly a BAD fallback, we really want to know where the mail came from. 
  // not where it currently is
  if (!sourceFolder && data.selectedApiMessages?.length) {
    sourceFolder = data.selectedApiMessages[0].folder;
    if (isDebugMsg) {
      console.log("displayAssistant(): using sourceFolder from selectedApiMessages[0]", sourceFolder);
    }
  }  

  let targetUri = "";
  if (targetFolder && targetFolder != sourceFolder) {
    targetUri = await messenger.Utilities.getFolderUri(targetFolder.accountId, targetFolder.path);
    const target = {
      accountId: targetFolder.accountId,
      path: targetFolder.path,
      uri: targetUri,
    };
    url.searchParams.set("targetFolder", JSON.stringify(target)); // future use.
  }  


  if (sourceFolder) {
    const uri = await messenger.Utilities.getFolderUri(sourceFolder.accountId, sourceFolder.path);
    const source = {
      accountId: sourceFolder.accountId,
      path: sourceFolder.path,
      uri: uri,
    };
    url.searchParams.set("sourceFolder", JSON.stringify(source)); // future use.
    // find any mergeable filters:
    if (data.context != "mergeList") {
      try {
        const { filterAction, filterActionExt } = data;
        const mergableFilters = await messenger.FiltersAPI.getFilters(
          uri,
          targetUri,
          Number.isNaN(filterAction) ? undefined : filterAction,
          ["string","boolean"].includes(typeof filterActionExt) ? String(filterActionExt) : undefined
        );
        if (mergableFilters?.length) {
          url.searchParams.set("matchedFilters", JSON.stringify(mergableFilters)); // encodeURIComponent()
        }
      } catch (ex) {
        console.warn(" FiltersAPI.getFilters failed, continuing without auto-merging ", ex);
      }
    }
  }


  const { selectedApiMessages } = data; // always try to retrieve this
  const { selectedFilters } = data; // only in mergeList case
  if (isDebugMsg) {
    console.log("Selected Mails from API:", selectedApiMessages);
    console.log("selectedFilters:", selectedFilters);
  }
  switch (data.context) {
    case "fromSelectedMessages":
      if (currentTab) {
        // Get selected messages in the tab
        // NOTE: getSelectedMessages() Lists the selected messages in the current folder.
        // Includes messages in collapsed threads. Does not include messages which are
        // context-clicked, but not selected. The context-clicked messages
        // are always returned by the onClicked event of the menus API

        const messageList = await messenger.mailTabs.getSelectedMessages(currentTab.id);
        // read data from returned MessagesList:
        console.log(messageList.messages); // Array of message objects`
        if (messageList.messages.length) {
          const messageIds = messageList.messages.map((msg) => msg.id);
          const jsonMessageIds = JSON.stringify(messageIds); // no need to encode - all are integers
          url.searchParams.set("messageIds", jsonMessageIds);
        }
      }
      break;
    case "fromMessageContext":
      {
        // using the API context menu
        // we cannot use info from the context menu click event
        // - because it doesn't exist anymore after returning from legacy createQuickFilterExec
        if (!selectedApiMessages) {
          console.error("displayAssistant (fromMessageContext): no selectedApiMessages  in data!");
          return;
        }
        if (!selectedApiMessages.length) {
          console.error("displayAssistant (fromMessageContext): selectedApiMessages is empty!");
          return;
        }
      }
      break;
    case "mergeList": // select one of a group of filters as target filter for merging
      url.searchParams.set("matchedFilters", JSON.stringify(selectedFilters));
      url.searchParams.set("currentCmd", "mergeList"); // make sure the button reads 'Merge'
      break;
  }
  // info.messageId is the clicked message id (should be available)
  if (selectedApiMessages && selectedApiMessages.length) {
    const messageIds = selectedApiMessages.map((msg) => msg.messageId).filter(Boolean); // nsIMsgHdr
    if (messageIds.length) {
      const jsonMessageIds = JSON.stringify(messageIds);
      url.searchParams.set("messageIds", jsonMessageIds);
      url.searchParams.set("context", "fromMessageContext");
    } else {
      console.warn("No valid messageIds found in selectedApiMessages");
    }

    // Serialize the array (JSON-encode it)
    const jsonApiMessages = JSON.stringify(selectedApiMessages); // not necessary to encodeURIComponent, next command will do it:
    // Now marshal the selectedApiMessages array
    url.searchParams.set("selectedApiMessages", jsonApiMessages);
  }

  let screenH = window.screen.height,
    windowHeight = screenH > 650 ? 650 : screenH;
  browser.windows.create({
    url: url.toString(),
    type: "popup",
    width: 780,
    height: windowHeight,
    allowScriptsToClose: true,
  });
}

async function displaySettings(data) {
  const page = data?.page;
  const mode = data?.mode; // e.g. "licenseKey" | "supportOnly"  | "newFilter"
  const baseUrl = browser.runtime.getURL("html/quickfilters-settings.html");
  const query = mode ? `?mode=${encodeURIComponent(mode)}` : "";  
  const activePage = page ? `#${page}` : "";
  const targetUrl = `${baseUrl}${query}${activePage}`;

  const tabs = await browser.tabs.query({});

  // Try to find an existing tab with the same base URL (ignoring hash)
  const tabBase = new URL(baseUrl);
  const existingTab = tabs.find((t) => {
    if (!t.url) {
      return false;
    }
    try {
      const tabUrl = new URL(t.url);
      return tabUrl.origin === tabBase.origin && tabUrl.pathname === tabBase.pathname;
    } catch {
      return false;
    }
  });

  if (existingTab) {
    const urlNeedsReload = !!data?.page || !!data?.mode;

    if (urlNeedsReload) {
      // Force reload with new hash/mode
      await browser.tabs.update(existingTab.id, { url: targetUrl, active: true });
      browser.tabs.sendMessage(existingTab.id, { msg: "refreshNavigation" });
    } else {
      // Only activate/focus the tab, no reload
      await browser.tabs.update(existingTab.id, { active: true });
    }

    await browser.windows.update(existingTab.windowId, { focused: true });
    return;
  }

  await browser.tabs.create({ url: targetUrl });
}

// create a "deferred" promise for all event listeners on the experimental side
let uiResolve;
const uiReadyPromise = new Promise((resolve) => {
  uiResolve = resolve; // save the resolver
});

// Wrapper that supports multiple args
async function notifyWhenUIReady(...args) {
  try {
    // Wait until st-messenger signals that all listeners are ready
    await uiReadyPromise;

    // Pass all args to notifyExperiment and return its promise
    return messenger.NotifyTools.notifyExperiment(...args);
  } catch (err) {
    console.error("Error in notifyWhenUIReady:", err);
    throw err; // propagate to caller
  }
}

async function updateLicense(key) {
  let forceSecondaryIdentity = Preferences.get("licenser.forceSecondaryIdentity"),
    isDebugLicenser = Preferences.isDebug("premium.licenser");

  // we create a new Licenser object for overwriting, this will also ensure that key_type can be changed.
  let newLicense = new Licenser(key, {
    forceSecondaryIdentity,
    debug: isDebugLicenser,
  });
  await newLicense.validate();
  // Check new license and accept if ok.
  // You may return values here, which will be send back to the caller.
  // return false;

  // Update background license.
  await Preferences.set("LicenseKey", newLicense.info.licenseKey);
  currentLicense = newLicense;
  // Broadcast -without event is used for the licenser.
  notifyWhenUIReady({ licenseInfo: currentLicense.info });
  notifyWhenUIReady({ event: "updatequickFiltersLabel" });
  return true;
}

function stripEllipsis(label) {
  if (label.endsWith("…")) { return label.slice(0, -1); }
  if (label.endsWith("...")) { return label.slice(0, -3); }
  return label;
}

function makeAssistantRequestId() {
  return `assistant_external_${Date.now()}`;
}

function isFolderDescriptor(folder) {
  return !!folder && typeof folder.accountId === "string" && typeof folder.path === "string";
}

function isApiMessageDescriptor(message) {
  return !!message && !!message.messageId && isFolderDescriptor(message.folder);
}

function normalizeExternalAssistantPayload(message) {
  // Future protocol note:
  // current "context" is overloaded and may later be split into
  // - mode: behavioral assistant path
  // - reason: origin / trigger, e.g. QuickFolders.quickMove
  const selectedApiMessages = Array.isArray(message.selectedApiMessages)
    ? message.selectedApiMessages.filter(isApiMessageDescriptor)
    : [];

  return {
    context: message.context || "fromMessageContext",
    requestId: message.requestId || makeAssistantRequestId(),
    sourceFolder: isFolderDescriptor(message.sourceFolder) ? message.sourceFolder : null,
    targetFolder: isFolderDescriptor(message.targetFolder) ? message.targetFolder : null,
    selectedApiMessages,
    filterAction: message.filterAction,
    filterActionExt: message.filterActionExt,
    selectedFilters: Array.isArray(message.selectedFilters) ? message.selectedFilters : [],
  };
}




function registerNotifyListener() {
  messenger.NotifyTools.onNotifyBackground.addListener(async (data) => {
    let isLog = Preferences.isDebug("notifications");
    if (isLog && data.func) {
      console.log(
        "=========================\n" +
          "BACKGROUND LISTENER received: " +
          data.func +
          "\n" +
          "========================="
      );
    }
    switch (data.func) {
      case "UIListenersReady":
        // makes sure all event listeners in st-messenger.js are set up and ready to receive
        uiResolve(); // resolve the promise
        break;
      case "slideAlert":
        util.slideAlert(data?.title, data.text, data?.icon); // title, text, [icon]
        break;

      case "splashScreen":
        showSplash();
        break;

      case "getLicenseInfo":
        return currentLicense.info;

      case "getPlatformInfo":
        return messenger.runtime.getPlatformInfo();

      case "getBrowserInfo":
        return messenger.runtime.getBrowserInfo();

      case "getAddonInfo":
        return messenger.management.getSelf();

      case "getAssistantMode": // is assistant active or not?
        return AssistantActive; // replaced worker.FilterMode, it's stored here and updated through Util

      case "getQuickFolderslicense":
        if (QF_license.status == "unknown") {
          try {
            let result = await messenger.runtime.sendMessage(QUICKFOLDERS_APPNAME, {
              command: "queryQuickFoldersLicense",
            });
            if (result && typeof result !== "undefined") {
              QF_license = result;
            }
          } catch {
            QF_license = { status: "unknown", type: 0 };
          }
        }
        return QF_license;

      case "setAssistantMode": // toggle "FilterMode"
        AssistantActive = data.active;
        notifyWhenUIReady({
          event: "setAssistantMode",
          detail: { active: AssistantActive },
        });
        break;

      // future use - update all toolbar buttons for assistant state
      case "updateToolbars":
        notifyWhenUIReady({ event: "updateToolbars" });
        break;

      case "setAssistantButton":
        notifyWhenUIReady({
          event: "setAssistantButton",
          detail: { active: data.active },
        });
        break;

      case "setupListToolbar":
        notifyWhenUIReady({ event: "setupListToolbar" });
        break;

      case "toggleCurrentFolderButtons": // legacy settings
        notifyWhenUIReady({ event: "toggleCurrentFolderButtons" });
        break;

      case "updatequickFiltersLabel":
        notifyWhenUIReady({ event: "updatequickFiltersLabel" });
        break;

      // refresh license info (at midnight) and update label afterwards.
      case "updateLicenseTimer":
        await currentLicense.updateLicenseDates();

        notifyWhenUIReady({ licenseInfo: currentLicense.info });
        notifyWhenUIReady({ event: "updatequickFiltersLabel" });
        break;

      case "updateLicense":
        return await updateLicense(data.key);

      case "setActionTip":
        // https://webextension-api.thunderbird.net/en/stable/browserAction.html#settitle-details
        messenger.browserAction.setTitle({ title: data.text });
        break;

      case "setActionLabel":
        // https://webextension-api.thunderbird.net/en/stable/browserAction.html#setlabel-details
        messenger.browserAction.setLabel({ label: data.text });
        break;

      case "addFolderPaneListener":
        addFolderPaneListener();
        break;

      case "addToolMenuListener":
        addToolMenuListener();
        break;

      case "addKeyListener":
        notifyWhenUIReady({ event: "addKeyListener" });
        break;

      case "openLinkInTab":
        // https://webextension-api.thunderbird.net/en/stable/tabs.html#query-queryinfo
        {
          let baseURI = data.baseURI || data.URL;
          let found = await browser.tabs.query({ url: baseURI });
          if (found.length) {
            let tab = found[0]; // first result
            await browser.tabs.update(tab.id, { active: true, url: data.URL });
            return;
          }
          browser.tabs.create({ active: true, url: data.URL });
        }
        break;

      case "openBrowserLink": {
        messenger.windows.openDefaultBrowser(data.url);
        return;
      }

      case "quickFiltersAssistant": {
        try {
          displayAssistant(data);
        } catch (ex) {
          console.logError("displayAssistant failed!", ex);
          if (data?.requestId) {
            if (data.requestId.startsWith("assistant_")) {
              await messenger.Utilities.resolveAssistant(data.requestId, "error", {
                answer: null,
                selectedMergedFilterIndex: -1,
                mergeFilter: null,
                error: ex.message,
              });
            }
          }
        }
        break;
      }

      case "quickFiltersSettings":
        displaySettings(data);
        break;

      case "API-test-Utilities":
        console.log("quickFilters - API-test-Utilities");
        try {
          // messenger.Utilities.showLicenseDialog("test");
          messenger.Utilities.logDebug("logDebug from Utilities API");
          console.log("getUserName: ", await messenger.Utilities.getUserName());
          const currentTabs = await messenger.mailTabs.query({ active: true, currentWindow: true });
          const tab = currentTabs.length ? currentTabs[0] : null;
          console.log(
            "getFolderUri(selected): ",
            tab
              ? await messenger.Utilities.getFolderUri(
                  tab.displayedFolder.accountId,
                  tab.displayedFolder.path
                )
              : "none"
          );
        } catch (ex) {
          console.error("Error in Utilities", ex);
        }
        break;
      case "API-test-FilterAPI":
        console.log("quickFilters - API-test-FilterAPI");
        try {
          let FL = await messenger.FiltersAPI.getFilters("local");
          console.log("Local filters:", FL);
        } catch (ex) {
          console.error("Error in FilterAPI", ex);
        }
  
        break;
      case "updateCurrentFolderBar": // updateCurrentFolderButtons
        notifyWhenUIReady({ event: "updateCurrentFolderBar" });
        break;

      case "prefs:set":
        await Preferences.set(data.key, data.value);
        return true;
      case "requestPrefCache":
        // send cached data to quickFilters.Preferences.cache.updateFromBackend(data)
        return Preferences._data;
      case "test-storage-editor":
        webExtensionStorageEditor.open({
          storageArea: "local",
          baseFilter: "debug.",
          type: "popup",
          showTopLevelKey: false,
        });
        break;
    }
  });  
}

async function main() {
  await prefsReady;
  // load defaults => OBSOLETE once migration is complete.
  messenger.WindowListener.registerDefaultPrefs("chrome/content/scripts/quickFilter-prefs.js");

  let key = Preferences.get("LicenseKey"),
    forceSecondaryIdentity = Preferences.get("licenser.forceSecondaryIdentity"),
    isDebug = Preferences.isDebug(),
    isDebugLicenser = Preferences.get("debug.premium.licenser");

  currentLicense = new Licenser(key, { forceSecondaryIdentity, debug: isDebugLicenser });
  await currentLicense.validate();

  // All important stuff has been done.
  // resolve all promises on the stack
  if (isDebug) {
    console.log("Finished setting up license startup code");
  }
  callbacks.forEach((callback) => callback());
  // unblock code that depends on licenser
  startup.resolve("unblock startup for quickFilters in main()");
  if (isDebug) {
    console.log("Startup resolved");
  }

  // listeners for splash pages, new settings dialog
  messenger.runtime.onMessage.addListener(async (data, sender) => {
    // console.log("runtime.onMessage", data, _sender);
    if (!data.command) {
      return;
    }
    switch (data.command) {
      case "getLicenseInfo":
        return currentLicense.info;
      case "getFilters": {
        const { sourceUri, targetUri, filterAction, filterActionExt } = data;
        let filters = await messenger.FiltersAPI.getFilters(
          sourceUri,
          targetUri || "",
          Number.isNaN(filterAction) ? undefined : filterAction,
          ["string", "boolean"].includes(typeof filterActionExt)
            ? String(filterActionExt)
            : undefined
        );
        return filters;
      }
      case "assistantResult":
        {
          const { requestId, result } = data;
          const isDebug = Preferences.isDebug("assistant");
          if (isDebug) {
            console.log(`Resolving assistantResult[${requestId}]: with result "${result}"`, data);
          }
          if (requestId) {
            const mergeFilter = data.params?.mergeFilter || null;
            const resultIdx = mergeFilter ? mergeFilter.index : -1; // 0 is a valid index
            // { index, filterName , accountId }
            await messenger.Utilities.resolveAssistant(requestId, result, {
              answer: data.params?.answer,
              selectedMergedFilterIndex: resultIdx,
              mergeFilter,
            });
          }
        }
        break;
      case "resizeAssistant":
        if (sender.tab) {
          let newHeight = data.height;
          const maxHeight = window.screen.availHeight; // or window.screen.height for full screen height

          if (newHeight > maxHeight) {
            newHeight = maxHeight;
            console.warn(
              `resizeAssistant: requested height ${data.height} exceeds screen height, capped to ${maxHeight}`
            );
          }

          const windowId = sender.tab.windowId;
          browser.windows.update(windowId, { height: newHeight });
        }
        break;
      case "splashScreen":
        showSplash();
        break;
      case "showAboutConfig":
        messenger.Utilities.showAboutConfig(data.filter); // , data.editable || false
        break;
      case "setupListToolbar":
        notifyWhenUIReady({ event: "setupListToolbar" });
        break;
      case "updateLicense":
        return await updateLicense(data.key);
      case "slideAlert":
        util.slideAlert(data?.title, data.text, data?.icon);
        break;
      case "updateCurrentFolderButtons":
        notifyWhenUIReady({ event: "toggleCurrentFolderButtons" });
        break;
      case "openStorageEditor":
        webExtensionStorageEditor.open({
          storageArea: "local",
          baseFilter: data.filter,
          type: "popup",
          showTopLevelKey: false,
        });
        break;
      default:
        console.warn("Unknown command received in background:", data.command);
        break;
    }
  });

  messenger.commands.update({
    name: "create-filter-from-message",
    description: stripEllipsis(messenger.i18n.getMessage("quickfilters.FromMessage.label")),
  });

  browser.commands.onCommand.addListener(async (command) => {
    let legalCommands = ["create-filter-from-message"];
    if (!legalCommands.includes(command)) {
      return;
    }

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const mailTab = tabs.find((t) => t.type === "mail");
    if (!mailTab) {
      console.warn("No active mail tab found!");
      // we should add an alert.
      return;
    }
    switch (command) {
      case "create-filter-from-message": {
        const menuItem = { id: CREATEFILTERFROMMSG_ID }; // fake menu item to pass to doCommand
        const selectedMails = await browser.mailTabs.getSelectedMessages(mailTab.id);
        if (!selectedMails?.length) {
          console.warn("No selected messages found for create-filter-from-message command!");
          messenger.notifications.create({
            type: "basic",
            title: "quickFilters",
            message: messenger.i18n.getMessage("quickfilters.createFromMail.selectWarning"),
          });
        }
        const detail = {
          commandItem: menuItem,
          tabId: mailTab.id,
          windowId: mailTab.windowId,
          messages: selectedMails,
        };
        // trigger win.quickFilters.doCommand(menuItem);
        if (Preferences.get("assistant.html")) {
          // displayAssistant(data);
          // <== that won't work because we need the lgacry context of quickFIlters.Worker.createQuickFilterExec(..)
          detail.context = "fromMessageContext";
        }
        messenger.NotifyTools.notifyExperiment({
          event: "doCommand",
          detail: detail,
        });
        break;
      }
    }
  });

  messenger.runtime.onMessageExternal.addListener(async (message, _sender) => {
    switch (message.command) {
      case "startQuickFiltersAssistant": {
        const payload = normalizeExternalAssistantPayload(message);
        if (!payload.selectedApiMessages.length && !payload.sourceFolder) {
          return {
            ok: false,
            error: "startQuickFiltersAssistant requires selectedApiMessages or sourceFolder",
          };
        }

        try {
          await displayAssistant(payload);
          return {
            ok: true,
            requestId: payload.requestId,
          };
        } catch (ex) {
          console.error("startQuickFiltersAssistant failed", ex);
          return {
            ok: false,
            requestId: payload.requestId,
            error: ex.message,
          };
        }
      }

      case "updateQuickFoldersLicense": // fall-through
      case "injectButtonsQFNavigationBar":
        // call the code for injecting the toolbar buttons that integrate with QF current folder bar
        // this is called from onLoad in qFi-messenger.js
        QF_license = message.license; // restrict buttons - we need either (any) QF license or a quickFilters Pro.
        if (isDebug) {
          await util.logDebugHighlight(
            "received external message 'injectButtonsQFNavigationBar'",
            "yellow",
            "rgb(0, 128, 50)",
            message,
            QF_license
          );
        }
        if (message.command == "injectButtonsQFNavigationBar") {
          notifyWhenUIReady({ event: "toggleCurrentFolderButtons" });
        }
        break;
    }
  });

  messenger.WindowListener.registerChromeUrl([["content", "quickfilters", "chrome/content/"]]);

  //attention: each target window (like messenger.xul) can appear only once
  // this is different from chrome.manifest
  // xhtml for Tb78
  messenger.WindowListener.registerWindow(
    "chrome://messenger/content/messenger.xhtml",
    "chrome/content/scripts/qFi-messenger.js"
  );
  messenger.WindowListener.registerWindow(
    "chrome://messenger/content/customizeToolbar.xhtml",
    "chrome/content/scripts/qFi-customizetoolbar.js"
  );
  messenger.WindowListener.registerWindow(
    "chrome://messenger/content/FilterEditor.xhtml",
    "chrome/content/scripts/qFi-filterEditor.js"
  );
  messenger.WindowListener.registerWindow(
    "chrome://messenger/content/FilterListDialog.xhtml",
    "chrome/content/scripts/qFi-filterlist.js"
  );

  // styling for QuickFolders navigation bar - lives in 3pane!
  messenger.WindowListener.registerWindow("about:3pane", "chrome/content/scripts/qFi-3pane.js");
  // might be obsolete - but it might also style the main button in single message window?
  messenger.WindowListener.registerWindow("about:message", "chrome/content/scripts/qFi-message.js");

  // how to add a click event
  // browser.actionButton.onClicked.addListener(() => { …. });

  /*
   * Start listening for opened windows. Whenever a window is opened, the registered
   * JS file is loaded. To prevent namespace collisions, the files are loaded into
   * an object inside the global window. The name of that object can be specified via
   * the parameter of startListening(). This object also contains an extension member.
   */
  messenger.WindowListener.startListening();

  // let browserInfo = await messenger.runtime.getBrowserInfo();

  // [issue 125] Exchange account validation
  messenger.accounts.onCreated.addListener(async (id, account) => {
    if (currentLicense.info.status == "MailNotConfigured") {
      // redo license validation!
      if (isDebugLicenser) {
        console.log("Account added, redoing license validation", id, account);
      } // test
      currentLicense = new Licenser(key, { forceSecondaryIdentity, debug: isDebugLicenser });
      await currentLicense.validate();
      if (currentLicense.info.status != "MailNotConfigured") {
        if (isDebugLicenser) {
          console.log(
            "notify experiment code of new license status: " + currentLicense.info.status
          );
        }
        notifyWhenUIReady({ licenseInfo: currentLicense.info });
      }
      if (isDebugLicenser) {
        console.log("quickFilters license info:", currentLicense.info);
      } // test
    } else {
      if (isDebugLicenser) {
        console.log("quickFilters license state after adding account:", currentLicense.info);
      }
    }
  });

  /* Add message thread context menu item */
  let menuLabel = messenger.i18n.getMessage("quickfilters.FromMessage.label");
  // let menuAccel = messenger.i18n.getMessage("quickfilters.FromMessage.accesskey");
  let menuProps = {
    contexts: ["message_list"],
    onclick: async (info, tab) => {
      if (isDebug) {
        console.log("quickFilters message context menu", info, tab);
      }
      const menuItem = { id: CREATEFILTERFROMMSG_ID }; // fake menu item to pass to doCommand
      const detail = {
        commandItem: menuItem,
        tabId: tab.id,
        windowId: tab.windowId,
        messages: info.selectedMessages,
      };
      // trigger win.quickFilters.doCommand(menuItem);
      if (Preferences.get("assistant.html")) {
        // call the new thingy with context="fromMessageContext"
        // const data = { info, tab
        // displayAssistant(data);
        // <== that won't work because we need the lgacry context of quickFIlters.Worker.createQuickFilterExec(..)
        detail.context = "fromMessageContext";
      }

      messenger.NotifyTools.notifyExperiment({
        event: "doCommand",
        detail: detail,
      });
    },
    icons: {
      16: "chrome/content/skin/createFilter.svg",
      24: "chrome/content/skin/createFilter.svg",
    },
    enabled: true,
    id: CREATEFILTERFROMMSG_ID,
    title: menuLabel,
  };
  if (isDebug) {
    console.log(`quickFilters adding the message context menu item ${menuLabel} ...`, menuProps);
  }
  messenger.menus.create(menuProps);

  messenger.menus.onShown.addListener(async (info) => {
    function isHide(folders) {
      if (!Array.isArray(folders) || folders.length !== 1) {
        return true;
      }
      const folder = folders[0];
      const hideFeature = new Set(["inbox", "drafts", "sent", "outbox"]);
      return (
        folder.specialUse &&
        Array.isArray(folder.specialUse) &&
        folder.specialUse.some((flag) => hideFeature.has(flag.toLowerCase()))
      );
    }

    if (!info.contexts.includes("folder_pane")) {
      return;
    }
    if (isHide(info?.selectedFolders)) {
      await messenger.menus.update(TOGGLE_APPLY_FILTERS_ID, { visible: false });
      await messenger.menus.refresh();
      return;
    }
    const folder = info?.selectedFolders?.[0];

    // Optional fallback to ensure robustness
    const account = await messenger.accounts.get(folder.accountId);
    const isImap = account.type === "imap";
    const uri = await messenger.Utilities.getFolderUri(folder.accountId, folder.path);

    // Hide the toggle item if it's not IMAP
    await messenger.menus.update(TOGGLE_APPLY_FILTERS_ID, {
      visible: isImap,
      checked: isImap ? await messenger.Utilities.getApplyIncomingFilters(uri) : false,
    });

    // Must call menus.refresh after update to show changes
    await messenger.menus.refresh();
  });
} // end main()

registerNotifyListener();
const prefsReady = Preferences.init(); // pending
main();
