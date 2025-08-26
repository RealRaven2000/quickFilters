/* globals 
  WL
*/

async function setAssistantButton(e) {
  window.quickFilters.Util.setAssistantButton(e.detail.active);
}
// eslint-disable-next-line no-unused-vars
async function addTagListener(win, e) {
  window.quickFilters.Util.addTagListener(win);
}

// eslint-disable-next-line no-unused-vars
async function onLoad(_activatedWhileWindowOpen) {
  WL.injectCSS("chrome://quickfilters/content/skin/quickFilters.css");
  WL.injectCSS("chrome://quickfilters/content/skin/quickFilters-toolbar.css");

  window.setTimeout((win = window) => {
    console.log("qFi-3pane.js - onLoad()");
    win.quickFilters = win.parent.quickFilters;

    // QUICKFOLDERS NAVIGATION BAR INJECTION
    WL.injectElements(`
      <div id="threadPane">
      <hbox id="quickFilters-injected" collapsed="true">
        <toolbarbutton id="quickfilters-current-runbutton"
                class="icon"
                insertafter="QuickFolders-currentFolderFilterActive"
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
        <toolbarbutton id="quickfilters-current-listbutton"
                class="icon"
                insertafter="quickfilters-current-msg-runbutton"
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
      </hbox>
      </div>`);
  });

  window.addEventListener("quickFilters.BackgroundUpdate.setAssistantButton", setAssistantButton);
}

// eslint-disable-next-line no-unused-vars
function onUnload(isAddOnShutown) {
  let document3pane = window.document;
  window.quickFilters.restoreTagListener(window);

  function deleteBtn(id) {
    let btn = document3pane.getElementById(id);
    if (btn) {
      btn.parentNode.removeChild(btn);
    }
  }

  // clean up current folder bar (if QuickFolders is installed)
  deleteBtn("quickfilters-current-listbutton");
  deleteBtn("quickfilters-current-runbutton");
  deleteBtn("quickfilters-current-msg-runbutton");
  deleteBtn("quickfilters-current-searchfilterbutton");
  window.removeEventListener(
    "quickFilters.BackgroundUpdate.setAssistantButton",
    setAssistantButton
  );
}
