var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-tablistener.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-preferences.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-themes.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-filterWorker.js", window, "UTF-8");
//Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-register.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-util.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-interface.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-rsa.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-register.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-quickMove.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-bookmarks.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-change-order.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-model.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/qf-advancedTab.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-folderTree.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-folder-category.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/qf-styles.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-listener.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {
    console.log (Services.appinfo.version);
    let layout = WL.injectCSS("chrome://quickfolders/content/quickfolders-layout.css");
    layout.setAttribute("title", "QuickFolderStyles");
    
    let tb = WL.injectCSS("chrome://quickfolders/content/quickfolders-thunderbird.css");
    // tb.setAttribute("title", "QuickFolderStyles");
    
    WL.injectCSS("chrome://quickfolders/content/skin/quickfolders-widgets.css");
    WL.injectCSS("chrome://quickfolders/content/qf-foldertree.css");
    WL.injectCSS("chrome://quickfolders/content/quickfolders-filters.css");
    WL.injectCSS("chrome://quickfolders/content/quickfolders-68.css");
    WL.injectCSS("chrome://quickfolders/content/quickfolders-mods.css");

    WL.injectElements(`
        <!-- Thunderbird & SeaMonkey -->
        <toolbarpalette id="MailToolbarPalette">
          <toolbarbutton id="QuickFolders-toolbar-button" 
                class="toolbarbutton-1 chromeclass-toolbar-additional"
                label="&qf.toolbar.quickfolders.toolbar;" 
                tooltiptext="&qf.toolbar.quickfolders.toolbar;"
                oncommand="QuickFolders.Interface.toggleToolbar(this);"
                checked="true"
                />
          <toolbarbutton id="QuickFolders-createfolder" 
                class="toolbarbutton-1 chromeclass-toolbar-additional"
                label="&quickfolders.toolbar.newsubfolder;" 
                tooltiptext="&quickfolders.toolbar.newsubfolder;" 
                oncommand="QuickFolders.Interface.onCreateInstantFolder();"
              />
            <toolbarbutton id="QuickFolders-skipfolder"
                class="toolbarbutton-1 chromeclass-toolbar-additional"
                label="&quickfolders.toolbar.skip;" 
                tooltiptext="&qf.tooltip.skipUnreadFolder;" 
                oncommand="QuickFolders.Interface.onSkipFolder(null);"
              />
        </toolbarpalette>


        <toolbox id="mail-toolbox">
            <toolbar
                id="QuickFolders-Toolbar"
                toolbarname="QuickFolders Toolbar"
                class="toolbar-primary"
                ondragover="(QuickFolders.toolbarDragObserver).dragOver(event);"
                ondrop="(QuickFolders.toolbarDragObserver).drop(event);"
                ondragenter="QuickFolders.toolbarDragObserver.debug_log(event);"
                dragdroparea="QuickFolders-FoldersBox"
                customizable="false"
                context="QuickFolders-ToolbarPopup"
                flex="10" >
                <hbox id="QuickFolders-left" align="center">
                    <vbox id="QuickFolders-LabelBox" flex="0">
                        <toolbarbutton id="QuickFolders-title-label" 
                                       oncommand="QuickFolders.Interface.clickTitleLabel(this);"
                                                     label="&qf.label.quickfolders;" />
                    </vbox>
                    
              <!-- move QuickFolders-Tools-Pane to separate overlay -->
                </hbox>
                
                <popupset id="QuickFolders-Palette" xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul">
                    <menupopup id="QuickFolders-PalettePopup" 
                               class="QuickFolders-folder-popup" 
                                         xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
                                         onclick="QuickFolders.Interface.clickHandler(event,this);">
                        <!-- created in Interface code -->
                    </menupopup>
                    <menupopup id="QuickFolders-FindPopup" 
                               class="menu-iconic widerMenu" 
                               position="after_start"
                               oncommand="QuickFolders.Interface.selectFound(this, event);"
                               onkeypress="QuickFolders.Interface.foundInput(this, event);"
                               onblur="QuickFolders.Interface.findPopupBlur(this, event);"
                               ignorekeys="false">
                    </menupopup>
                </popupset>

                <popupset id="QuickFolders-QuickMovePopupSet">
                    <menupopup id="QuickFolders-quickMoveMenu">
                        <menuitem id="QuickFolders-quickMove-suspend"
                                  label="&quickfolders.quickMove.menu.suspend;"
                                  oncommand="QuickFolders.quickMove.toggleSuspendMove(this);" 
                                  type="checkbox"
                                  />
                        <menuitem id="QuickFolders-quickMove-cancel"
                                  label="&quickfolders.quickMove.menu.cancel;"
                                  oncommand="QuickFolders.quickMove.cancel();" 
                                  collapsed="true"
                                  />
                        <menuitem id="QuickFolders-quickMove-showSearch"
                                  label="&quickfolders.quickMove.menu.showSearch;"
                                  oncommand="QuickFolders.quickMove.showSearch();" 
                                  />
                        <menuitem id="QuickFolders-quickMove-hideSearch"
                                  label="&quickfolders.quickMove.menu.hideSearch;"
                                  oncommand="QuickFolders.quickMove.hideSearch();" 
                                  collapsed="true"
                                  />
                    </menupopup>
                </popupset>	
                
                <popupset id="QuickFolders-ReadingListPopupSet">
                    <menupopup id="QuickFolders-readingListMenu" class="widerMenu">
                        <menuitem id="QuickFolders-readingList-reset"
                                  label="&quickfolders.readingList.clear;"
                                            class="cmd"
                                            collapsed="true"
                                  oncommand="QuickFolders.bookmarks.resetList(true);" 
                                  />
                        <menuitem id="QuickFolders-readingList-add"
                                  label="&quickfolders.readingList.addCurrent;"
                                            class="cmd"
                                  oncommand="QuickFolders.bookmarks.addCurrent();" 
                                  />
                    </menupopup>
                </popupset>	
                
                <popupset id="QuickFolders-MainPopupSet">
                    <menupopup id="QuickFolders-ToolbarPopup" class="QuickFolders-folder-popup">
                      <!-- debug submenu -->
                      <menu class="menu-iconic dbgMenu"  
                                    collapsed="true"
                                    id="QuickFolders-debug" 
                              label="Debug">
                            <menupopup class="dbgMenu">
                            
                                <menuitem id="QuickFolders-ToolbarPopup-dbg1"
                                                    label="Test Tree only Icons"
                                                    oncommand="QuickFolders.Interface.testTreeIcons();" 
                                                    class="menuitem-iconic"
                                                    />
                                                    
                                <menuitem id="QuickFolders-ToolbarPopup-dbg2"
                                                    label="Load FolderTree Dictionary"
                                                    oncommand="QuickFolders.FolderTree.loadDictionary();" 
                                                    class="menuitem-iconic"
                                                    />														
                              <menuitem id="QuickFolders-ToolbarPopup-dbg3"
                                          label="Platform info - aboutHost()"
                                                    oncommand="QuickFolders.Util.aboutHost();"
                                                    class="menuitem-iconic"
                                                    />
                              <menuitem id="QuickFolders-ToolbarPopup-dbg4"
                                          label="Load Platform CSS"
                                                    oncommand="QuickFolders.Util.loadPlatformStylesheet();"
                                                    class="menuitem-iconic"
                                                    />


                            </menupopup>
                        </menu>
                        <menuitem id="QuickFolders-ToolbarPopup-find"
                                  label="&qf.menuitem.quickfolders.find;"
                                  accesskey="&qf.menuitem.quickfolders.findAccess;"
                                  oncommand="QuickFolders.Interface.findFolder(true,'quickJump');" 
                                  class="cmd menuitem-iconic"
                                  tagName="qfFindFolder"
                                            collapsed="true"
                                  />
                        <menuitem id="QuickFolders-ToolbarPopup-options"
                                  label="&qf.menuitem.quickfolders.options;"
                                  accesskey="&qf.menuitem.quickfolders.optionsAccess;"
                                  oncommand="QuickFolders.Interface.viewOptions(-1);" 
                                  class="cmd menuitem-iconic"
                                  tagName="qfOptions"
                                  />
                        <menuitem id="QuickFolders-ToolbarPopup-filterMode"
                                  label="&qf.menuitem.quickfolders.filters;"
                                  accesskey="&qf.menuitem.quickfolders.filtersAccess;"
                                  oncommand="QuickFolders.Interface.toggle_FilterMode(!QuickFolders.FilterWorker.FilterMode);"
                                  class="cmd menuitem-iconic"
                                  tagName="qfFilter"
                                  />
                        <menuitem id="QuickFolders-ToolbarPopup-paintBucket"
                                  label="&qf.menuitem.quickfolders.togglePaintMode;"
                                  accesskey="&qf.menuitem.quickfolders.togglePaintModeAccess;"
                                  oncommand="QuickFolders.Interface.togglePaintMode('toggle');"
                                  class="cmd menuitem-iconic"
                                  tagName="qfPaintBucket"
                                  context="QuickFolders-Palette"
                                  />
                        <menuitem id="QuickFolders-ToolbarPopup-changeOrder"
                                  label="&qf.menuitem.quickfolders.changeOrder;"
                                  accesskey="&qf.menuitem.quickfolders.changeOrderAccess;"
                                  oncommand="QuickFolders.Interface.viewChangeOrder();"
                                  class="cmd menuitem-iconic"
                                  tagName="qfOrder"
                                  />
                        <menuitem id="QuickFolders-ToolbarPopup-support"
                                  label="&qf.menuitem.quickfolders.support;"
                                  accesskey="&qf.menuitem.quickfolders.supportAccess;"
                                  oncommand="QuickFolders.Interface.viewSupport();"
                                  class="cmd menuitem-iconic"
                                  tagName="qfSupport"
                                  />
                        <menuitem id="QuickFolders-ToolbarPopup-help"
                                  label="&qf.menuitem.quickfolders.help;"
                                  accesskey="&qf.menuitem.quickfolders.helpAccess;"
                                  oncommand="QuickFolders.Interface.viewHelp();" 
                                  class="cmd menuitem-iconic"
                                  tagName="qfHelp"
                                  />
                        <menuseparator />
                        <menuitem id="QuickFolders-ToolbarPopup-refresh"
                                  label="&qf.menuitem.quickfolders.repairTabs;"
                                  accesskey="&qf.menuitem.quickfolders.repairTabsAccess;"
                                  oncommand="QuickFolders.Interface.updateMainWindow();" 
                                  class="cmd menuitem-iconic"
                                  tagName="qfRebuild"
                                  />
                        <menuitem id="QuickFolders-ToolbarPopup-repair"
                                  label="&qf.menuitem.quickfolders.repairTreeIcons;"
                                  oncommand="QuickFolders.Interface.repairTreeIcons();" 
                                  class="cmd menuitem-iconic"
                                  tagName="qfRepairTreeIcons"
                                  />
                        <menuitem id="QuickFolders-ToolbarPopup-tidy"
                                  label="&qf.menuitem.quickfolders.deleteDeadTabs;"
                                  accesskey="&qf.menuitem.quickfolders.deleteDeadTabsAccess;"
                                  oncommand="QuickFolders.Interface.tidyDeadFolders();" 
                                  class="cmd menuitem-iconic"
                                  tagName="qfTidyTabs"
                                  />
                        <menuseparator />
                        <menuitem id="QuickFolders-ToolbarPopup-displayPreviewToolbar"
                                  label="&qf.menuitem.quickfolders.displayPreviewToolbar;"
                                  accesskey="&qf.menuitem.quickfolders.displayPreviewToolbarAccessKey;"
                                  oncommand="QuickFolders.Interface.displayNavigationToolbar(true,'?');"
                                  class="cmd menuitem-iconic"
                                  tagName="qfPreviewToolbar" 
                                  />
                        <menuitem id="QuickFolders-ToolbarPopup-register"
                                  label="&qf.menuitem.quickfolders.register;"
                                  oncommand="QuickFolders.Licenser.showDialog('mainPopup');"
                                  class="cmd menuitem-iconic free"
                                  tagName="qfRegister"
                                  />
                    </menupopup>
                </popupset>


                <!-- 		-->		
                <vbox id="QuickFolders-Folders-Pane"  flex="1">
                    <spacer flex="4" id="QuickFolders-FoldersBox-PushDown"/>
                    
                    <box id="QuickFolders-FoldersBox" flex="1" class="folderBarContainer">
                </box>
                <!-- 		-->		
                </vbox>
        
            </toolbar>
        </toolbox>
        
        
      <popup id="folderPaneContext">
        <menuitem id="context-quickFoldersIcon"
                  label="&qf.foldercontextmenu.quickfolders.customizeIcon;"
                  tag="qfIconAdd"
                  class="menuitem-iconic"
                  insertafter="folderPaneContext-properties"
                  oncommand="QuickFolders.Interface.onSelectIcon(this,event);"/>
        <menuitem id="context-quickFoldersRemoveIcon"
                  label="&qf.foldercontextmenu.quickfolders.removeIcon;"
                  tag="qfIconRemove"
                  class="menuitem-iconic"
                  insertafter="context-quickFoldersIcon"
                  oncommand="QuickFolders.Interface.onRemoveIcon(this,event);"/>
      </popup>	
`, ["chrome://quickfolders/locale/overlay.dtd"]);


//------------------------------------ overlay current folder
WL.injectElements(`
<hbox id="messagepaneboxwrapper">
<vbox id="messagepanebox">

    <menupopup id="QuickFolders-currentContextMenuMessagesBox">
        <menuitem  label = "Thunderbird12/overlayCurrentfolder.xul (messagesBox)"/>
    </menupopup>
    <menupopup id="QuickFolders-currentContextMenu">
        <menuitem  label = "Thunderbird12/overlayCurrentfolder.xul (singlemessage)"/>
    </menupopup>
    
        <hbox id="QuickFolders-PreviewToolbarPanel" 
                position="1"
                insertbefore="singlemessage"
                    style="display:none;">
            <spacer flex="5" id="QF-CurrentLeftSpacer"/>
            <toolbar id="QuickFolders-CurrentFolderTools" iconsize="small">
                <toolbarbutton id="QuickFolders-CurrentMail"
                                             class="icon draggable"
                                             tooltiptext="&qf.tooltip.emailIcon;" />
                <toolbarbutton id="QuickFolders-Recent-CurrentFolderTool" tag="#Recent" class="recent icon"
                                             context="QuickFolders-folder-popup-Recent-CurrentFolderTool"
                                             position="after_start"
                                             oncontextmenu="QuickFolders.Interface.onClickRecentCurrentFolderTools(event.target, event, true); return false;"
                                             onclick= "QuickFolders.Interface.onClickRecentCurrentFolderTools(event.target, event, true); return false;"
                                             ondragenter="QuickFolders.buttonDragObserver.dragEnter(event);"
                                             ondragover="QuickFolders.buttonDragObserver.dragOver(event);"
                                             tooltiptext="&qf.tooltip.RecentFolders;"/>
                <toolbarseparator special="qfMsgFolderNavigation" />
                <toolbarbutton id="quickFoldersPreviousUnread"
                                             class="icon"
                                             special="qfMsgFolderNavigation" 
                                             tooltiptext="&qf.tooltip.goPreviousFolder;"
                                             onclick="QuickFolders.Interface.onGoPreviousMsg(this);" />
                <toolbarbutton id="quickFoldersNavToggle" 
                                             special="qfMsgFolderNavigation" 
                                             tooltiptext="&qf.tooltip.quickFoldersNavToggle;"
                                             onclick="QuickFolders.Interface.onToggleNavigation(this);" />
                <toolbarbutton id="quickFoldersNextUnread"
                                             class="icon"
                                             special="qfMsgFolderNavigation" 
                                             tooltiptext="&qf.tooltip.goNextFolder;"
                                             onclick="QuickFolders.Interface.onGoNextMsg(this);" />
                <toolbarbutton id="QuickFolders-CurrentThread"
                                             class="icon"
                                             special="qfMsgFolderNavigation" 
                                             oncommand="QuickFolders.Interface.onClickThreadTools(event.target, event); return false;"
                                             tooltiptext="&qf.tooltip.conversationRead;" />`
                                             +
                
                  //          <!-- skip folder -->   (//comment is treated as node)
                  `
                           <toolbarbutton id="quickFoldersSkipFolder"
                                             class="icon"
                                             special="qfMsgFolderNavigation" 
                                             oncommand="QuickFolders.Interface.onSkipFolder(this);"
                                             tooltiptext="&qf.tooltip.skipUnreadFolder;" />
                <toolbarseparator id="QuickFolders-Navigate-Separator" />
                <toolbarbutton id="QuickFolders-NavigateUp"
                                             class="icon"
                                             onclick="QuickFolders.Interface.goUpFolder();"
                                             tooltiptext="&qf.tooltip.folderUp;"/>
                <toolbarbutton id="QuickFolders-NavigateLeft"
                                             class="icon"
                                             onclick="QuickFolders.Interface.goPreviousSiblingFolder();"/>
                <hbox class="folderBarContainer" xulPlatform="xul12">
                    <toolbarbutton id="QuickFoldersCurrentFolder"
                                                 label="Current Folder"
                                                 class="selected-folder"
                                                 ondragenter="QuickFolders.buttonDragObserver..dragEnter(event);"
                                                 ondragover="QuickFolders.buttonDragObserver..dragOver(event);"/>
                </hbox>
                <toolbarbutton id="QuickFolders-NavigateRight"
                                             class="icon"
                                             onclick="QuickFolders.Interface.goNextSiblingFolder();"/>
                <toolbarseparator id="QuickFolders-Navigate-Separator2" />
                <toolbarbutton id="QuickFolders-currentFolderMailFolderCommands"
                                             class="icon"
                                             tooltiptext="&qf.tooltip.mailFolderCommands;"
                                             onclick="QuickFolders.Interface.showCurrentFolderMailContextMenu(event.target);"
                                             oncontextmenu="QuickFolders.Interface.showCurrentFolderMailContextMenu(event.target);" 
                                             collapsed="true"/>
                <toolbarbutton id="QuickFolders-RepairFolderBtn"
                                             class="icon"
                                             tooltiptext="Repair Folder..."
                                             oncommand="QuickFolders.Interface.onRepairFolder(null);"
                                             tag="qfIconRepairFolders"
                                             collapsed="true"/>
                                             
                <hbox id="QuickFolders-currentFolderIconCommands" >
                    <toolbarbutton id="QuickFolders-SelectIcon"
                                     class="icon"
                                     tooltiptext="&qf.foldercontextmenu.quickfolders.customizeIcon;"
                                     oncommand="QuickFolders.Interface.onSelectIcon(this,event);"
                                     tag="qfIconAdd"/>
                    <toolbarbutton id="QuickFolders-RemoveIcon"
                                     class="icon"
                                     tooltiptext="&qf.foldercontextmenu.quickfolders.removeIcon;"
                                     collapsed = "true"
                                     oncommand="QuickFolders.Interface.onRemoveIcon(this,event);"
                                     tag="qfIconRemove"/>
                </hbox>
                <toolbarbutton id="QuickFolders-currentFolderFilterActive"
                                             class="icon"
                                             tooltiptext="&qf.tooltip.filterStart;"
                                             oncommand="QuickFolders.Interface.toggle_FilterMode(!QuickFolders.FilterWorker.FilterMode);" />
                <toolbarbutton id="QuickFolders-Options"
                                             class="icon"
                                             tooltiptext="&qf.menuitem.quickfolders.options;"
                                             oncommand="QuickFolders.Interface.viewOptions(-1);"
                                             tagName="qfOptions"
                                             context="QuickFolders-currentContextMenu"
                                             oncontextmenu="QuickFolders.Interface.showPopup(this,this.getAttribute('context'));"/>
                <toolbarbutton id="QuickFolders-Close"
                                             class="icon"
                                             tooltiptext="&qf.tooltip.closeToolbar;"
                                             oncommand="QuickFolders.Interface.displayNavigationToolbar(false,'?');" />
            </toolbar>
            <spacer flex="5" id="QF-CurrentRightSpacer" />
        </hbox>


<!-- if conversation view (extension) is active ?? then the browser element multimessage will be visible
     in this case we need to move the toolbar panel into the messagepanebox before multimessage
    <hbox id="QuickFolders-PreviewToolbarPanel-ConversationView" insertbefore="multimessage">
    
    </hbox>
-->

</vbox>
</hbox>
`, ["chrome://quickfolders/locale/overlay.dtd"]);



//-----------------------------
//qf-tools.xul
//^ ^ wrong: we should load qf-tools69.xul


WL.injectElements(`
    
<hbox id="QuickFolders-left">
<vbox id="QuickFolders-Tools-Pane" 
insertafter="QuickFolders-LabelBox">
    <hbox id="QuickFolders-Category-Box"
              ondragenter="QuickFolders.buttonDragObserver.dragEnter(event)">
        <menulist id="QuickFolders-Category-Selection" 
                            oncommand="QuickFolders.Interface.selectCategory(this.value,false,this,event);" 
                            sizetopopup="none" 
                            collapsed="true">
            <menupopup>
                <!-- filled dynamically from JS -->
            </menupopup>
        </menulist>
        <hbox id="QuickFolders-oneButtonPanel">
            <toolbarbutton id="QuickFolders-mainPopup"
                             class="popupButton"
                             tooltiptext="&qf.tooltip.mainOptions;"
                             context="QuickFolders-ToolbarPopup"
                             onclick="QuickFolders.Interface.showPopup(this,'QuickFolders-ToolbarPopup',event);"/>
            <toolbarbutton id="QuickFolders-filterActive"
                             tooltiptext="&qf.tooltip.filters;"
                             oncommand="QuickFolders.Interface.toggle_FilterMode(false);"
                             collapsed="true"/>
            <toolbarbutton id="QuickFolders-paintBucketActive"
                             label="ABC"
                             tooltiptext="&qf.tooltip.paintCanActive;"
                             context="QuickFolders-PalettePopup" 
                             oncommand="QuickFolders.Interface.showPalette(this);"
                             collapsed="true"/>
            <toolbarbutton id="QuickFolders-readingList"
                             class="popupButton"
                             tooltiptext="&quickfolders.readingList.tooltip;"
                             label=""
                             onclick="QuickFolders.Interface.readingListClick(event,this);"
                             ondrop="QuickFolders.buttonDragObserver.drop(event);"
                             ondragenter="QuickFolders.buttonDragObserver.dragEnter(event);"
                             ondragover="QuickFolders.buttonDragObserver.dragOver(event);"
                             context="QuickFolders-readingListMenu"
                             collapsed="true"/>
            <toolbarbutton id="QuickFolders-quickMove"
                             class="popupButton"
                             tooltiptext="&qf.tooltip.quickMove;"
                             label=""
                             onclick="QuickFolders.Interface.quickMoveButtonClick(event,this);"
                             ondrop="QuickFolders.buttonDragObserver.drop(event);"
                             ondragenter="QuickFolders.buttonDragObserver.dragEnter(event);"
                             ondragover="QuickFolders.buttonDragObserver.dragOver(event);"
                             context="QuickFolders-quickMoveMenu"
                             />
            <!-- removed searchbutton=true so pressing [Enter] is not necessary-->
            <search-textbox id="QuickFolders-FindFolder" 
                     oncommand="QuickFolders.Interface.findFolderName(this);"
                     onkeypress="QuickFolders.Interface.findFolderKeyPress(event);"
                     class="searchBox"
                     type="search"
                     collapsed="true"
                     placeholder="&quickfolders.findFolder.placeHolder;"/>
         </hbox>
    </hbox>
</vbox>
</hbox>

`, ["chrome://quickfolders/locale/overlay.dtd"]);


//qf-tools
//------------------------------------
    
    window.QuickFolders.Util.logDebug('Adding Folder Listener...');
    window.QuickFolders_mailSession.AddFolderListener(window.QuickFolders.FolderListener, Components.interfaces.nsIFolderListener.all);
//   obsolete   window.QuickFolders.addLoadEventListener();
    window.QuickFolders.initDelayed(window, WL);
}

function onUnload(isAddOnShutDown) {
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


  }
}
