
async function onLoad(activatedWhileWindowOpen) {
  let WAIT_FOR_3PANE = 2000;

  let layout = WL.injectCSS("chrome://quickfilters/content/skin/quickFilters.css");
  let layout2 = WL.injectCSS("chrome://quickfilters/content/skin/quickFilters-toolbar.css");
  
  window.setTimeout( 
    (win = window) => {
      console.log("qFi-3pane.js - onLoad()");
      win.quickFilters = win.parent.quickFilters;

      // QUICKFOLDERS NAVIGATION BAR INJECTION
      WL.injectElements(`
      <div id="threadPane">
      <hbox id="quickFilters-injected" collapsed="true">
        <toolbarbutton id="quickfilters-current-listbutton"
                class="icon"
                insertafter="QuickFolders-currentFolderFilterActive"
                label=""
                tooltiptext="__MSG_quickfilters.ListButton.tooltip__"
                oncommand="window.quickFilters.doCommand(this);"
                />
        <toolbarbutton id="quickfilters-current-searchfilterbutton"
                class="icon"
                insertafter="quickfilters-current-listbutton"
                label=""
                tooltiptext="__MSG_quickfilters.findFiltersForFolder.menu__"
                oncommand="window.quickFilters.doCommand(this);"
                />
        <toolbarbutton id="quickfilters-current-runbutton"
                class="icon"
                insertafter="quickfilters-current-listbutton"
                label=""
                tooltiptext="__MSG_quickfilters.RunButton.tooltip__"
                oncommand="window.quickFilters.doCommand(this);"
                />
        <toolbarbutton id="quickfilters-current-msg-runbutton"
                class="icon"
                insertafter="quickfilters-current-runbutton"
                label=""
                tooltiptext="__MSG_quickfilters.RunButtonMsg.tooltip__"
                oncommand="window.quickFilters.doCommand(this);"
                />
      </hbox>
      </div>`); 

    }
  );

}


function onUnload(isAddOnShutown) {
  let document3pane = window.document;


  function deleteBtn(id) {
    let btn = document3pane.getElementById(id);
    if (btn) {
      btn.parentNode.removeChild(btn);
    }
  }

  // clean up current folder bar (if QuickFolders is installed)
  deleteBtn('quickfilters-current-listbutton');
  deleteBtn('quickfilters-current-runbutton');
  deleteBtn('quickfilters-current-msg-runbutton');
  deleteBtn('quickfilters-current-searchfilterbutton');
}

