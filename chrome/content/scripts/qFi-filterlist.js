var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

Services.scriptloader.loadSubScript("chrome://quickfilters/content/quickFilters.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-utils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-worker.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-list.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-preferences.js", window, "UTF-8");
//!-- execute quickFilters.List.onLoadFilterList() when loading window -->
Services.scriptloader.loadSubScript("chrome://quickfilters/content/overlayFilterList.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfilters/content/shimEcma/qFilters-shim-ecma.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {
 //   let layout = WL.injectCSS("chrome://quickfilters/content/filterList.css");
 //TODO do we need "chrome://global/skin/"??
    let layout1 = WL.injectCSS("chrome://quickfilters/content/filterList.css");
    let layout2 = WL.injectCSS("chrome://quickfilters/content/filterWidgets.css");
 
    WL.injectElements(`
    
	<window id="filterListDialog">
  
		<popupset id="QuickFilterTreeContextSet">
			<menupopup id = "quickFiltersContext">
				<menuitem id = "quickFiltersCut" class="menuitem-iconic"
					label = "&quickfilters.menu.cut;"
					oncommand = "quickFilters.List.cutFilters();"
					/>
				<menuitem id = "quickFiltersCopy" class="menuitem-iconic"
					label = "&quickfilters.menu.copy;"
					oncommand = "quickFilters.List.copyFilters();"
					/>
				<menuitem id = "quickFiltersPaste" class="menuitem-iconic"
					label = "&quickfilters.menu.paste;"
					oncommand = "quickFilters.List.pasteFilters(false);"
					/>
				<menuitem id = "quickFiltersRemoveDuplicate" class="menuitem-iconic"
					label = "Remove duplicate condition: "
					collapsed = "true"
					oncommand = "quickFilters.List.removeSelectedCurrentDupe(this);"
					/>
			</menupopup>
			
			<panel id="quickFilterNotification" noautohide="true">	
				<notificationbox flex="1" id="quickFilterNotificationBox" >
					<!-- <notification type="warning" label="Test" id="quickFiltersNotificationContent"/> -->
				</notificationbox>
			</panel>
			
		</popupset>
		<popupset id="QuickFilterSearchContextSet">
			<menupopup id = "quickFiltersSearchContext">
				<menuitem 
				    id = "quickFiltersSearchName"
				    class="menuitem-iconic"
					label = "&quickfilters.option.searchProperty.name;"
					oncommand = "quickFilters.List.toggleSearchType('name');"
					type="radio"
					name="searchType"
					checked="true"
					/>
				<menuitem 
				    id = "quickFiltersSearchTargetFolder"
				    class="menuitem-iconic"
					label = "&quickfilters.option.searchProperty.targetFolder;"
					oncommand = "quickFilters.List.toggleSearchType('targetFolder');"
					type="radio"
					name="searchType"
					/>
				<menuitem 
				    id = "quickFiltersSearchCondition"
				    class="menuitem-iconic"
					label = "&quickfilters.option.searchProperty.searchCondition;"
					oncommand = "quickFilters.List.toggleSearchType('condition');"
					type="radio"
					name="searchType"
					/>
				<menuitem 
				    id = "quickFiltersSearchStringAction"
				    class="menuitem-iconic"
						label = "&quickfilters.option.searchProperty.setCustomStringAction;"
						oncommand = "quickFilters.List.toggleSearchType('stringAction');"
						type="radio"
						name="searchType"
					/>
				<menuitem 
				    id = "quickFiltersSearchTag"
				    class="menuitem-iconic"
					label = "&quickfilters.option.searchProperty.addTag;"
					oncommand = "quickFilters.List.toggleSearchType('tagLabel');"
					type="radio"
					name="searchType"
					/>
				<menuitem 
				    id = "quickFiltersSearchReplyWithTemplate"
				    class="menuitem-iconic"
					label = "&quickfilters.option.searchProperty.replyWithTemplate;"
					oncommand = "quickFilters.List.toggleSearchType('replyWithTemplate');"
					type="radio"
					name="searchType"
					/>
			</menupopup>
		</popupset>
		

	  <toolbox id="quickfilters-toolbox" insertbefore = "status-bar">
		<toolbar 
		  id="quickfilters-toolbar" 
		  toolbarname="quickFilters Tools"
		  customizable="false" 
		  mode="icons" 
		  >
			<toolbarbutton id="quickFiltersBtnCut"
			  class = "toolbarbutton-1" 
			  label = "&quickfilters.menu.cut;"
			  tooltiptext = "&quickfilters.menu.cut;"
			  oncommand = "quickFilters.List.cutFilters();"
			  />
			<toolbarbutton id="quickFiltersBtnCopy"
			  class = "toolbarbutton-1" 
			  label = "&quickfilters.menu.copy;"
			  tooltiptext = "&quickfilters.menu.copy;"
			  oncommand = "quickFilters.List.copyFilters();"
			  />
			<toolbarbutton id="quickFiltersBtnPaste"
			  class = "toolbarbutton-1" 
			  label = "&quickfilters.menu.paste;"
			  tooltiptext = "&quickfilters.menu.paste;"
			  oncommand = "quickFilters.List.pasteFilters(false);"
			  />
		  <toolbarseparator />
			<toolbarbutton id="quickFiltersBtnMerge"
			  class = "toolbarbutton-1" 
			  label = "&quickfilters.button.merge;"
			  tooltiptext = "&quickfilters.button.merge.tooltiptext;"
			  oncommand = "quickFilters.List.merge(event, true);"
			  />
			<toolbarbutton id="quickFiltersBtnClone"
			  class = "toolbarbutton-1" 
			  label = "&quickfilters.button.clone;"
			  tooltiptext = "&quickfilters.button.clone.tooltiptext;"
			  oncommand = "quickFilters.List.clone(event);"
			  />
			<toolbarbutton id="quickFiltersBtnSort"
			  class = "toolbarbutton-1" 
			  label = "&quickfilters.button.sort;"
			  tooltiptext = "&quickfilters.button.sort.tooltiptext;"
			  oncommand = "quickFilters.List.sort(event);"
			  />
			<toolbarseparator />
			<!-- Test new remove duplicate search conditions -->
			<toolbarbutton id="quickFiltersBtnDupe"
              class="toolbarbutton-1"
              label="&quickfilters.button.findDuplicates.label;"
              tooltiptext="&quickfilters.button.findDuplicates.tooltip;"
              oncommand="quickFilters.List.findDuplicates(this);"
			  />
			<toolbarbutton id="quickFiltersBtnCancelDuplicates"
              class="toolbarbutton-1"
              label="&quickfilters.button.cancelDuplicates.label;"
			  tooltiptext="&quickfilters.button.cancelDuplicates.tooltip;"
              oncommand="quickFilters.List.cancelDuplicates(this);"
			  collapsed = "true"
			  />
		    <menulist id = "quickFiltersDuplicateList"
					 collapsed = "true"
					 oncommand="quickFilters.List.selectDuplicate(this);">				
			    <menupopup> 
				<!-- fill with JS -->
			    </menupopup>
				</menulist>
			<toolbarbutton id="quickFiltersBtnCancelFound"
              class="toolbarbutton-1"
              label="&quickfilters.button.cancelFindInFolder.label;"
			  tooltiptext="&quickfilters.button.cancelFindInFolder.tooltip;"
              oncommand="quickFilters.List.cancelFoundFilters(this);"
			  collapsed = "true"
			  />
		    <menulist id = "quickFiltersFoundResults"
					 collapsed = "true"
					 oncommand="quickFilters.List.selectFoundFilter(this);">				
			    <menupopup>
				<!-- fill with JS -->
			    </menupopup>
				</menulist>

			<toolbarbutton id="quickFiltersTroubleshoot"
			  class = "toolbarbutton-1" 
			  label = "&quickfilters.button.bug;"
			  tooltiptext = "&quickfilters.button.bug.tooltiptext1; &quickfilters.button.bug.tooltiptext2;"
			  oncommand = "quickFilters.List.troubleshoot();"
        oncontextmenu = "quickFilters.List.configureTroubleshooter(this);"
        context = "dummy"
			  />
			  
			<toolbarbutton id="quickFiltersBtnStart"
              class="toolbarbutton-1"
              label="&quickfilters.button.assistant;"
              tooltiptext="&quickfilters.button.assistant.tooltiptext;"
              oncommand="quickFilters.List.toggleAssistant(this);"
			  />
			<toolbarseparator />
			<toolbarbutton id="btnSaveFilters"
										 class="toolbarbutton-1"
										 tooltiptext="&quickfilters.button.saveFilters.tooltip;"
										 onclick = "quickFilters.List.store();"/>
			<toolbarbutton id="btnLoadFilters"
										 class="toolbarbutton-1"
										 tooltiptext="&quickfilters.button.loadFilters.tooltip;"
										 onclick="quickFilters.List.load();"/>
			  
		    <toolbarspring />
			<toolbarbutton id="quickFiltersBtnSettings"
			  class = "toolbarbutton-1" 
			  label = "&quickfilters.button.settings;"
			  tooltiptext = "&quickfilters.button.settings;"
			  oncommand = "quickFilters.showOptions();"
			  />
			<toolbarbutton id="quickFiltersBtnHelp"
			  class = "toolbarbutton-1" 
			  label = "&quickfilters.button.support;"
			  tooltiptext = "&quickfilters.button.support;"
			  oncommand = "quickFilters.Util.showHomePage('index.html#messageFilterList');"
			  />
		  </toolbar>
	  </toolbox>
		
    <hbox id="filterHeader">
			<button id="quickFilters-SearchOptions"
				label=""
				tooltiptext="&quickfilters.button.searchProperties;"
				context="quickFiltersSearchContext"
				onclick="quickFilters.List.showPopup(this,'quickFiltersSearchContext', event);"
				collapsed="false"
				insertbefore="searchBox"
			/>
		</hbox>
		
		<button
			id="quickFilters-mergeButton"
			insertafter="deleteButton"
			label="&quickfilters.button.merge;"
			accesskey="&quickfilters.button.merge.accesskey;"
			tooltiptext="&quickfilters.button.merge.tooltiptext;"
			oncommand="quickFilters.List.merge(event);"
		/>

		<button
			id="quickFilters-reorderButtonTop"
			insertbefore="reorderUpButton"
			label="&qf.button.reorderButtonTop;"
			accesskey="&qf.button.reorderButtonTop.accessKey;"
			tooltiptext="&qf.button.reorderButtonTop.toolTip;"
			oncommand="quickFilters.List.onTop(event);"
		/>

		<button
			id="quickFilters-reorderButtonBottom"
			insertafter="reorderDownButton"
			label="&qf.button.reorderButtonBottom;"
			accesskey="&qf.button.reorderButtonBottom.accessKey;"
			tooltiptext="&qf.button.reorderButtonBottom.toolTip;"
			oncommand="quickFilters.List.onBottom(event);"
		/>
		
	</window>
    
    `, ["chrome://quickfilters/locale/filterList.dtd"]);
    
  const util = window.QuickFolders.Util,
        list = window.QuickFolders.FilterList;
  util.logDebug('Adding FilterList...');
  list.onLoadFilterList();
/*    
    window.QuickFolders.Util.logDebug('Adding FilterList...');
    // obsolete window.addEventListener("load", function(e) { QuickFolders.FilterList.onLoadFilterList(e);}, false); 
    window.QuickFolders.FilterList.onLoadFilterList();  //? event needed?
*/
}

function onUnload(isAddOnShutDown) {
}
