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
                   label="__MSG_quickfiltersToolbarButton.label__"
                   tooltiptext="__MSG_quickfiltersToolbarButton.tooltip__"
                   context="dummy"
                   oncontextmenu="quickFilters.showOptions();"
				   />
    <toolbarbutton id="quickfilters-toolbar-listbutton"
                   class="toolbarbutton-1 chromeclass-toolbar-additional"
                   label="__MSG_quickfilters.ListButton.label__"
                   tooltiptext="__MSG_quickfilters.ListButton.tooltip__"
                   />
    <toolbarbutton id="quickfilters-toolbar-runbutton"
                   class="toolbarbutton-1 chromeclass-toolbar-additional"
                   label="__MSG_quickfilters.RunButton.label__"
                   tooltiptext="__MSG_quickfilters.RunButton.tooltip__"
                   />
    <toolbarbutton id="quickfilters-toolbar-msg-runbutton"
                   class="toolbarbutton-1 chromeclass-toolbar-additional"
                   label="__MSG_quickfilters.RunButton.label__"
                   tooltiptext="__MSG_quickfilters.RunButtonMsg.tooltip__"
                   />
  </toolbarpalette>
`); 
  
  // [issue 122] false positives from antivirus scanners
  let btnTool = document.getElementById("quickfilters-toolbar-button");
  if (btnTool) btnTool.addEventListener("command", function(event) {window.quickFilters.onToolbarButtonCommand();} );  
  let btnList = document.getElementById("quickfilters-toolbar-listbutton");
  if (btnList) btnList.addEventListener("command", function(event) {window.quickFilters.onToolbarListCommand();} );  
  btnRun = document.getElementById("quickfilters-toolbar-runbutton");
  if (btnRun) btnRun.addEventListener("command", function(event) {window.quickFilters.onApplyFilters();} );  
  let btnApply = document.getElementById("quickfilters-toolbar-msg-runbutton");
  if (btnApply) btnApply.addEventListener("command", function(event) {window.quickFilters.onApplyFiltersToSelection();} );  
  
  WL.injectElements(`
  <menupopup id="taskPopup">
    <menuitem id="quickFilters-wizard"
              class="menuitem-iconic"
              insertBefore="applyFilters"
              label="__MSG_quickfilters.Start.label__"
              />
  </menupopup>
  
  <menupopup id="messageMenuPopup">
    <menuitem id="quickFilters-fromMessageInMenu"
              class="menuitem-iconic"
              insertBefore="createFilter"
              label="__MSG_quickfilters.FromMessage.label__"
			        accesskey="__MSG_quickfilters.FromMessage.accesskey__"
              />
  </menupopup>
  
  <!-- Thunderbird -->
  <popup id="mailContext">
    <menuitem id="quickFilters-fromMessage"
              class="menuitem-iconic"
              label="__MSG_quickfilters.FromMessage.label__"
              accesskey="__MSG_quickfilters.FromMessage.accesskey__"
              insertbefore="mailContext-saveAs"
              />
  </popup>
`);

  // [issue 122] false positives from antivirus scanners
  let mnuWizard = document.getElementById("quickFilters-wizard");
  if (mnuWizard) mnuWizard.addEventListener("command", function(event) {window.quickFilters.onMenuItemCommand(event, 'toggle_Filters');} );  
  let mnuCreateFromMsg = document.getElementById("quickFilters-fromMessageInMenu");
  if (mnuCreateFromMsg) mnuCreateFromMsg.addEventListener("command", function(event) {window.quickFilters.onMenuItemCommand(event, 'createFilterFromMsg');} );  
  let mnuCreateFromMsg2 = document.getElementById("quickFilters-fromMessage");
  if (mnuCreateFromMsg2) mnuCreateFromMsg2.addEventListener("command", function(event) {window.quickFilters.onMenuItemCommand(event, 'createFilterFromMsg');} );  


  // from qFilters-QF-tb68.xul

  WL.injectElements(`
  <toolbar id="mail-bar3">
  <hbox id="quickFilters-injected" collapsed="true">
    <toolbarbutton id="quickfilters-current-listbutton"
             class="icon"
             insertafter="QuickFolders-currentFolderFilterActive"
             label=""
             tooltiptext="__MSG_quickfilters.ListButton.tooltip__"
             />
    <toolbarbutton id="quickfilters-current-searchfilterbutton"
             class="icon"
             insertafter="quickfilters-current-listbutton"
             label=""
             tooltiptext="__MSG_quickfilters.findFiltersForFolder.menu__"
             />
    <toolbarbutton id="quickfilters-current-runbutton"
             class="icon"
             insertafter="quickfilters-current-listbutton"
             label=""
             tooltiptext="__MSG_quickfilters.RunButton.tooltip__"
             />
    <toolbarbutton id="quickfilters-current-msg-runbutton"
             class="icon"
             insertafter="quickfilters-current-runbutton"
             label=""
             tooltiptext="__MSG_quickfilters.RunButtonMsg.tooltip__"
             />
  </hbox>
  </toolbar>
`); 

  
  
  // [issue 122] false positives from antivirus scanners
  btnList = document.getElementById("quickfilters-current-listbutton");
  if (btnList) btnList.addEventListener("command", function(event) {window.quickFilters.onToolbarListCommand();} );  
  btnFind = document.getElementById("quickfilters-current-searchfilterbutton");
  if (btnFind) btnFind.addEventListener("command", function(event) {window.quickFilters.searchFiltersFromFolder();} );
  btnRun = document.getElementById("quickfilters-current-runbutton");
  if (btnRun) btnRun.addEventListener("command", function(event) {window.quickFilters.onApplyFilters();} );
  btnApply = document.getElementById("quickfilters-current-msg-runbutton");
  if (btnApply) btnApply.addEventListener("command", function(event) {window.quickFilters.onApplyFiltersToSelection();} );  


  // Enable the global notify notifications from background.
  window.quickFilters.Util.notifyTools.enable();
  await window.quickFilters.Util.init();
  // window.addEventListener("quickFilters.BackgroundUpdate", window.quickFilters.initLicensedUI);

  window.addEventListener("quickFilters.BackgroundUpdate.setAssistantButton", setAssistantButton);
  listener_toggleFolder = window.quickFilters.toggleCurrentFolderButtons.bind(window.quickFilters)
  window.addEventListener("quickFilters.BackgroundUpdate.toggleCurrentFolderButtons", listener_toggleFolder);
  
  listener_updatequickFiltersLabel = window.quickFilters.updatequickFiltersLabel.bind(window.quickFilters);
  window.addEventListener("quickFilters.BackgroundUpdate.updatequickFiltersLabel", listener_updatequickFiltersLabel);
  
  window.quickFilters.addKeyListener(window);

  window.quickFilters.onLoadQuickFilters();
  window.quickFilters.addTagListener();
    
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
  
  // clean up current folder bar (if QuickFolders is installed)
  deleteBtn('quickfilters-current-listbutton');
  deleteBtn('quickfilters-current-runbutton');
  deleteBtn('quickfilters-current-msg-runbutton');
  deleteBtn('quickfilters-current-searchfilterbutton');


}

