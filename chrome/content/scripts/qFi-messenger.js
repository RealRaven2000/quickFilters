var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

Services.scriptloader.loadSubScript("chrome://quickfilters/content/quickFilters.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-preferences.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-utils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-worker.js", window, "UTF-8");

async function setAssistantButton(e) {
  window.quickFilters.Util.setAssistantButton(e.detail.active);
}

var listener_toggleFolder, listener_updatequickFiltersLabel;

async function onLoad(activatedWhileWindowOpen) {
  console.log (Services.appinfo.version);
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
      <menupopup>
        <menuitem id="quickfilters-news" label="__MSG_quickfilters.menu.news__" class="menuitem-iconic" oncommand="window.quickFilters.doCommmand(this);" />
        <menuitem id="quickfilters-checkLicense"    label="__MSG_quickfilters.menu.license__" class="menuitem-iconic" oncommand="window.quickFilters.doCommmand(this);"/>
        <menuitem id="quickfilters-toggleAssistant" label="__MSG_quickfilters.FilterAssistant.start__" class="menuitem-iconic" oncommand="window.quickFilters.doCommmand(this);"  />
        <menuitem id="quickfilters-runFilters"      label="__MSG_quickfilters.RunButton.label__" class="menuitem-iconic" oncommand="window.quickFilters.doCommmand(this);"/>
        <menuitem id="quickfilters-runFiltersMsg"   label="__MSG_quickfilters.RunButtonMsg.label__" class="menuitem-iconic" oncommand="window.quickFilters.doCommmand(this);"/>
        <menuseparator />
        <menu label="__MSG_quickfilters.menu.tools__">
          <menupopup>
            <menuitem id="quickfilters-menu-filterlist" label="__MSG_quickfilters.ListButton.label__" class="menuitem-iconic" oncommand="window.quickFilters.doCommmand(this);"/>
            <menuitem id="quickFilters-menu-filterFromMsg" label="__MSG_quickfilters.FromMessage.label__" oncommand="window.quickFilters.doCommmand(this);" />                    
            <menuitem id="quickfilters-menu-searchfilters" label="__MSG_quickfilters.findFiltersForFolder.menu__"  class="menuitem-iconic" oncommand="window.quickFilters.doCommmand(this);"/>
          </menupopup>
        </menu>
        <menuitem id="quickfilters-options" label="__MSG_quickfilters.button.settings__" class="menuitem-iconic" oncommand="window.quickFilters.doCommmand(this);"/>
        <menuitem id="quickfilters-changelog"    label="__MSG_quickfilters.menu.changelog__" class="menuitem-iconic" oncommand="window.quickFilters.doCommmand(this);" />
        <menuitem id="quickfilters-gopro"   label="__MSG_getquickFilters__" class="menuitem-iconic" oncommand="window.quickFilters.doCommmand(this);" />
      </menupopup>
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

  let mnuToolsCreateFromMsg  = document.getElementById("quickFilters-menu-filterFromMsg");
  if (mnuToolsCreateFromMsg) {
    mnuToolsCreateFromMsg.label = mnuToolsCreateFromMsg.label.replace("quickFilters: ", "");
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
  
  <!-- Thunderbird -->
  <popup id="mailContext">
    <menuitem id="quickFilters-fromMessage"
              class="menuitem-iconic"
              label="__MSG_quickfilters.FromMessage.label__"
              accesskey="__MSG_quickfilters.FromMessage.accesskey__"
              insertbefore="mailContext-saveAs"
              oncommand="window.quickFilters.doCommmand(this);"
              />
  </popup>
`);

  // from qFilters-QF-tb68.xul

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

  
  // Enable the global notify notifications from background.
  window.quickFilters.Util.notifyTools.enable();
  await window.quickFilters.Util.init();
  // set up updating the label at midnight
  window.quickFilters.Util.setMidnightTimer();

  // window.addEventListener("quickFilters.BackgroundUpdate", window.quickFilters.initLicensedUI);

  window.addEventListener("quickFilters.BackgroundUpdate.setAssistantButton", setAssistantButton);
  listener_toggleFolder = window.quickFilters.toggleCurrentFolderButtons.bind(window.quickFilters)
  window.addEventListener("quickFilters.BackgroundUpdate.toggleCurrentFolderButtons", listener_toggleFolder);
  
  listener_updatequickFiltersLabel = window.quickFilters.updatequickFiltersLabel.bind(window.quickFilters);
  window.addEventListener("quickFilters.BackgroundUpdate.updatequickFiltersLabel", listener_updatequickFiltersLabel);
  
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
  
  // clean up current folder bar (if QuickFolders is installed)
  deleteBtn('quickfilters-current-listbutton');
  deleteBtn('quickfilters-current-runbutton');
  deleteBtn('quickfilters-current-msg-runbutton');
  deleteBtn('quickfilters-current-searchfilterbutton');


}

