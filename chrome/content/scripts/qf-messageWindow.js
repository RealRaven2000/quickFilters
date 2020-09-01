var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-listener.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-preferences.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-themes.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-util.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-interface.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-model.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-change-order.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-folder-category.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/qf-styles.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/options.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {
    let layout = WL.injectCSS("chrome://quickfolders/content/quickfolders-palettes.css");
    layout.setAttribute("title", "QuickFolderPalettes");
    

    WL.injectElements(`
    <menupopup id="QuickFolders-currentContextMenuSingle">
    <menuitem  label="Thunderbird12-currentFolderSingleMessage" />
</menupopup>

<vbox id="messagepanebox">
    <hbox id="QuickFolders-PreviewToolbarPanel-Single" insertbefore="singlemessage" style="display:none;">
        <spacer flex="5" id="QF-CurrentLeftSpacer" style="min-width:5px;" />
        <toolbar id="QuickFolders-CurrentFolderTools" iconsize="small">
            <toolbarbutton id="QuickFolders-CurrentMail"
                             class="icon draggable"
                             tooltiptext="&qf.tooltip.emailIcon;" />
            <toolbarseparator special="qfMsgFolderNavigation"  />
            <toolbarbutton id="quickFoldersPreviousUnread"
                                   class="icon"
                             special="qfMsgFolderNavigation" 
                             tooltiptext="&qf.tooltip.goPreviousFolder;"
                             onclick="QuickFolders.Interface.onGoPreviousMsg(this, true);" />
            <toolbarbutton id="quickFoldersNavToggle" 
                             special="qfMsgFolderNavigation" 
                             tooltiptext="&qf.tooltip.quickFoldersNavToggle;"
                             onclick="QuickFolders.Interface.onToggleNavigation(this);" />
            <toolbarbutton id="quickFoldersNextUnread"
                                   class="icon"
                             special="qfMsgFolderNavigation" 
                             tooltiptext="&qf.tooltip.goNextFolder;"
                             onclick="QuickFolders.Interface.onGoNextMsg(this, true);" />
            <toolbarbutton id="QuickFolders-CurrentThread"
                             class="icon"
                             special="qfMsgFolderNavigation" 
                                         oncommand="QuickFolders.Interface.onClickThreadTools(event.target, event); return false;"
                             tooltiptext="&qf.tooltip.conversationRead;" />`
                             +

  //          <!-- skip folder -->
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
                             tooltiptext="&qf.tooltip.folderUp;"
                             collapsed="true"/>
            <toolbarbutton id="QuickFolders-NavigateLeft"
                             class="icon"
                             onclick="QuickFolders.Interface.goPreviousSiblingFolder();"
                             collapsed="true"/>
            <hbox class="folderBarContainer" xulPlatform="xul12">
                <toolbarbutton id="QuickFoldersCurrentFolder"
                               label="Current Folder"
                               class="selected-folder"
                               ondragenter="QuickFolders.buttonDragObserver.dragEnter(event);"
                               ondragover="QuickFolders.buttonDragObserver.dragOver(event);"/>
            </hbox>
            <toolbarbutton id="QuickFolders-NavigateRight"
                             class="icon"
                             onclick="QuickFolders.Interface.goNextSiblingFolder();"
                             collapsed="true"/>
            <toolbarseparator id="QuickFolders-Navigate-Separator2" />
            <toolbarbutton id="QuickFolders-currentFolderMailFolderCommands"
                             class="icon"
                             tooltiptext="&qf.tooltip.mailFolderCommands;"
                             onclick="QuickFolders.Interface.showCurrentFolderMailContextMenu(event.target);"
                             oncontextmenu="QuickFolders.Interface.showCurrentFolderMailContextMenu(event.target);" 
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
            <toolbarbutton id="QuickFolders-Options"
                             class="icon"
                             tooltiptext="&qf.menuitem.quickfolders.options;"
                             oncommand="QuickFolders.Interface.viewOptions(-1);"
                             tagName="qfOptions"
                             context="QuickFolders-currentContextMenuSingle"
                             oncontextmenu="QuickFolders.Interface.showPopup(this,this.getAttribute('context'));"/>
            <toolbarbutton id="QuickFolders-Close"
                             class="icon"
                             tooltiptext="&qf.tooltip.closeToolbar;"
                             oncommand="QuickFolders.Interface.displayNavigationToolbar(false,'messageWindow');" />
        </toolbar>
        <spacer flex="5" id="QF-CurrentRightSpacer" style="min-width:5px !important;" />
    </hbox>
</vbox>

`, ["chrome://quickfolders/locale/overlay.dtd"]);

   
    window.QuickFolders.Util.logDebug('Adding messageWindow...');
    window.QuickFolders_mailSession.AddFolderListener(window.QuickFolders.FolderListener, Components.interfaces.nsIFolderListener.all);
//   obsolete   window.QuickFolders.addLoadEventListener();
    window.QuickFolders.initDelayed(window);
}

function onUnload(isAddOnShutDown) {
}
