var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-preferences.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-interface.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-themes.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-util.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-filterList.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/overlayFilterList.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {
    let layout = WL.injectCSS("chrome://quickfolders/content/filterList.css");
 
    WL.injectElements(`
    
    <window id="filterListDialog">
	
    <label id="qf-FilterCount-n-of-m"
        hidden="true"
        value="&qf.label.filterCountN_of_M;" />
        
    <label id="qf-FilterCount-items"
        hidden="true"
        value="&qf.label.filterEntities;" />
    <label id="qf-FilterCount-1-item"
        hidden="true"
        value="&qf.label.filterSingleEntity;" />


    <html:input id="qf-Filter"
        flex="7"
        type="search"
        oncommand="QuickFolders.FilterList.onFindFilter(false, true);"
        emptytext="&qf.textbox.searchBox.emptyText;"
        tooltiptext="&qf.textbox.searchBox.toolTip;"
        isempty="true"
        timeout="300"
    />
    
    <label id="qf-FilterCount" 
        flex="1"
        />

    <button 
        id="qf-reorderButtonTop"
        insertbefore="reorderUpButton"
        label="&qf.button.reorderButtonTop;"
        accesskey="&qf.button.reorderButtonTop.accessKey;"
        tooltiptext="&qf.button.reorderButtonTop.toolTip;"
        oncommand="QuickFolders.FilterList.onTop(event);"
    />
    
    <button 
        id="qf-reorderButtonBottom"
        insertafter="reorderDownButton"
        label="&qf.button.reorderButtonBottom;"
        accesskey="&qf.button.reorderButtonBottom.accessKey;"
        tooltiptext="&qf.button.reorderButtonBottom.toolTip;"
        oncommand="QuickFolders.FilterList.onBottom(event);"
    />
    </window>
    
    `, ["chrome://quickfolders/locale/overlay.dtd"]);


    
    window.QuickFolders.Util.logDebug('Adding FilterList...');
    // obsolete window.addEventListener("load", function(e) { QuickFolders.FilterList.onLoadFilterList(e);}, false); 
    window.QuickFolders.FilterList.onLoadFilterList();  //? event needed?
}

function onUnload(isAddOnShutDown) {
}
