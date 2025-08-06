import * as util from "./scripts/qi-util.mjs.js";
import {Licenser} from "./scripts/Licenser.mjs.js";

const QUICKFOLDERS_APPNAME = "quickfolders@curious.be";
const RUNFILTERFROMTREE_ID = "runFiltersFolderPane";
const TOGGLE_APPLY_FILTERS_ID = "toggleApplyIncomingFilters";
const FINDFILTERS_ID = "findFiltersFolder";
const CREATEFILTERFROMMSG_ID = "createFromMailContext";
const TOGGLE_ASSIST_TOOL_ID = "toggleFilterTools";

var currentLicense;
var QF_license = {status:"unknown", type: 0}
var startupFinished = false;
var callbacks = [];
// Worker.FilterMode
var AssistantActive = false;

//TODO: textbox in CSS, search box??
//TODO mailWindowOverlay: was never in use??
//debugger;
messenger.runtime.onInstalled.addListener(async ({ reason, _temporary }) => {
  let isDebug = await messenger.LegacyPrefs.getPref("extensions.quickfilters.debug");
  
  // Wait until the main startup routine has finished!
  await new Promise((resolve) => {
    if (startupFinished) {
      if (isDebug) {console.log("quickFilters - startup code finished.");}
      // Looks like we missed the one send by main()
      resolve();
    }
    callbacks.push(resolve);
  });
  if (isDebug) {
    console.log("Startup has finished");
    console.log("quickFilters - currentLicense", currentLicense);
  }
  
  
  // if (temporary) return; // skip during development
  switch (reason) {
    case "install":
    {
      if (isDebug) {console.log("quickFilters onInstalled Listener - install...");}
      let url = browser.runtime.getURL("popup/installed.html");
      await browser.windows.create({ url, type: "popup", width: 900, height: 750, });
    }
      break;
    // see below
    case "update":
    {
      // set a flag which will be cleared by clicking the [quickFilters assistant] button once
      setTimeout(
        async function() {
          let origVer = await messenger.LegacyPrefs.getPref("extensions.quickfilters.installedVersion","0");
          const manifest = await messenger.runtime.getManifest();
          let installedVersion = manifest.version.replace(/pre.*/,""); 
          if (installedVersion > origVer) {
            // only show news if major or minor version have changed:
            messenger.LegacyPrefs.setPref("extensions.quickfilters.hasNews", true);
            // we need to move this to local Storage so that it will be removed if the Add-on is removed.
          }
          messenger.NotifyTools.notifyExperiment({event: "updatequickFiltersLabel"});
        },
        200
      ); 
      
    }
      break;
    default:
      messenger.NotifyTools.notifyExperiment({event: "updatequickFiltersLabel"});
      break;
  }
});

async function addFolderPaneListener() {
  let isDebug = await messenger.LegacyPrefs.getPref("extensions.quickfilters.debug");
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
  messenger.menus.create(menuProps);

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
  let isDebug = await messenger.LegacyPrefs.getPref("extensions.quickfilters.debug");
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
      const menuItem = { id: TOGGLE_ASSIST_TOOL_ID };   // fake menu item to pass to doCommand
      let currentTab = await messenger.mailTabs.getCurrent();

      // trigger win.quickFilters.doCommand(menuItem);
      messenger.NotifyTools.notifyExperiment( { event: "doCommand", detail: { commandItem: menuItem, windowId: currentTab.windowId, tabId: currentTab.id } } );
    },
    icons: {
      "16": "chrome/content/skin/QuickFilters.svg"
    } ,
    enabled: true,
    id: TOGGLE_ASSIST_TOOL_ID,
    title: menuStart
  }
  if (isDebug) {
    console.log(`quickFilters adding the tools menu item ${menuStart} ...`, menuProps);
  }
  messenger.menus.create(menuProps);
}


function showSplash() {
  // alternatively display this info in a tab with browser.tabs.create(...)  
  let url = browser.runtime.getURL("popup/update.html");
  let screenH = window.screen.height,
      windowHeight = (screenH > 870) ? 870 : screenH;  
  browser.windows.create({ url, type: "popup", width: 1000, height: windowHeight, allowScriptsToClose: true,});
}

async function displayAssistant(data) {
  // [issue 309] open the HTML version of the assistant
  const assistantURL = browser.runtime.getURL("html/filterAssistant.html");
  const url = new URL(assistantURL);
  url.searchParams.set("context", data?.context || "");
  // Add unique id for this request, used for async duties
  url.searchParams.set("requestId", data.requestId);
  const tabs = await messenger.mailTabs.query({ active: true, currentWindow: true });
  // possible contexts:
  // - currentMail: simulate right click on selected message
  const currentTab = tabs?.length ? tabs[0] : null;

  if (currentTab?.displayedFolder) {
    const currentFolder = currentTab.displayedFolder;
    if (currentFolder) {
      const uri = await messenger.Utilities.getFolderUri(
        currentFolder.accountId,
        currentFolder.path
      );
      const targetFolder = {
        accountId: currentFolder.accountId,
        path: currentFolder.path,
        uri: uri,
      };
      url.searchParams.set("targetFolder", JSON.stringify(targetFolder));
      // find any mergeable filters:
      const mergableFilters = await messenger.FiltersAPI.getFilters(uri, "merge");
      if (mergableFilters?.length) {
        url.searchParams.set("matchedFilters", encodeURIComponent(JSON.stringify(mergableFilters)));
      }
    }
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
    case "fromMessageContext": {
      // using the API context menu
      // info comes from the context menu click event (we can ignore tab)
      const { info, selectedApiMessages } = data;

      // info.messageId is the clicked message id (should be available)
      let messageId = info.messageId;
      if (!messageId && info.selectedMessages && info.selectedMessages.length > 0) {
        messageId = info.selectedMessages[0].id;
      }

      if (messageId) {
        const messageIds = [messageId];
        const jsonMessageIds = JSON.stringify(messageIds);
        url.searchParams.set("messageIds", jsonMessageIds);
        url.searchParams.set("context", "fromMessageContext");
      } else {
        console.warn("No messageId found in context menu info", info);
      }

      // Now marshal the selectedApiMessages array if it exists
      if (selectedApiMessages && selectedApiMessages.length > 0) {
        // Serialize the array (JSON-encode it)
        const jsonApiMessages = encodeURIComponent(JSON.stringify(selectedApiMessages));
        url.searchParams.set("selectedApiMessages", jsonApiMessages);
      }
    } break;

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

async function main() {
  const legacy_root = "extensions.quickfilters.";
  // load defaults
  messenger.WindowListener.registerDefaultPrefs("chrome/content/scripts/quickFilter-prefs.js");
  
  let key = await messenger.LegacyPrefs.getPref(legacy_root + "LicenseKey"),
      forceSecondaryIdentity = await messenger.LegacyPrefs.getPref(legacy_root + "licenser.forceSecondaryIdentity"),
      isDebug = await messenger.LegacyPrefs.getPref(legacy_root + "debug"),
      isDebugLicenser = await messenger.LegacyPrefs.getPref(legacy_root + "debug.premium.licenser");

  currentLicense = new Licenser(key, { forceSecondaryIdentity, debug: isDebugLicenser });
  await currentLicense.validate();

  // All important stuff has been done.
  // resolve all promises on the stack
  if (isDebug) {console.log("Finished setting up license startup code");}
  callbacks.forEach(callback => callback());
  startupFinished = true;
  
  // listeners for splash pages
  messenger.runtime.onMessage.addListener(async (data, _sender) => {
    // console.log("runtime.onMessage", data, _sender);
    if (!data.command) {
      return;
    }
    switch (data.command) {
      case "getLicenseInfo":
        return currentLicense.info;
      case "getFilters": {
        let filters = await messenger.FiltersAPI.getFilters(data.accountId);
        return filters;
      }
      case "assistantResult": {
        const { requestId, result } = data;
        const isDebug = await messenger.LegacyPrefs.getPref(legacy_root + "debug.assistant");
        if (isDebug) {
          console.log(`Resolving assistantResult[${requestId}]: with result "${result}"`, data);
        }
        if (requestId) {
          await messenger.Utilities.resolveAssistant(requestId, result, {
            answer: data.params?.answer,
            selectedMergedFilterIndex: data.params?.selectedMergedFilterIndex || -1,
          });
        }
      } break;
    }
  });
    
  messenger.NotifyTools.onNotifyBackground.addListener(async (data) => {
    let isLog = await messenger.LegacyPrefs.getPref(legacy_root + "debug.notifications");
    if (isLog && data.func) {
      console.log ("=========================\n" +
                   "BACKGROUND LISTENER received: " + data.func + "\n" +
                   "=========================");
    }
    switch (data.func) {
      case "slideAlert":
        util.slideAlert(...data.args); // title, text, [icon]
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
        messenger.NotifyTools.notifyExperiment({
          event: "setAssistantMode",
          detail: { active: AssistantActive },
        });
        break;

      // future use - update all toolbar buttons for assistant state
      case "updateToolbars":
        messenger.NotifyTools.notifyExperiment({ event: "updateToolbars" });
        break;

      case "setAssistantButton":
        messenger.NotifyTools.notifyExperiment({
          event: "setAssistantButton",
          detail: { active: data.active },
        });
        break;

      case "setupListToolbar":
        messenger.NotifyTools.notifyExperiment({ event: "setupListToolbar" });
        break;

      case "toggleCurrentFolderButtons":
        messenger.NotifyTools.notifyExperiment({ event: "toggleCurrentFolderButtons" });
        break;

      case "updatequickFiltersLabel":
        messenger.NotifyTools.notifyExperiment({ event: "updatequickFiltersLabel" });
        break;

      // refresh license info (at midnight) and update label afterwards.
      case "updateLicenseTimer":
        await currentLicense.updateLicenseDates();

        messenger.NotifyTools.notifyExperiment({ licenseInfo: currentLicense.info });
        messenger.NotifyTools.notifyExperiment({ event: "updatequickFiltersLabel" });
        break;

      case "updateLicense":
        {
          let forceSecondaryIdentity = await messenger.LegacyPrefs.getPref(
              legacy_root + "licenser.forceSecondaryIdentity"
            ),
            isDebugLicenser = await messenger.LegacyPrefs.getPref(
              legacy_root + "debug.premium.licenser"
            );

          // we create a new Licenser object for overwriting, this will also ensure that key_type can be changed.
          let newLicense = new Licenser(data.key, {
            forceSecondaryIdentity,
            debug: isDebugLicenser,
          });
          await newLicense.validate();
          // Check new license and accept if ok.
          // You may return values here, which will be send back to the caller.
          // return false;

          // Update background license.
          await messenger.LegacyPrefs.setPref(
            legacy_root + "LicenseKey",
            newLicense.info.licenseKey
          );
          currentLicense = newLicense;
          // Broadcast -without event is used for the licenser.
          messenger.NotifyTools.notifyExperiment({ licenseInfo: currentLicense.info });
          messenger.NotifyTools.notifyExperiment({ event: "updatequickFiltersLabel" });
        }
        return true;
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
        messenger.NotifyTools.notifyExperiment({ event: "addKeyListener" });
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
        displayAssistant(data)
        break;
      }
      
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
        } catch(ex) {
          console.error("Error in FilterAPI", ex);
        }

        break;
    }
  });
  
    
  messenger.runtime.onMessageExternal.addListener( async  (message, _sender) =>  
  {
    switch(message.command) {
      case "updateQuickFoldersLicense": // fall-through
      case "injectButtonsQFNavigationBar":
        // call the code for injecting the toolbar buttons that integrate with QF current folder bar
        // this is called from onLoad in qFi-messenger.js
        QF_license = message.license; // restrict buttons - we need either (any) QF license or a quickFilters Pro.
        if (isDebug) {
          await util.logDebugHighlight("received external message 'injectButtonsQFNavigationBar'", "yellow", "rgb(0, 128, 50)", message, QF_license);
        }
        if (message.command == "injectButtonsQFNavigationBar") {
          messenger.NotifyTools.notifyExperiment({event: "toggleCurrentFolderButtons"});
        }
        break;
    }
  });
      
    
  messenger.WindowListener.registerChromeUrl([ 
        ["content", "quickfilters", "chrome/content/"],
        ["locale",  "quickfilters", "en",    "chrome/locale/en/"],
        ["locale",  "quickfilters", "de",    "chrome/locale/de/"],
        ["locale",  "quickfilters", "es",    "chrome/locale/es/"],
        ["locale",  "quickfilters", "es-AR", "chrome/locale/es-AR/"],
        ["locale",  "quickfilters", "fr",    "chrome/locale/fr/"],
        ["locale",  "quickfilters", "it",    "chrome/locale/it/"],
        ["locale",  "quickfilters", "ja",    "chrome/locale/ja/"],
        ["locale",  "quickfilters", "nl",    "chrome/locale/nl/"],
        ["locale",  "quickfilters", "ru",    "chrome/locale/ru/"],
        ["locale",  "quickfilters", "sv",    "chrome/locale/sv/"],
        ["locale",  "quickfilters", "vi",    "chrome/locale/vi/"],
        ["locale",  "quickfilters", "zh-CN", "chrome/locale/zh-CN/"]
    
      ]);
 
  messenger.WindowListener.registerOptionsPage("chrome://quickfilters/content/quickFilters-options.xhtml"); 
   
    
 //attention: each target window (like messenger.xul) can appear only once
 // this is different from chrome.manifest
 // xhtml for Tb78
  messenger.WindowListener.registerWindow("chrome://messenger/content/messenger.xhtml", "chrome/content/scripts/qFi-messenger.js");
  messenger.WindowListener.registerWindow("chrome://messenger/content/customizeToolbar.xhtml", "chrome/content/scripts/qFi-customizetoolbar.js");
  messenger.WindowListener.registerWindow("chrome://messenger/content/FilterEditor.xhtml", "chrome/content/scripts/qFi-filterEditor.js");
  messenger.WindowListener.registerWindow("chrome://messenger/content/FilterListDialog.xhtml", "chrome/content/scripts/qFi-filterlist.js");
    
  // styling for QuickFolders navigation bar - lives in 3pane!
  messenger.WindowListener.registerWindow("about:3pane", "chrome/content/scripts/qFi-3pane.js");

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
  messenger.accounts.onCreated.addListener( async(id, account) => {
    if (currentLicense.info.status == "MailNotConfigured") {
      // redo license validation!
      if (isDebugLicenser) {console.log("Account added, redoing license validation", id, account);} // test
      currentLicense = new Licenser(key, { forceSecondaryIdentity, debug: isDebugLicenser });
      await currentLicense.validate();
      if(currentLicense.info.status != "MailNotConfigured") {
        if (isDebugLicenser) {console.log("notify experiment code of new license status: " + currentLicense.info.status);}
        messenger.NotifyTools.notifyExperiment({licenseInfo: currentLicense.info});
      }
      if (isDebugLicenser) {console.log("quickFilters license info:", currentLicense.info);} // test
    } else {
      if (isDebugLicenser) {console.log("quickFilters license state after adding account:", currentLicense.info)}
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
      const menuItem = { id: CREATEFILTERFROMMSG_ID };   // fake menu item to pass to doCommand
      const detail = {
        commandItem: menuItem,
        tabId: tab.id,
        windowId: tab.windowId,
        messages: info.selectedMessages,
      };
      // trigger win.quickFilters.doCommand(menuItem);
      if (await messenger.LegacyPrefs.getPref("extensions.quickfilters.assistant.html")) {
        // call the new thingy with context="fromMessageContext"
        // const data = { info, tab
        // displayAssistant(data);
        // <== that won't work because we need the lgacry context of quickFIlters.Worker.createQuickFilterExec(..)
        detail.context = "fromMessageContext";
      }

      messenger.NotifyTools.notifyExperiment({
        event: "doCommand",
        detail : detail,
      });      
    },
    icons: {
      "16": "chrome/content/skin/createFilter.svg",
      "24": "chrome/content/skin/createFilter.svg"
    } ,
    enabled: true,
    id: CREATEFILTERFROMMSG_ID,
    title: menuLabel
  }
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

main();
