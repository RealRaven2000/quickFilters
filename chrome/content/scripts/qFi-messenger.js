Services.scriptloader.loadSubScript("chrome://quickfilters/content/quickFilters.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-preferences.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-utils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-worker.js", window, "UTF-8");

async function setAssistantButton(e) {
  window.quickFilters.Util.setAssistantButton(e.detail.active);
}

var listener_toggleFolder, listener_updatequickFiltersLabel;

async function onLoad(activatedWhileWindowOpen) {
  // console.log ("quickFilters Background Script, running in TB ", await Services.appinfo.version);
  let layout = WL.injectCSS("chrome://quickfilters/content/skin/quickFilters.css");
  let layout2 = WL.injectCSS("chrome://quickfilters/content/skin/quickFilters-toolbar.css");
    
  WL.injectElements(`  
  <popup id="folderPaneContext">
    <menuitem id="quickfilters-menu-runMenu" 
	          label="__MSG_quickfilters.RunButton.label__" 
						class="menuitem-iconic"
			  />
    <menuitem id="quickfilters-menu-findFilter" 
				label="__MSG_quickfilters.findFiltersForFolder.menu__" 
			  class="menuitem-iconic"
			  />
  </popup>
  `); 

  // [issue 122] false positives from antivirus scanners
  let btnRun = document.getElementById("quickfilters-menu-runMenu");
  if (btnRun) btnRun.addEventListener("command", function(event) {window.quickFilters.onApplyFilters(event);} );
  let btnFind = document.getElementById("quickfilters-menu-findFilter");
  if (btnFind) btnFind.addEventListener("command", function(event) {window.quickFilters.searchFiltersFromFolder(event);} );
  
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
                   oncommand="window.quickFilters.doCommmand(this);"
                   />

    <toolbarbutton id="quickfilters-toolbar-runbutton"
                   class="toolbarbutton-1 chromeclass-toolbar-additional"
                   label="__MSG_quickfilters.RunButton.label__"
                   tooltiptext="__MSG_quickfilters.RunButton.tooltip__"
                   oncommand="window.quickFilters.doCommmand(this);"
                   />
    <toolbarbutton id="quickfilters-toolbar-msg-runbutton"
                   class="toolbarbutton-1 chromeclass-toolbar-additional"
                   label="__MSG_quickfilters.RunButtonMsg.label__"
                   tooltiptext="__MSG_quickfilters.RunButtonMsg.tooltip__"
                   oncommand="window.quickFilters.doCommmand(this);"
                   />
  </toolbarpalette>
`); 

  window.quickFilters.doCommmand = function (el) {
    if (!el) {
      return;
    }
    switch (el.id) {
      case "quickfilters-checkLicense":
        window.quickFilters.Util.viewLicense();
        break;
      case "quickfilters-news": // fal;-through
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
        window.quickFilters.onApplyFilters();
        break;
      case "quickfilters-toolbar-msg-runbutton":  // fall-throughs
      case "quickfilters-runFiltersMsg":
      case "quickfilters-current-msg-runbutton":
        window.quickFilters.onApplyFiltersToSelection();
        break;
      case "quickfilters-toggleAssistant":
      case "quickFilters-wizard":
        window.quickFilters.onMenuItemCommand("toggle_Filters");
        break;
      case "quickfilters-options":
        window.quickFilters.showOptions();
        break;
      case "quickfilters-gopro":
        window.quickFilters.Util.showLicenseDialog('mainBtnPopupMenu');
        break;
      case "quickFilters-menu-filterFromMsg": // fall-throughs
      case "quickFilters-fromMessageInMenu":
      case "quickFilters-fromMessage":
        window.quickFilters.onMenuItemCommand('createFilterFromMsg');
        break;
      case "quickfilters-menu-searchfilters": // fall-through
      case "quickfilters-current-searchfilterbutton":
        window.quickFilters.searchFiltersFromFolder();
        break;
      default:
        console.log("unknown quickFilters command", el.id || "id: N/A", el);
    }

  }

  // let mnuToolsFindFilters = document.getElementById("quickfilters-menu-searchfilters");
  // if ( mnuToolsFindFilters)  mnuToolsFindFilters.addEventListener("command", function(event) { window.quickFilters.searchFiltersFromFolder();} );  

  // note: the taskPopup (Tools menu)
  //       apparently doesn't show this command in TB102, may be dues to  gMenuBuilder.build()
  //       recreating the popup! (Ask TbSync how to add a menu using ext-menus.js)
  WL.injectElements(`
  <menupopup id="taskPopup">
    <menuitem id="quickFilters-wizard"
              class="menuitem-iconic"
              insertBefore="applyFilters"
              label="__MSG_quickfilters.Start.label__"
              oncommand="window.quickFilters.doCommmand(this);"
              />
  </menupopup>
  
  <menupopup id="messageMenuPopup">
    <menuitem id="quickFilters-fromMessageInMenu"
              class="menuitem-iconic"
              insertBefore="createFilter"
              label="__MSG_quickfilters.FromMessage.label__"
			        accesskey="__MSG_quickfilters.FromMessage.accesskey__"
              oncommand="window.quickFilters.doCommmand(this);"
              />
  </menupopup>
  `);

  // Tb115: menupopup, not popup!

  // this needs to be injected into the document "about:3pane" instead!
  WL.injectElements(`
  <menupopup id="mailContext">
    <menuitem id="quickFilters-fromMessage"
              class="menuitem-iconic"
              label="__MSG_quickfilters.FromMessage.label__"
              accesskey="__MSG_quickfilters.FromMessage.accesskey__"
              insertbefore="mailContext-saveAs"
              oncommand="window.quickFilters.doCommmand(this);"
              />
  </menupopup>
  `);

  // from qFilters-QF-tb68.xul
  
  // QUICKFOLDERS INJECTION
  WL.injectElements(`
  <toolbar id="mail-bar3">
  <hbox id="quickFilters-injected" collapsed="true">
    <toolbarbutton id="quickfilters-current-listbutton"
             class="icon"
             insertafter="QuickFolders-currentFolderFilterActive"
             label=""
             tooltiptext="__MSG_quickfilters.ListButton.tooltip__"
             oncommand="window.quickFilters.doCommmand(this);"
             />
    <toolbarbutton id="quickfilters-current-searchfilterbutton"
             class="icon"
             insertafter="quickfilters-current-listbutton"
             label=""
             tooltiptext="__MSG_quickfilters.findFiltersForFolder.menu__"
             oncommand="window.quickFilters.doCommmand(this);"
             />
    <toolbarbutton id="quickfilters-current-runbutton"
             class="icon"
             insertafter="quickfilters-current-listbutton"
             label=""
             tooltiptext="__MSG_quickfilters.RunButton.tooltip__"
             oncommand="window.quickFilters.doCommmand(this);"
             />
    <toolbarbutton id="quickfilters-current-msg-runbutton"
             class="icon"
             insertafter="quickfilters-current-runbutton"
             label=""
             tooltiptext="__MSG_quickfilters.RunButtonMsg.tooltip__"
             oncommand="window.quickFilters.doCommmand(this);"
             />
  </hbox>
  </toolbar>
`); 

  // we need the WindowListener to inject UI later (tab listener)
  window.quickFilters.WL = WL;

  // Enable the global notify notifications from background.
  window.quickFilters.Util.notifyTools.enable();
  await window.quickFilters.Util.init();
  // window.addEventListener("quickFilters.BackgroundUpdate", window.quickFilters.initLicensedUI);

  window.addEventListener("quickFilters.BackgroundUpdate.setAssistantButton", setAssistantButton);
  listener_toggleFolder = window.quickFilters.toggleCurrentFolderButtons.bind(window.quickFilters)
  window.addEventListener("quickFilters.BackgroundUpdate.toggleCurrentFolderButtons", listener_toggleFolder);
  
  listener_updatequickFiltersLabel = window.quickFilters.updatequickFiltersLabel.bind(window.quickFilters);
  window.addEventListener("quickFilters.BackgroundUpdate.updatequickFiltersLabel", listener_updatequickFiltersLabel);

  // The following will only work if we are currently in a mail pane (ATN update)
  // otherwise, we need to call this again in a tab listener
  window.quickFilters.patchMailPane(); 



  // iterate all mail tabs!
  window.gTabmail.tabInfo.filter(t => t.mode.name == "mail3PaneTab").forEach(tabInfo => {
    const quickFilters = window.quickFilters;
    const callBackCommands = tabInfo.chromeBrowser.contentWindow.commandController._callbackCommands;
    // backup wrapped functions:
    callBackCommands.quickFilters_cmd_moveMessage = callBackCommands.cmd_moveMessage; 
    callBackCommands.quickFilters_cmd_copyMessage = callBackCommands.cmd_copyMessage; 
    callBackCommands.quickFilters_cmd_archive = callBackCommands.cmd_archive;

    callBackCommands.cmd_moveMessage = function (destFolder) {
      // isCopy = false
      quickFilters.MsgMoveCopy_Wrapper(destFolder, false, callBackCommands.quickFilters_cmd_moveMessage);  
    }

    callBackCommands.cmd_copyMessage = function (destFolder) {
      // isCopy = true
      quickFilters.MsgMoveCopy_Wrapper(destFolder, true, callBackCommands.quickFilters_cmd_copyMessage);  
    }

    // monkey patch for archiving
    callBackCommands.cmd_archive = function () {
      quickFilters.MsgArchive_Wrapper(callBackCommands.quickFilters_cmd_archive);
    }    

    // monkey foldertree patch drop method
    quickFilters.patchFolderTree(tabInfo);
  });
  window.quickFilters.addTabEventListener(); // add monkey patch code to new tabs..
  
  window.quickFilters.addKeyListener(window);
  

  window.quickFilters.onLoadQuickFilters();
  window.quickFilters.addTagListener();
  window.quickFilters.addFolderListeners();
    
}

function onUnload(isAddOnShutown) {
  window.quickFilters.onUnload();
  function deleteBtn(id) {
    let btn = window.document.getElementById(id);
    if (btn) {
      btn.parentNode.removeChild(btn);
    }
  }
  window.removeEventListener("quickFilters.BackgroundUpdate.setAssistantButton", setAssistantButton);
  window.removeEventListener("quickFilters.BackgroundUpdate.toggleCurrentFolderButtons", listener_toggleFolder);
  window.removeEventListener("quickFilters.BackgroundUpdate.updatequickFiltersLabel", listener_updatequickFiltersLabel);
  if (window.quickFilters.isKeyListener) {
    window.quickFilters.removeKeyListener(window);
  }
  window.quickFilters.restoreTagListener();
  window.quickFilters.removeFolderListeners();

  // restore monkey patched functions
  window.gTabmail.tabInfo.filter(t => t.mode.name == "mail3PaneTab").forEach(tabInfo => {
    const callBackCommands = tabInfo.chromeBrowser.contentWindow.commandController._callbackCommands;
    if (callBackCommands.quickFilters_cmd_moveMessage) {
      callBackCommands.cmd_moveMessage = callBackCommands.quickFilters_cmd_moveMessage; // backup wrapped function
      delete callBackCommands.quickFilters_cmd_moveMessage;
    }
    if (callBackCommands.quickFilters_cmd_copyMessage) {
      callBackCommands.cmd_moveMessage = callBackCommands.quickFilters_cmd_copyMessage; // backup wrapped function
      delete callBackCommands.quickFilters_cmd_copyMessage;
    }
    if (callBackCommands.quickFilters_cmd_archive) {
      callBackCommands.cmd_archive = callBackCommands.quickFilters_cmd_archive;
      delete callBackCommands.quickFilters_cmd_archive;
    }

    // restore all folder tree listeners
    let fPane = tabInfo.chromeBrowser.contentWindow.folderPane;
    if (fPane && fPane.quickFilters_originalDrop) {
      fPane._onDrop = fPane.quickFilters_originalDrop;
      delete fPane.quickFilters_originalDrop
    }
    
  });  


  
  // clean up current folder bar (if QuickFolders is installed)
  deleteBtn('quickfilters-current-listbutton');
  deleteBtn('quickfilters-current-runbutton');
  deleteBtn('quickfilters-current-msg-runbutton');
  deleteBtn('quickfilters-current-searchfilterbutton');


}

