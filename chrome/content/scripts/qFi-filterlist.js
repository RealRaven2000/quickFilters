async function setAssistantButton(e) {
  window.quickFilters.List.setAssistantButton(e.detail.active);
}
async function configureToolbar() {
  window.quickFilters.List.setupToolbar();
}

Services.scriptloader.loadSubScript("chrome://quickfilters/content/quickFilters.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-utils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-worker.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-list.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-preferences.js", window, "UTF-8");
/*  execute quickFilters.List.onLoadFilterList() when loading window   */
/* Services.scriptloader.loadSubScript("chrome://quickfilters/content/overlayFilterList.js", window, "UTF-8"); */

async function onLoad(activatedWhileWindowOpen) {
  //TODO do we need "chrome://global/skin/"??
  let layout1 = WL.injectCSS("chrome://quickfilters/content/filterList.css");
  let layout2 = WL.injectCSS("chrome://quickfilters/content/filterWidgets.css");
  // legacy css rules
  
  // let info = await browser.runtime.getBrowserInfo(); parseInt(info.version,10)<102
  if (window.quickFilters.Util.versionSmaller(window.quickFilters.Util.AppverFull, "102")) {
    WL.injectCSS("chrome://quickfilters/content/filterList-78.css");
  }
  

  WL.injectElements(`
  
<window id="filterListDialog">

  <popupset id="QuickFilterTreeContextSet">
    <menupopup id="quickFiltersContext">
      <menuitem id="quickFiltersCut" class="menuitem-iconic"
        label="__MSG_quickfilters.menu.cut__"
        oncommand="quickFilters.List.cutFilters();"
        />
      <menuitem id="quickFiltersCopy" class="menuitem-iconic"
        label="__MSG_quickfilters.menu.copy__"
        oncommand="quickFilters.List.copyFilters();"
        />
      <menuitem id="quickFiltersPaste" class="menuitem-iconic"
        label="__MSG_quickfilters.menu.paste__"
        oncommand="quickFilters.List.pasteFilters(false);"
        />
      <menuitem id="quickFiltersRemoveDuplicate" class="menuitem-iconic"
        label="Remove duplicate condition: "
        collapsed="true"
        oncommand="quickFilters.List.removeSelectedCurrentDupe(this);"
        />
    </menupopup>
    
    <panel id="quickFilterNotification" noautohide="true">	
      <notificationbox flex="1" id="quickFilterNotificationBox" >
        <!-- <notification type="warning" label="Test" id="quickFiltersNotificationContent"/> -->
      </notificationbox>
    </panel>
    
  </popupset>
  <popupset id="QuickFilterSearchContextSet">
    <menupopup id="quickFiltersSearchContext">
      <menuitem 
          id="quickFiltersSearchName"
          class="menuitem-iconic"
        label="__MSG_quickfilters.option.searchProperty.name__"
        oncommand="quickFilters.List.toggleSearchType('name');"
        type="radio"
        name="searchType"
        checked="true"
        />
      <menuitem 
          id="quickFiltersSearchTargetFolder"
          class="menuitem-iconic"
        label="__MSG_quickfilters.option.searchProperty.targetFolder__"
        oncommand="quickFilters.List.toggleSearchType('targetFolder',true);"
        type="radio"
        name="searchType"
        />
      <menuitem 
          id="quickFiltersSearchCondition"
          class="menuitem-iconic"
        label="__MSG_quickfilters.option.searchProperty.searchCondition__"
        oncommand="quickFilters.List.toggleSearchType('condition',true);"
        type="radio"
        name="searchType"
        />
      <menuitem 
          id="quickFiltersSearchStringAction"
          class="menuitem-iconic"
          label="__MSG_quickfilters.option.searchProperty.setCustomStringAction__"
          oncommand="quickFilters.List.toggleSearchType('stringAction',true);"
          type="radio"
          name="searchType"
        />
      <menuitem 
          id="quickFiltersSearchTag"
          class="menuitem-iconic"
        label="__MSG_quickfilters.option.searchProperty.addTag__"
        oncommand="quickFilters.List.toggleSearchType('tagLabel',true);"
        type="radio"
        name="searchType"
        />
      <menuitem 
          id="quickFiltersSearchReplyWithTemplate"
          class="menuitem-iconic"
        label="__MSG_quickfilters.option.searchProperty.replyWithTemplate__"
        oncommand="quickFilters.List.toggleSearchType('replyWithTemplate',true);"
        type="radio"
        name="searchType"
        />
    </menupopup>
  </popupset>
  

  <toolbox id="quickfilters-toolbox" insertbefore="status-bar" tooltip="quickFiltersToolTip">
  <toolbar 
    id="quickfilters-toolbar" 
    toolbarname="quickFilters Tools"
    customizable="false" 
    mode="icons" 
    
    >
    <toolbarbutton id="quickFiltersBtnCut"
      class="toolbarbutton-1" 
      label="__MSG_quickfilters.menu.cut__"
      tooltiptext_qI="__MSG_quickfilters.menu.cut__"
      oncommand="quickFilters.List.cutFilters();"
      tooltip="quickFiltersToolTip"
      />
    <toolbarbutton id="quickFiltersBtnCopy"
      class="toolbarbutton-1" 
      label="__MSG_quickfilters.menu.copy__"
      tooltiptext_qI="__MSG_quickfilters.menu.copy__"
      oncommand="quickFilters.List.copyFilters();"
      tooltip="quickFiltersToolTip"
      />
    <toolbarbutton id="quickFiltersBtnPaste"
      class="toolbarbutton-1" 
      label="__MSG_quickfilters.menu.paste__"
      tooltiptext_qI="__MSG_quickfilters.menu.paste__"
      oncommand="quickFilters.List.pasteFilters(false);"
      tooltip="quickFiltersToolTip"
      />
    <toolbarseparator />
    <toolbarbutton id="quickFiltersBtnMerge"
      class="toolbarbutton-1" 
      label="__MSG_quickfilters.button.merge__"
      tooltiptext_qI="__MSG_quickfilters.button.merge.tooltiptext__"
      oncommand="quickFilters.List.merge(event, true);"
      tooltip="quickFiltersToolTip"
      />
    <toolbarbutton id="quickFiltersBtnClone"
      class="toolbarbutton-1" 
      label="__MSG_quickfilters.button.clone__"
      tooltiptext_qI="__MSG_quickfilters.button.clone.tooltiptext__"
      oncommand="quickFilters.List.clone(event);"
      tooltip="quickFiltersToolTip"
      />
    <toolbarbutton id="quickFiltersBtnSort"
      class="toolbarbutton-1" 
      label="__MSG_quickfilters.button.sort__"
      tooltiptext_qI="__MSG_quickfilters.button.sort.tooltiptext__"
      oncommand="quickFilters.List.sort(event);"
      tooltip="quickFiltersToolTip"
      />
    <toolbarseparator />
    <!-- Test new remove duplicate search conditions -->
    <toolbarbutton id="quickFiltersBtnDupe"
            class="toolbarbutton-1"
            label="__MSG_quickfilters.button.findDuplicates.label__"
            tooltiptext_qI="__MSG_quickfilters.button.findDuplicates.tooltip__"
            oncommand="quickFilters.List.findDuplicates(this);"
            tooltip="quickFiltersToolTip"
            />
    <toolbarbutton id="quickFiltersBtnCancelDuplicates"
            class="toolbarbutton-1"
            label="__MSG_quickfilters.button.cancelDuplicates.label__"
            tooltiptext_qI="__MSG_quickfilters.button.cancelDuplicates.tooltip__"
            oncommand="quickFilters.List.cancelDuplicates(this);"
            collapsed="true"
            tooltip="quickFiltersToolTip"
      />
      <menulist id="quickFiltersDuplicateList"
         collapsed="true"
         oncommand="quickFilters.List.selectDuplicate(this);">				
        <menupopup> 
      <!-- fill with JS -->
        </menupopup>
      </menulist>
    <toolbarbutton id="quickFiltersBtnCancelFound"
            class="toolbarbutton-1"
            label="__MSG_quickfilters.button.cancelFindInFolder.label__"
            tooltiptext_qI="__MSG_quickfilters.button.cancelFindInFolder.tooltip__"
            oncommand="quickFilters.List.cancelFoundFilters(this);"
            collapsed="true"
            tooltip="quickFiltersToolTip"
      />
      <menulist id="quickFiltersFoundResults"
         collapsed="true"
         oncommand="quickFilters.List.selectFoundFilter(this);">				
        <menupopup>
      <!-- fill with JS -->
        </menupopup>
      </menulist>

    <toolbarbutton id="quickFiltersTroubleshoot"
      class="toolbarbutton-1" 
      label="__MSG_quickfilters.button.bug__"
      tooltiptext_qI="__MSG_quickfilters.button.bug.tooltiptext1__ __MSG_quickfilters.button.bug.tooltiptext2__"
      oncommand="quickFilters.List.troubleshoot();"
      oncontextmenu="quickFilters.List.configureTroubleshooter(this);"
      context="dummy"
      tooltip="quickFiltersToolTip"
      />
      
    <toolbarbutton id="quickFiltersBtnStart"
            class="toolbarbutton-1"
            label="__MSG_quickfilters.button.assistant__"
            tooltiptext_qI="__MSG_quickfilters.button.assistant.tooltiptext__"
            oncommand="quickFilters.List.toggleAssistant(this);"
            tooltip="quickFiltersToolTip"
            />
    <toolbarseparator />
    <toolbarbutton id="btnSaveFilters"
                   class="toolbarbutton-1"
                   tooltiptext_qI="__MSG_quickfilters.button.saveFilters.tooltip__"
                   onclick="quickFilters.List.store(event);"/>
                   <toolbarbutton id="btnLoadFilters"
                   class="toolbarbutton-1"
                   tooltiptext_qI="__MSG_quickfilters.button.loadFilters.tooltip__"
                   tooltip="quickFiltersToolTip"
                   onclick="quickFilters.List.load();"/>
      
      <toolbarspring />
    <toolbarbutton id="quickFiltersBtnSettings"
      class="toolbarbutton-1" 
      label="__MSG_quickfilters.button.settings__"
      tooltiptext_qI="__MSG_quickfilters.button.settings__"
      tooltip="quickFiltersToolTip"
      oncommand="quickFilters.showOptions();"
      />
    <toolbarbutton id="quickFiltersBtnHelp"
      class="toolbarbutton-1" 
      label="__MSG_quickfilters.button.support__"
      tooltiptext_qI="__MSG_quickfilters.button.support__"
      tooltip="quickFiltersToolTip"
      oncommand="quickFilters.Util.showHomePage('index.html#messageFilterList');"
      />
    </toolbar>
  </toolbox>
  
  <hbox id="filterHeader">
    <button id="quickFilters-SearchOptions"
      label=""
      tooltiptext_qI="__MSG_quickfilters.button.searchProperties__"
      tooltip="quickFiltersToolTip"
      context="quickFiltersSearchContext"
      onclick="quickFilters.List.showPopup(this,'quickFiltersSearchContext', event);"
      collapsed="false"
      insertbefore="searchBox"
    />
  </hbox>
  
  <button
    id="quickFilters-mergeButton"
    insertafter="deleteButton"
    label="__MSG_quickfilters.button.merge__"
    accesskey="__MSG_quickfilters.button.merge.accesskey__"
    tooltiptext_qI="__MSG_quickfilters.button.merge.tooltiptext__"
    tooltip="quickFiltersToolTip"
    oncommand="quickFilters.List.merge(event);"
  />

  <tooltip id="quickFiltersToolTip" />
  
</window>
  
  `);
    
  const util=window.quickFilters.Util,
        list = window.quickFilters.List;
  util.logDebug('Adding FilterList...');

  window.quickFilters.Util.notifyTools.enable();
  await window.quickFilters.Util.init();
  
  list.onLoadFilterList();
  window.addEventListener("quickFilters.BackgroundUpdate.setAssistantButton", setAssistantButton);
  window.addEventListener("quickFilters.BackgroundUpdate.setupListToolbar", configureToolbar);
  
  // [issue 237] custom tooltip
  let myTooltip = window.document.querySelector("#quickFiltersToolTip");
  myTooltip.addEventListener("popupshowing", (event) => {
    let target = event.target?.triggerNode;
    if (target) {
      myTooltip.setAttribute("label", target.getAttribute("tooltiptext_qI") || "");
    }
  });


}

function onUnload(isAddOnShutDown) {
  window.removeEventListener("quickFilters.BackgroundUpdate.setAssistantButton", setAssistantButton);
  window.removeEventListener("quickFilters.BackgroundUpdate.setupListToolbar", configureToolbar);
}
