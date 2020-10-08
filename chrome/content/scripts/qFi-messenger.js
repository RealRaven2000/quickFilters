var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

Services.scriptloader.loadSubScript("chrome://quickfilters/content/quickFilters.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-preferences.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-utils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-rsa.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-register.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-worker.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {
    console.log (Services.appinfo.version);
    let layout = WL.injectCSS("chrome://quickfilters/content/skin/quickFilters.css");
    
    // from quickfilters-overlay.xul
    WL.injectElements(`
  <stringbundleset id="stringbundleset">
    <stringbundle id="quickFilters-strings" src="chrome://quickfilters/locale/overlay.properties"/>
  </stringbundleset>
  
  <popup id="folderPaneContext">
    <menuitem id="quickfilters-menu-runMenu" 
	          label="&quickfilters.RunButton.label;" 
						class="menuitem-iconic"
            oncommand="quickFilters.onApplyFilters(event);"
			  />
    <menuitem id="quickfilters-menu-findFilter" 
				label="&quickfilters.findFiltersForFolder.menu;" 
			  class="menuitem-iconic"
				oncommand="quickFilters.searchFiltersFromFolder(event);"
			  />
  </popup>
  

  <toolbarpalette id="MailToolbarPalette">
    <toolbarbutton id="quickfilters-toolbar-button"
                   class="toolbarbutton-1 chromeclass-toolbar-additional"
                   label="&quickfiltersToolbarButton.label;"
                   tooltiptext="&quickfiltersToolbarButton.tooltip;"
                   oncommand="quickFilters.onToolbarButtonCommand();"
				   context="dummy"
				   oncontextmenu="quickFilters.showOptions();"
				   />
    <toolbarbutton id="quickfilters-toolbar-listbutton"
                   class="toolbarbutton-1 chromeclass-toolbar-additional"
                   label="&quickfilters.ListButton.label;"
                   tooltiptext="&quickfilters.ListButton.tooltip;"
                   oncommand="quickFilters.onToolbarListCommand();"/>
    <toolbarbutton id="quickfilters-toolbar-runbutton"
                   class="toolbarbutton-1 chromeclass-toolbar-additional"
                   label="&quickfilters.RunButton.label;"
                   tooltiptext="&quickfilters.RunButton.tooltip;"
                   oncommand="quickFilters.onApplyFilters();"/>
    <toolbarbutton id="quickfilters-toolbar-msg-runbutton"
                   class="toolbarbutton-1 chromeclass-toolbar-additional"
                   label="&quickfilters.RunButton.label;"
                   tooltiptext="&quickfilters.RunButtonMsg.tooltip;"
                   oncommand="quickFilters.onApplyFiltersToSelection();"/>
  </toolbarpalette>

  <menupopup id="taskPopup">
    <menuitem id="quickFilters-wizard"
              class="menuitem-iconic"
              insertBefore="applyFilters"
              label="&quickfilters.Start.label;"
              oncommand="quickFilters.onMenuItemCommand(event, 'toggle_Filters');"
			  />
  </menupopup>
  
  <menupopup id="messageMenuPopup">
    <menuitem id="quickFilters-fromMessageInMenu"
              class="menuitem-iconic"
              insertBefore="createFilter"
              label="&quickfilters.FromMessage.label;"
			        accesskey="&quickfilters.FromMessage.accesskey;"
              oncommand="quickFilters.onMenuItemCommand(event, 'createFilterFromMsg');"
			  />
  </menupopup>
  
  <!-- Thunderbird -->
  <popup id="mailContext">
    <menuitem id="quickFilters-fromMessage"
              class="menuitem-iconic"
              label="&quickfilters.FromMessage.label;"
              accesskey="&quickfilters.FromMessage.accesskey;"
              insertbefore="mailContext-saveAs"
              oncommand="quickFilters.onMenuItemCommand(event, 'createFilterFromMsg');"
			  />
  </popup>
       
`, ["chrome://quickfilters/locale/overlay.dtd"]);

//from qFilters-QF-tb68.xul

WL.injectElements(`
<toolbar id="mail-bar3">
<hbox id="quickFilters-injected" collapsed="true">
  <toolbarbutton id="quickfilters-current-listbutton"
           class="icon"
           insertafter="QuickFolders-currentFolderFilterActive"
           label=""
           tooltiptext="&quickfilters.ListButton.tooltip;"
           oncommand="quickFilters.onToolbarListCommand();"/>
  <toolbarbutton id="quickfilters-current-searchfilterbutton"
           class="icon"
           insertafter="quickfilters-current-listbutton"
           label=""
           tooltiptext="&quickfilters.findFiltersForFolder.menu;"
           oncommand="quickFilters.searchFiltersFromFolder();"/>
  <toolbarbutton id="quickfilters-current-runbutton"
           class="icon"
           insertafter="quickfilters-current-listbutton"
           label=""
           tooltiptext="&quickfilters.RunButton.tooltip;"
           oncommand="quickFilters.onApplyFilters();"/>
  <toolbarbutton id="quickfilters-current-msg-runbutton"
           class="icon"
           insertafter="quickfilters-current-runbutton"
           label=""
           tooltiptext="&quickfilters.RunButtonMsg.tooltip;"
           oncommand="quickFilters.onApplyFiltersToSelection();"/>
</hbox>
</toolbar>


`, ["chrome://quickfilters/locale/overlay.dtd"]);


    window.quickFilters.onLoad();

    
 }

function onUnload(isAddOnShutown) {
    window.quickFilters.onUnload();
    function deleteBtn(id) {
      let btn = window.document.getElementById(id);
      if (btn)
        btn.parentNode.removeChild(btn);
    }
    
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

