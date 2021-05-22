var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

Services.scriptloader.loadSubScript("chrome://quickfilters/content/quickFilters.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-preferences.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-utils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-rsa.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-register.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-worker.js", window, "UTF-8");

async function setAssistantButton(e) {
  window.quickFilters.Util.setAssistantButton(e.detail.active);
}

async function onLoad(activatedWhileWindowOpen) {
  console.log (Services.appinfo.version);
  let layout = WL.injectCSS("chrome://quickfilters/content/skin/quickFilters.css");
    
  WL.injectElements(`  
  <popup id="folderPaneContext">
    <menuitem id="quickfilters-menu-runMenu" 
	          label="__MSG_quickfilters.RunButton.label__" 
						class="menuitem-iconic"
            oncommand="quickFilters.onApplyFilters(event);"
			  />
    <menuitem id="quickfilters-menu-findFilter" 
				label="__MSG_quickfilters.findFiltersForFolder.menu__" 
			  class="menuitem-iconic"
				oncommand="quickFilters.searchFiltersFromFolder(event);"
			  />
  </popup>
`); 
  
  WL.injectElements(`

  <toolbarpalette id="MailToolbarPalette">
    <toolbarbutton id="quickfilters-toolbar-button"
                   class="toolbarbutton-1 chromeclass-toolbar-additional"
                   label="__MSG_quickfiltersToolbarButton.label__"
                   tooltiptext="__MSG_quickfiltersToolbarButton.tooltip__"
                   oncommand="quickFilters.onToolbarButtonCommand();"
				   context="dummy"
				   oncontextmenu="quickFilters.showOptions();"
				   />
    <toolbarbutton id="quickfilters-toolbar-listbutton"
                   class="toolbarbutton-1 chromeclass-toolbar-additional"
                   label="__MSG_quickfilters.ListButton.label__"
                   tooltiptext="__MSG_quickfilters.ListButton.tooltip__"
                   oncommand="quickFilters.onToolbarListCommand();"/>
    <toolbarbutton id="quickfilters-toolbar-runbutton"
                   class="toolbarbutton-1 chromeclass-toolbar-additional"
                   label="__MSG_quickfilters.RunButton.label__"
                   tooltiptext="__MSG_quickfilters.RunButton.tooltip__"
                   oncommand="quickFilters.onApplyFilters();"/>
    <toolbarbutton id="quickfilters-toolbar-msg-runbutton"
                   class="toolbarbutton-1 chromeclass-toolbar-additional"
                   label="__MSG_quickfilters.RunButton.label__"
                   tooltiptext="__MSG_quickfilters.RunButtonMsg.tooltip__"
                   oncommand="quickFilters.onApplyFiltersToSelection();"/>
  </toolbarpalette>
`); 
  
  WL.injectElements(`
  <menupopup id="taskPopup">
    <menuitem id="quickFilters-wizard"
              class="menuitem-iconic"
              insertBefore="applyFilters"
              label="__MSG_quickfilters.Start.label__"
              oncommand="quickFilters.onMenuItemCommand(event, 'toggle_Filters');"
			  />
  </menupopup>
  
  <menupopup id="messageMenuPopup">
    <menuitem id="quickFilters-fromMessageInMenu"
              class="menuitem-iconic"
              insertBefore="createFilter"
              label="__MSG_quickfilters.FromMessage.label__"
			        accesskey="__MSG_quickfilters.FromMessage.accesskey__"
              oncommand="quickFilters.onMenuItemCommand(event, 'createFilterFromMsg');"
			  />
  </menupopup>
  
  <!-- Thunderbird -->
  <popup id="mailContext">
    <menuitem id="quickFilters-fromMessage"
              class="menuitem-iconic"
              label="__MSG_quickfilters.FromMessage.label__"
              accesskey="__MSG_quickfilters.FromMessage.accesskey__"
              insertbefore="mailContext-saveAs"
              oncommand="quickFilters.onMenuItemCommand(event, 'createFilterFromMsg');"
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
             oncommand="quickFilters.onToolbarListCommand();"/>
    <toolbarbutton id="quickfilters-current-searchfilterbutton"
             class="icon"
             insertafter="quickfilters-current-listbutton"
             label=""
             tooltiptext="__MSG_quickfilters.findFiltersForFolder.menu__"
             oncommand="quickFilters.searchFiltersFromFolder();"/>
    <toolbarbutton id="quickfilters-current-runbutton"
             class="icon"
             insertafter="quickfilters-current-listbutton"
             label=""
             tooltiptext="__MSG_quickfilters.RunButton.tooltip__"
             oncommand="quickFilters.onApplyFilters();"/>
    <toolbarbutton id="quickfilters-current-msg-runbutton"
             class="icon"
             insertafter="quickfilters-current-runbutton"
             label=""
             tooltiptext="__MSG_quickfilters.RunButtonMsg.tooltip__"
             oncommand="quickFilters.onApplyFiltersToSelection();"/>
  </hbox>
  </toolbar>
`); 
  

  // Enable the global notify notifications from background.
  window.quickFilters.Util.notifyTools.enable();
  await window.quickFilters.Util.init();
  // window.addEventListener("quickFilters.BackgroundUpdate", window.quickFilters.initLicensedUI);

  window.addEventListener("quickFilters.BackgroundUpdate.setAssistantButton", setAssistantButton);
  window.addEventListener("quickFilters.BackgroundUpdate.toggleCurrentFolderButtons", window.quickFilters.toggleCurrentFolderButtons.bind(window.quickFilters));

  window.quickFilters.onLoad();
    
}

function onUnload(isAddOnShutown) {
  window.quickFilters.onUnload();
  function deleteBtn(id) {
    let btn = window.document.getElementById(id);
    if (btn)
      btn.parentNode.removeChild(btn);
  }
  window.removeEventListener("quickFilters.BackgroundUpdate.setAssistantButton", setAssistantButton);
  window.removeEventListener("quickFilters.BackgroundUpdate.toggleCurrentFolderButtons", window.quickFilters.toggleCurrentFolderButtons);
  // clean up current folder bar (if QuickFolders is installed)
  deleteBtn('quickfilters-current-listbutton');
  deleteBtn('quickfilters-current-runbutton');
  deleteBtn('quickfilters-current-msg-runbutton');
  deleteBtn('quickfilters-current-searchfilterbutton');
/*
  let treeView = window.gFolderTreeView;
  if (treeView) {
    // remove  custom flags!
    delete treeView["supportsIcons"];  
    delete treeView["qfIconsEnabled"];
    // remove my opwn function and restore the original
    if (window.QuickFolders.FolderTree.GetCellProperties) {
      window.gFolderTreeView.getCellProperties = window.QuickFolders.FolderTree.GetCellProperties;
      delete window.QuickFolders.FolderTree["GetCellProperties"];
      }
    */


  }

