/*
  globals
    WL,
*/
Services.scriptloader.loadSubScript("chrome://quickfilters/content/quickFilters.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-utils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-preferences.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-worker.js", window, "UTF-8");

const RUNFILTERFROMTREE_ID = "runFiltersFolderPane";
const FINDFILTERS_ID = "findFiltersFolder";
const TOGGLE_ASSIST_TOOL_ID = "toggleFilterTools";
const CREATEFILTERFROMMSG_ID = "createFromMailContext";

async function setAssistantButton(e) {
  await window.quickFilters.Preferences.cache.awaitReady;
  window.quickFilters.Util.setAssistantButton(e.detail.active);
}

var listener_toggleFolder,
  listener_updatequickFiltersLabel,
  listener_doCommand,
  listener_initKeyListener;

// eslint-disable-next-line no-unused-vars
async function onLoad(activatedWhileWindowOpen) {
  // make sure init() completed
  console.log("quickFilters: messenger.onLoad()");
  await window.quickFilters.Preferences.cache.awaitReady;
  console.log("quickFilters: pref cache ready");
  // TEMP DEBUG TEST
  await new Promise((resolve) => window.setTimeout(resolve, 1000));

  // console.log ("quickFilters Background Script, running in TB ", await Services.appinfo.version);
  let layout = WL.injectCSS("chrome://quickfilters/content/skin/quickFilters.css");
  let layout2 = WL.injectCSS("chrome://quickfilters/content/skin/quickFilters-toolbar.css?v=6.9");
  let layout3 = WL.injectCSS(
    "chrome://quickfilters/content/skin/quickFilters-actionButton.css?v=6.9"
  );
  window.quickFilters.Util.logDebug("injected style sheets:", layout, layout2, layout3);

  window.quickFilters._lastDoCommandTime = 0;
  window.quickFilters._lastDoCommandId = null;

  // call on background page to implement folder pane listener
  window.quickFilters.Util.notifyTools.notifyBackground({ func: "addFolderPaneListener" });
  // call on background page to implement tools menu listener
  window.quickFilters.Util.notifyTools.notifyBackground({ func: "addToolMenuListener" });

  // [issue 122] false positives from antivirus scanners
  let btnRun = document.getElementById("quickfilters-menu-runMenu");
  if (btnRun) {
    btnRun.addEventListener("command", function (event) {
      window.quickFilters.onApplyFilters(event);
    });
  }
  let btnFind = document.getElementById("quickfilters-menu-findFilter");
  // eslint-disable-next-line curly
  if (btnFind) {
    btnFind.addEventListener("command", function (event) {
      window.quickFilters.searchFiltersFromFolder(event);
    });
  }

  WL.injectElements(`

  <toolbarpalette id="MailToolbarPalette">
    <toolbarbutton id="quickfilters-toolbar-button"
                   class="toolbarbutton-1 chromeclass-toolbar-additional"
                   label="quickFilters"
                   tooltiptext="__MSG_quickfiltersToolbarButton.tooltip__"
                   context="dummy"
                   type="menu"
                   wantdropmarker="true"
                   >
    </toolbarbutton>

    <toolbarbutton id="quickfilters-toolbar-listbutton"
                   class="toolbarbutton-1 chromeclass-toolbar-additional"
                   label="__MSG_quickfilters.ListButton.label__"
                   tooltiptext="__MSG_quickfilters.ListButton.tooltip__"
                   oncommand="window.quickFilters.doCommand(this);"
                   />

    <toolbarbutton id="quickfilters-toolbar-runbutton"
                   class="toolbarbutton-1 chromeclass-toolbar-additional"
                   label="__MSG_quickfilters.RunButton.label__"
                   tooltiptext="__MSG_quickfilters.RunButton.tooltip__"
                   oncommand="window.quickFilters.doCommand(this);"
                   />
    <toolbarbutton id="quickfilters-toolbar-msg-runbutton"
                   class="toolbarbutton-1 chromeclass-toolbar-additional"
                   label="__MSG_quickfilters.RunButtonMsg.label__"
                   tooltiptext="__MSG_quickfilters.RunButtonMsg.tooltip__"
                   oncommand="window.quickFilters.doCommand(this);"
                   />
  </toolbarpalette>
`);

  window.quickFilters.doCommand = async function (el, eventDetail = null) {
    if (!el) {
      return;
    }
    // debounce commands
    const now = Date.now();

    // DEBOUNCE API context menu items (happen through update / install over)
    // If last command was same ID and within 200ms, ignore duplicate
    if (
      window.quickFilters._lastDoCommandId === el.id &&
      now - window.quickFilters._lastDoCommandTime < 250
    ) {
      console.log(`Ignoring duplicate doCommand for ${el.id}`);
      return;
    }
    window.quickFilters._lastDoCommandId = el.id;
    window.quickFilters._lastDoCommandTime = now;

    if (el.id.startsWith("quickfilters-current-")) {
      if (!window.quickFilters.Util.licenseInfo.isValid) {
        // check the QuickFolders license status for this cross Add-on support feature
        let lic = await window.quickFilters.Util.notifyTools.notifyBackground({
          func: "getQuickFolderslicense",
        }); // replace worker.FilterMode
        if (lic && lic.status) {
          switch (lic.status.toLowerCase()) {
            case "unknown":
              window.quickFilters.Util.logHighlightDebug(
                "getQuickFolderslicense() - not yet supported by current version."
              );
              break;
            case "valid":
              break;
            default: {
              let txtDefault =
                "To use filter functions from the QuickFolders navigation bar in Thunderbird 115:\n - you either need a valid QuickFolders license\n - or you can get a $addonName$ Pro license to support this feature.";
              let txt = window.quickFilters.Util.getBundleString(
                "quickfilters.notification.QF.navigationbar",
                txtDefault,
                ["quickFilters"]
              );
              window.quickFilters.Util.alert(txt);
              return;
            }
          }
        }
      }
    }
    switch (el.id) {
      case "quickfilters-checkLicense":
        window.quickFilters.Util.viewLicense();
        break;
      case "quickfilters-news": // fall-through
      case "quickfilters-changelog":
        window.quickFilters.Util.viewSplash();
        break;
      case "quickfilters-toolbar-listbutton": // fall-throughs
      case "quickfilters-menu-filterlist":
      case "quickfilters-current-listbutton":
        window.quickFilters.onToolbarListCommand();
        break;
      case "quickfilters-toolbar-runbutton": // fall-throughs
      case "quickfilters-runFilters":
      case "quickfilters-current-runbutton":
      case RUNFILTERFROMTREE_ID:
        window.quickFilters.onApplyFilters(
          true,
          window.quickFilters.Util.getMsgFolderFromUri(eventDetail?.folderURI)
        );
        window.quickFilters._lastDoCommandTime = Date.now();
        break;
      case "quickfilters-toolbar-msg-runbutton": // fall-throughs
      case "quickfilters-runFiltersMsg":
      case "quickfilters-current-msg-runbutton":
        window.quickFilters.onApplyFiltersToSelection();
        break;
      case "quickfilters-toggleAssistant":
      case TOGGLE_ASSIST_TOOL_ID:
        window.quickFilters.onMenuItemCommand("toggle_Filters");
        break;
      case "quickfilters-settings": // to do: convert (majority of) menu items to use API next!
        window.quickFilters.Util.notifyTools.notifyBackground({
          func: "quickFiltersSettings",
        });
        break;
      case "quickfilters-gopro":
        window.quickFilters.Util.showLicenseDialog("mainBtnPopupMenu");
        break;
      case "quickFilters-menu-filterFromMsg": // fall-throughs
      case CREATEFILTERFROMMSG_ID:
      case "quickFilters-fromMessage":
        // legacy path:
        window.quickFilters.onMenuItemCommand("createFilterFromMsg", eventDetail);
        window.quickFilters._lastDoCommandTime = Date.now();
        break;
      case "quickfilters-menu-searchfilters": // fall-through
      case "quickfilters-current-searchfilterbutton":
      case FINDFILTERS_ID:
        window.quickFilters.searchFiltersFromFolder(eventDetail);
        window.quickFilters._lastDoCommandTime = Date.now();
        break;
      case "quickfilters-menu-test-storage-editor":
        window.quickFilters.Util.notifyTools.notifyBackground({ func: "test-storage-editor" });
        break;
      case "quickfilters-menu-test-htmlAssistant": // [issue 309] make assistant wx compatible with HTML
        window.quickFilters.Util.notifyTools.notifyBackground({
          func: "quickFiltersAssistant",
          context: "fromSelectedMessages",
        });
        break;
      case "quickfilters-menu-test-midnight":
        window.quickFilters.Util.notifyTools.notifyBackground({ func: "updateLicenseTimer" });
        break;
      case "quickfilters-menu-test-news":
        window.quickFilters.Preferences.setBoolPref("hasNews", true);
        window.quickFilters.Util.notifyTools.notifyBackground({ func: "updatequickFiltersLabel" });
        break;
      case "quickfilters-menu-test-qurrentFolderBar":
        window.quickFilters.Util.notifyTools.notifyBackground({ func: "updateCurrentFolderBar" });
        break;
      case "quickfilters-menu-test-api-util":
        window.quickFilters.Util.notifyTools.notifyBackground({ func: "API-test-Utilities" });
        break;
      case "quickfilters-menu-test-api-FilterAPI":
        window.quickFilters.Util.notifyTools.notifyBackground({ func: "API-test-FilterAPI" });
        break;
      case "quickfilters-menu-registration":
        window.quickFilters.Util.showLicenseDialog("toolsMenu");
        break;
      default:
        console.log("unknown quickFilters command", el.id || "id: N/A", el);
    }
    // [issue 223] - find the button and remove the "pushed" look:
    let parent = el.parentElement;
    while (parent && parent.tagName != "button") {
      parent = parent.parentElement;
    }
    if (!parent) {
      return;
    }
    if (parent.id == "quickfilters-toolbar-button") {
      parent.removeAttribute("aria-pressed");
    }
  };

  // we need the WindowListener to inject UI later (tab listener)
  window.quickFilters.WL = WL;
  // this requires quickFilters.WL
  Services.scriptloader.loadSubScript(
    "chrome://quickfilters/content/scripts/qFi-ui-polyfill.js",
    window,
    "UTF-8"
  );

  // Enable the global notify notifications from background.
  window.quickFilters.Util.notifyTools.enable();
  await window.quickFilters.Util.init();
  // set up updating the label at midnight
  window.quickFilters.Util.setMidnightTimer();

  // window.addEventListener("quickFilters.BackgroundUpdate", window.quickFilters.initLicensedUI);

  window.addEventListener("quickFilters.BackgroundUpdate.setAssistantButton", setAssistantButton);
  listener_toggleFolder = window.quickFilters.toggleCurrentFolderButtons.bind(window.quickFilters);
  window.addEventListener(
    "quickFilters.BackgroundUpdate.toggleCurrentFolderButtons",
    listener_toggleFolder
  );

  listener_initKeyListener = window.quickFilters.addKeyListener.bind(window.quickFilters, window);
  window.addEventListener("quickFilters.BackgroundUpdate.addKeyListener", listener_initKeyListener);

  listener_doCommand = (event) => {
    window.quickFilters.Util.logHighlightDebug(
      "listener_doCommand()",
      "white",
      "magenta",
      event.detail
    );
    if (!event.detail.windowId) {
      console.warn("listener_doCommand failed - missing detail.windowId!");
      return;
    }
    let windowId = event.detail.windowId;
    // find out if we are in the correct window:
    // context.extension.windowManager
    let windowObject = WL.extension.windowManager.get(windowId);
    if (windowObject && window == windowObject.window) {
      window.quickFilters.doCommand.call(
        window.quickFilters,
        event.detail.commandItem,
        event.detail
      );
    }
  };
  window.addEventListener("quickFilters.BackgroundUpdate.doCommand", listener_doCommand);

  listener_updatequickFiltersLabel = window.quickFilters.updatequickFiltersLabel.bind(
    window.quickFilters
  );
  window.addEventListener(
    "quickFilters.BackgroundUpdate.updatequickFiltersLabel",
    listener_updatequickFiltersLabel
  );

  // The following will only work if we are currently in a mail pane (ATN update)
  // otherwise, we need to call this again in a tab listener
  const selectedTab = window.gTabmail.selectedTab;
  window.quickFilters.Util.logHighlightDebug(
    `qFi-messenger onLoad triggered, selectedTab: mode.name=${selectedTab?.mode?.name}`,
    "yellow",
    "rgb(0, 128, 50)",
    selectedTab
  );
  if (selectedTab && window.quickFilters.Util.isTabMode(selectedTab, "mail")) {
    window.quickFilters.patchMailPane();
  }

  // iterate all mail tabs!
  window.gTabmail.tabInfo
    .filter((t) => t.mode.name == "mail3PaneTab")
    .forEach((tabInfo) => {
      const quickFilters = window.quickFilters;
      const callBackCommands =
        tabInfo.chromeBrowser.contentWindow.commandController._callbackCommands;
      // backup wrapped functions:
      callBackCommands.quickFilters_cmd_moveMessage = callBackCommands.cmd_moveMessage;
      callBackCommands.quickFilters_cmd_copyMessage = callBackCommands.cmd_copyMessage;
      callBackCommands.quickFilters_cmd_archive = callBackCommands.cmd_archive;

      if (callBackCommands.cmd_moveMessage == callBackCommands.cmd_copyMessage) {
        Services.prompt.alert(
          window,
          "quickFilters Update",
          `Important - Thunderbird just updated from quickFilters 6.0 - you may have run a previous version of quickFilters which could not restore the action 'move message'. 
  Instead it will likely copy the messages right now.
  Please restart Thunderbird to avoid duplicate messages!`
        );
      }

      callBackCommands.cmd_moveMessage = function (destFolder) {
        // isCopy = false
        quickFilters.MsgMoveCopy_Wrapper(
          destFolder,
          false,
          callBackCommands.quickFilters_cmd_moveMessage
        );
      };

      callBackCommands.cmd_copyMessage = function (destFolder) {
        // isCopy = true
        quickFilters.MsgMoveCopy_Wrapper(
          destFolder,
          true,
          callBackCommands.quickFilters_cmd_copyMessage
        );
      };

      // monkey patch for archiving
      callBackCommands.cmd_archive = function () {
        quickFilters.MsgArchive_Wrapper(callBackCommands.quickFilters_cmd_archive);
      };
      // monkey foldertree patch drop method
      window.quickFilters.patchFolderTree(tabInfo);
    });

  window.quickFilters.addTabEventListener(); // add monkey patch code to new tabs..

  window.quickFilters.addKeyListener(window);

  window.quickFilters.onLoadQuickFilters();

  for (let info of window.gTabmail.tabInfo) {
    if (info.mode.name != "mail3PaneTab") {
      continue;
    }
    window.quickFilters.addTagListener(info.chromeBrowser.contentWindow); // window contain .mailContextMenu
  }

  window.quickFilters.addFolderListeners();
  window.quickFilters.Util.notifyTools.notifyBackground({ func: "UIListenersReady" });
}

// eslint-disable-next-line no-unused-vars
function onUnload(isAddOnShutown) {
  window.quickFilters.onUnload();
  // eslint-disable-next-line no-unused-vars
  function deleteBtn(id) {
    let btn = window.document.getElementById(id);
    if (btn) {
      btn.parentNode.removeChild(btn);
    }
  }
  window.removeEventListener("quickFilters.BackgroundUpdate.setAssistantButton", setAssistantButton);
  window.removeEventListener("quickFilters.BackgroundUpdate.doCommand", listener_doCommand);
  window.removeEventListener("quickFilters.BackgroundUpdate.toggleCurrentFolderButtons", listener_toggleFolder);
  window.removeEventListener(
    "quickFilters.BackgroundUpdate.addKeyListener",
    listener_initKeyListener
  );
  
  window.removeEventListener("quickFilters.BackgroundUpdate.updatequickFiltersLabel", listener_updatequickFiltersLabel);
  
  if (window.quickFilters.isKeyListener) {
    window.quickFilters.removeKeyListener(window);
  }
  window.quickFilters.removeTabEventListener();

  for (let info of window.gTabmail.tabInfo) {
    if (info.mode.name != "mail3PaneTab") {
      continue;
    }
    window.quickFilters.restoreTagListener(info.chromeBrowser.contentWindow); // window contain .mailContextMenu
  }
  

  window.quickFilters.removeFolderListeners();

  // restore monkey patched functions
  if (window.gTabmail) {
    window.gTabmail.tabInfo.filter(t => t.mode.name == "mail3PaneTab").forEach(tabInfo => {
      const callBackCommands = tabInfo.chromeBrowser.contentWindow.commandController._callbackCommands;
      if (callBackCommands.quickFilters_cmd_moveMessage) {
        callBackCommands.cmd_moveMessage = callBackCommands.quickFilters_cmd_moveMessage; // backup wrapped function
        delete callBackCommands.quickFilters_cmd_moveMessage;
      } else { 
        console.log("quickFilters: no cmd_moveMessage to restore", tabInfo) 
      }
      if (callBackCommands.quickFilters_cmd_copyMessage) {
        callBackCommands.cmd_copyMessage = callBackCommands.quickFilters_cmd_copyMessage; // backup wrapped function
        delete callBackCommands.quickFilters_cmd_copyMessage;
      } else { 
        console.log("quickFilters: no cmd_copyMessage to restore", tabInfo) 
      }
      if (callBackCommands.quickFilters_cmd_archive) {
        callBackCommands.cmd_archive = callBackCommands.quickFilters_cmd_archive;
        delete callBackCommands.quickFilters_cmd_archive;
      }else { 
        console.log("quickFilters: no cmd_archive to restore", tabInfo) 
      }

      // restore all folder tree listeners
      let fPane = tabInfo.chromeBrowser.contentWindow.folderPane;
      if (fPane && fPane.quickFilters_originalDrop) {
        fPane._onDrop = fPane.quickFilters_originalDrop;
        delete fPane.quickFilters_originalDrop
      }
      
    });
  }



}

