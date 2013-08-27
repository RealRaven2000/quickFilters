"use strict";

/* BEGIN LICENSE BLOCK

for detail, please refer to license.txt in the root folder of this extension

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 3
of the License, or (at your option) any later version.

If you use large portions of the code please attribute to the authors
(Axel Grude)

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You can download a copy of the GNU General Public License at
http://www.gnu.org/licenses/gpl-3.0.txt or get a free printed
copy by writing to:
  Free Software Foundation, Inc.,
  51 Franklin Street, Fifth Floor,
  Boston, MA 02110-1301, USA.
END LICENSE BLOCK */


/*===============
  Project History
  ===============

  Note: All Dates here are given in UK format - dd/MM/yyyy

  Personnel:
  AG - Lead Developer and owner of the Mozdev project

  04/05/2012 - 0.5
    # Created Prototype using major portions of code from QuickFolders

  <<-------------------------------->>
  0.8 : 06/05/2012  -  Released for preliminary review
    # Removed Postbox / SeaMonkey support temporarily for first release to make review easier
    # Added new option "Exist Filter Assistant after a filter has been created"
    # major layout work - link buttons and new title image

  0.9 : 15/05/2012
    # remove notification message when disabling filter
    # affect filtering in QuickFolders if quickFilters is toggled
    # replaced links to use the new quickfilters.mozdev.org pages
    # added locales: it, ru, vi, nl, ja
    # added button for showing filter list
    # redesigned logo and fixed version display

  1.0 : 18/05/2012
    # added first-run code
    # add buttons automatically on first install

  1.1 : 22/05/2012
   # Fixed errors that were introduced by last version (which broke To Top, To Bottom and the automatic Search features in the filter list dialog)
   # added more specific names to the filters
   # support for multiple cc evaluation in list template
   # clarification on notification

  1.2 : 23/05/2012
   # fixed some integration errors with QuickFolders and prepared for changes in the upcoming version (3.5.1)

  1.3 : 03/06/2012
   # first application for full review (112 users)
   # fixed broken version history link when right clicking the version number on the options dialog
   # added filter name rule settings: [x] parent folder's name, [x] 1st filter condition
   # added SeaMonkey support (postbox still outstanding as I am awaiting a reply from their development team)
   # converted options dialog into a tabbed one

  1.4 : 02/08/2012
   # show homepage on first installation
   # auto-install of toolbar button
   # added a toolbar button for running filters on message folder
   # fixed height issues on the assistant notification box
   # added french locale (thanks to jojoba from Babelzilla)
   # simplified chinese locale (W.I.P. - thanks to Loviny)
   # removed legacy CSS styles to separate style sheet
   # removed DOM node events for better performance
   # fixed support buttons: removed hrefs from text links on last options tab 

  1.5.1 : 19/11/2012
   # [Bug 25203] "Error when adding a filter if Message Filters window is already open"   
   # [Bug 25204] "Allow location-aware dragging from within virtual folder"
	               Added Enhancement: it is now possible to create a new filter 
								 when dragging an email from a saved search folder or from the unified 
								 Inbox / unified Sent folders. To get the same functionality in QuickFolders 
								 update QuickFolders to 3.8.2.

	1.6.1 : 12/02/2013
	 # [FR 24888] "Create Filters for messages that have already been moved" in context and message menu
	 # additional filter actions: Copy tags, priority and star (flag in SeaMonkey)
	 # improved version comparison algorithm to avoid to many version history / donation tabs when working on prereleases
	 # Added sv-SE locale by Lakrits
	 # Changed defaults for naming rules: now the parent folder is prepended rather than appending the keyword by default
	 # [FR 25321] Option to start Filter Assistant automatically
	 # Fixed size for large icon mode
	 # fixed a crash when dragging from search results

	1.7 : 17/03/2013
	 # Icon Improvements
	 # Styling QuickFolders filter wizard icons with that of quickFilters assistant
	 # [FR 25199] Add Rules to existing filters. 
	 # Existing filters with same action can now be merged together - NOTE: doesn't work in SeaMonkey yet (only copies first condition!)
	 # [Bug 25362] If assistant button is removed from toolbar, starting filter assistant throws "TypeError: doc.getElementById(...) is null"
	 

	1.8 : Waiting for review 19/05
	 # french locale completed [thanks to Jojaba - BabelZilla]
	 # [FR ???] Added Cut, Copy and Paste to transfer filters between accounts
	 # [Bug 25389] merging filters throws NS_ERROR_FAILURE - this can happen if there is an invalid action in a filter, please check debug log for more information
	 # [FR 15388] Added "run Filters" command to folder tree menu
	 # guards against not selecting enough filters before using the "Merge" command
	 # some debugging improvements during createFilter

  1.9 WIP
		# Added a toolbar which shows the quickFilters commands: Copy, Cut, Paste, Merge, Start Assistant, and settings
		# better integration with QuickFolders
		# Compatibility change for Tb 24 / Sm2.17 (nsIMsgAccountManager.accounts changed from nsIMutableArray to nsIArray)
		# Added donate button to settings dialog
	  # (TBD: rename toggleFilter to avoid false validation warnings ??)
		
		
	 */


var quickFilters = {
  Properties: {},
  _folderTree: null,
  strings: null,
  initialized: false,
  firstRunChecked: false,
  firstRunCount: 0,
  quickFilters_originalDrop: null,
  /*******
  as we cannot add quickFilters_originalDrop to folderTree
  Error: Cannot modify properties of a WrappedNative = NS_ERROR_XPC_CANT_MODIFY_PROP_ON_WN
  **/


  get folderTree() {
    if (!this._folderTree)
      this._folderTree = document.getElementById('folderTree');
    return this._folderTree;
  },

  get folderTreeView() {
    if (!this.folderTree )
      this.folderTree = document.getElementById('folderTree');

    return (typeof gFolderTreeView=='undefined') ? this.folderTree.view : gFolderTreeView;
  },

  // SeaMonkey observer
  folderObserver: {
     onDrop: function(row, orientation)
     {
        if (quickFilters.Worker.FilterMode) {
          try { quickFilters.onFolderTreeViewDrop(aRow, aOrientation); }
          catch(e) {
            quickFilters.Util.logException("quickFilters.onFolderTreeViewDrop FAILED\n", e);
          }
        }
     }
  },

  onLoad: function() {
    // initialization code - guard against all other windows except 3pane
    let el = document.getElementById('messengerWindow');
    if (!el || el.getAttribute('windowtype') !== "mail:3pane")
      return;

    let v = quickFilters.Util.Version; // start the version proxy, throw away v

    quickFilters.Util.logDebugOptional("events", "quickFilters.onload - starts");
    this.strings = document.getElementById("quickFilters-strings");
    this.mailSession = Components.classes["@mozilla.org/messenger/services/session;1"].getService(Components.interfaces.nsIMsgMailSession);

    let tree = quickFilters.folderTree;
    let treeView = quickFilters.folderTreeView;

    // let's wrap the drop function in our own (unless it already is [quickFiltersDropper would be defined])
    if (!quickFilters.folderTree.quickFiltersDropper) {
      switch (quickFilters.Util.Application) {
        case 'Postbox':  // to test!
          tree.quickFilters_originalDrop = treeView.drop;
          break;
        case 'SeaMonkey':
          tree.quickFilters_originalDrop = folderObserver.onDrop;
          break;
        case 'Thunderbird':
          tree.quickFilters_originalDrop = treeView.drop;
          break;
      }
      if (tree.quickFilters_originalDrop) {
        // new drop function, wraps original one
        /**************************************/
        let newDrop = function (aRow, aOrientation) {
          if (quickFilters.Worker.FilterMode) {
            try { quickFilters.onFolderTreeViewDrop(aRow, aOrientation); }
            catch(e) {
              quickFilters.Util.logException("quickFilters.onFolderTreeViewDrop FAILED\n", e);
            }
          }
          tree.quickFilters_originalDrop.apply(treeView, arguments);
        }
        /**************************************/

        switch (quickFilters.Util.Application) {
          case 'Postbox':  // to test!
            treeView.drop = newDrop;
            break;
          case 'SeaMonkey':
            folderObserver.onDrop = newDrop;
            break;
          case 'Thunderbird':
            treeView.drop = newDrop;
            break;
        }
      }
      treeView.quickFiltersDropper = true;
    }

    this.initialized = true;
		// problem with setTimeout in SeaMonkey - it opens the window and then never calls the function?
		if (quickFilters.Preferences.getBoolPrefQF("autoStart") 
				&& 
				!quickFilters.Worker.FilterMode) 
		{
			quickFilters.Util.logDebugOptional("events","setTimeout() - toggleFilterMode");
      setTimeout(function() { quickFilters.Worker.toggleFilterMode(true, true);  }, 100);
		}
		quickFilters.Util.logDebugOptional("events","setTimeout() - checkFirstRun");
    setTimeout(function() { quickFilters.checkFirstRun(); }, 1000);
		
		
    quickFilters.Util.logDebugOptional("events", "quickFilters.onload - ends");
  },

  onUnload: function() {
    // remove the event handlers!
  },

  showOptions: function() {
    window.openDialog('chrome://quickfilters/content/quickFilters-options.xul','quickfilters-options','chrome,titlebar,centerscreen,resizable,alwaysRaised,instantApply').focus();
  },

  checkFirstRun: function() {
    try {
      if (this.firstRunChecked)
        return;
      this.firstRunCount++;
      let util = quickFilters.Util;
      util.logDebug("=================quickFilters==============\n" + "   checkFirstRun() - attempt " + this.firstRunCount);
      let currentVersion = util.Version;
      // retry until version number doesn't lie anymore
      if (currentVersion.indexOf("hc")>=0) {
        window.setTimeout(function() { quickFilters.checkFirstRun(); }, 1000);
        return;
      }
      let installedVersion = quickFilters.Preferences.getCharPrefQF("installedVersion");
      let firstRun = quickFilters.Preferences.getBoolPrefQF("firstRun");
      util.logDebug("firstRun = " + firstRun + "  - currentVersion = " + currentVersion + "  - installed = " + installedVersion);
      let toolbarId = '';
      if (firstRun) {
        switch(quickFilters.Util.Application) {
          case 'Thunderbird':
            toolbarId = "mail-bar3";
            break;
          case 'SeaMonkey':
            toolbarId = "msgToolbar";
            break;
          case 'Postbox':
            toolbarId = "mail-bar7";
            break;
        }
        util.installButton(toolbarId, "quickfilters-toolbar-button");
        util.installButton(toolbarId, "quickfilters-toolbar-listbutton");
        quickFilters.Preferences.setBoolPrefQF("firstRun", false);
        util.showHomePage();
      }
      else {
        // is this an update?
        if (currentVersion.indexOf("hc") ==-1)
        {
					if (util.versionSmaller(
								util.getVersionSimple(installedVersion),  
								util.getVersionSimple(currentVersion)
								)
							)
					{ 				
						util.showVersionHistory(false);
						util.showDonatePage();
					}
        }

      }
      util.logDebug("store installedVersion: " + currentVersion);
      quickFilters.Preferences.setCharPrefQF("installedVersion", currentVersion);
      this.firstRunChecked = true;
    }
    catch(ex) {
      quickFilters.Util.logException("checkFirstRun failed", ex);
    }

  },

  onMenuItemCommand: function(e, cmd) {
//     var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
//                                   .getService(Components.interfaces.nsIPromptService);
//     promptService.alert(window, this.strings.getString("helloMessageTitle"),
//                                 this.strings.getString("helloMessage"));
		switch(cmd) {
			case 'toggle_Filters':
				quickFilters.Worker.toggleFilterMode(!quickFilters.Worker.FilterMode);
				break;
			case 'createFilterFromMsg':
				let selectedMessages = gFolderDisplay.selectedMessages; 
				// && selectedMessages[0].folder.server.canHaveFilters
				if (selectedMessages.length == 1 && selectedMessages[0].folder ) {
				  // the original command in the message menu calls the helper function MsgCreateFilter()
					quickFilters.Worker.createFilterAsync(null, quickFilters.Util.getCurrentFolder(), selectedMessages, false, false);
				}
				else {
				  let wrn = quickFilters.Util.getBundleString("quickfilters.createFromMail.selectWarning",
						"To create a filter, please select exactly one email!");
				  quickFilters.Util.popupAlert(wrn);
				}
				break;
		}
  },

  onToolbarButtonCommand: function(e) {
    // just reuse the function above.  you can change this, obviously!
    quickFilters.onMenuItemCommand(e, 'toggle_Filters');
  },

  onToolbarListCommand: function(e) {
    goDoCommand('cmd_displayMsgFilters');
  },

  onToolbarRunCommand: function(e) {
    goDoCommand('cmd_applyFilters');
  },

  LocalErrorLogger: function(msg) {
    let Cc = Components.classes;
    let Ci = Components.interfaces;
    let cserv = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
    cserv.logStringMessage("quickFilters:" + msg);
  },

  onFolderTreeViewDrop: function(aRow, aOrientation) {
    let Cc = Components.classes;
    let Ci = Components.interfaces;
    let treeView = quickFilters.folderTreeView;
    var dataTransfer;
    var dragSession;

    switch(quickFilters.Util.Application) {
      case 'Thunderbird':
        dataTransfer = treeView._currentTransfer;
        break;
      case 'SeaMonkey': // messengerdnd.js: dragService
        dragSession = dragService.getCurrentSession();
        if (!dragSession)
          return;
        dataTransfer = dragSession.dataTransfer;
        break;
      case 'Postbox':
        dragSession = dragService.getCurrentSession();
        if (!dragSession)
          return;
        dataTransfer = dragSession.dataTransfer;
        break;
    }

    // let array = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
    let types = dataTransfer.mozTypesAt(0);  // one flavor
    if (Array.indexOf(types, "text/x-moz-message") === -1 || (!quickFilters.Worker.FilterMode))
      return;

    var targetFolder;
    switch(quickFilters.Util.Application) {
      case 'Thunderbird':
        targetFolder = treeView._rowMap[aRow]._folder.QueryInterface(Components.interfaces.nsIMsgFolder);
        break;
      case 'SeaMonkey': // messengerdnd.js: dragService
        targetFolder = GetFolderResource(quickFilters.folderTree, aRow).QueryInterface(Components.interfaces.nsIMsgFolder);
        break;
      case 'Postbox':
        targetFolder = GetFolderResource(quickFilters.folderTree, aRow).QueryInterface(Components.interfaces.nsIMsgFolder);
        break;
    }

    let sourceFolder;
    let messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
    var messageUris = [];
    for (let i = 0; i < dataTransfer.mozItemCount; i++) {
      var messageUri = dataTransfer.mozGetDataAt("text/x-moz-message", i);

      if (!i) {
        let msgHdr = messenger.msgHdrFromURI(dataTransfer.mozGetDataAt("text/x-moz-message", i));
        sourceFolder = msgHdr.folder;
      }

      //dataObj = dataObj.value.QueryInterface(Components.interfaces.nsISupportsString);
      //var messageUri = dataObj.data.substring(0, len.value);

      messageUris.push(messageUri);

      //array.appendElement(msgHdr, false);
    }
    let isMove = Cc["@mozilla.org/widget/dragservice;1"]
                   .getService(Ci.nsIDragService).getCurrentSession()
                   .dragAction == Ci.nsIDragService.DRAGDROP_ACTION_MOVE;
    if (!sourceFolder.canDeleteMessages)
      isMove = false;


    // handler for dropping messages
    try {
			let sourceFolder;
      quickFilters.Util.logDebugOptional("dnd", "onDrop: " + messageUris.length + " messageUris to " + targetFolder.URI);
      if(messageUris.length > 0) {
        if (quickFilters.Worker.FilterMode)
        {
          // note: getCurrentFolder fails when we are in a search results window!!
          sourceFolder = quickFilters.Util.getCurrentFolder();
          if (!sourceFolder || quickFilters.Util.isVirtual(sourceFolder))
          {
            let msgHdr = messenger.msgHdrFromURI(messageUris[0].toString());
            sourceFolder = msgHdr.folder;
          }
        }
        var msgList = quickFilters.Util.createMessageIdArray(targetFolder, messageUris);

        let isCopy = !isMove;
        if (quickFilters.Worker.FilterMode)
          quickFilters.Worker.createFilterAsync(sourceFolder, targetFolder, msgList, isCopy);
      }

    }
    catch(e) {
      quickFilters.LocalErrorLogger("Exception in onDrop - quickFilters.Util.moveMessages:" + e);
      return;
    };
  },

  onFolderTreeDrop: function(evt, dropData, dragSession) {
    let Ci = Components.interfaces;
    if (!dragSession)
      dragSession = Components.classes["@mozilla.org/widget/dragservice;1"]
                              .getService(Ci.nsIDragService)
                              .getCurrentSession();
    let isMove = (dragSession.dragAction == Ci.nsIDragService.DRAGDROP_ACTION_MOVE);
    let treeView = quickFilters.folderTreeView;
    let dataTransfer = evt.dataTransfer ? evt.dataTransfer : treeView._currentTransfer;

    let types = dataTransfer.mozTypesAt(0);  // one flavor
    if (Array.indexOf(types, "text/x-moz-message") === -1 || (!quickFilters.Worker.FilterMode))
      return false;

    quickFilters.Util.logDebugOptional("dnd", "buttonDragObserver.onDrop flavor[0]=" + types[0].toString());


//    if ((dropData.flavour.contentType !== "text/x-moz-message") || (!quickFilters.Worker.FilterMode))
//      return false;


    let prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Ci.nsIPrefService).getBranch("mail.");
    let theURI = prefBranch.getCharPref("last_msg_movecopy_target_uri");

    var targetFolder = GetMsgFolderFromUri(theURI);

    var trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
    //alert('trans.addDataFlavor: trans=' + trans + '\n numDropItems=' + dragSession.numDropItems);
    trans.addDataFlavor("text/x-moz-message");

    var messageUris = []; var i;
    var sourceFolder = null;

    for (i = 0; i < dragSession.numDropItems; i++) {
      dragSession.getData (trans, i);
      var dataObj = new Object();
      var flavor = new Object();
      var len = new Object();
      try {
        trans.getAnyTransferData(flavor, dataObj, len);

        if (flavor.value === "text/x-moz-message" && dataObj) {

          dataObj = dataObj.value.QueryInterface(Components.interfaces.nsISupportsString);
          var messageUri = dataObj.data.substring(0, len.value);

          messageUris.push(messageUri);
        }
      }
      catch (e) {
        quickFilters.LocalErrorLogger("Exception in onDrop item " + i + " of " + dragSession.numDropItems + "\nException: " + e);
      }
    }
    // handler for dropping messages
    try {
      quickFilters.Util.logDebugOptional("dnd", "onDrop: " + messageUris.length + " messageUris to " + targetFolder.URI);
      if(messageUris.length > 0) {
        if (quickFilters.Worker.FilterMode)
        {
          // note: getCurrentFolder fails when we are in a search results window!!
          var sourceFolder = quickFilters.Util.getCurrentFolder();
          if (!sourceFolder || quickFilters.Util.isVirtual(sourceFolder))
          {
            let msgHdr = messenger.msgHdrFromURI(messageUris[0].toString());
            sourceFolder = msgHdr.folder;
          }
        }
        var msgList = quickFilters.Util.createMessageIdArray(targetFolder, messageUris);
          // dragSession.dragAction === Components.interfaces.nsIDragService.DRAGDROP_ACTION_COPY

        let isCopy = !isMove; // event.ctrlKey ? true : false;
        if (quickFilters.Worker.FilterMode)
          quickFilters.Worker.createFilterAsync(sourceFolder, targetFolder, msgList, isCopy);
      }

    }
    catch(e) {
      quickFilters.LocalErrorLogger("Exception in onDrop - quickFilters.Util.moveMessages:" + e);
    };
    return false;
  }

};

// mail3pane events

//if (document.getElementById('messengerWindow').getAttribute('windowtype') === "mail:3pane") {
// adding the SetTimeOut for debugging this!
//  window.addEventListener("load", function () { setTimeout( function () {quickFilters.onLoad()}, 30000 ) }, false);
  window.addEventListener("load", function () { quickFilters.onLoad(); }, false);
  window.addEventListener("unload", function () { quickFilters.onUnload(); }, false);
//}


// this should do all the event work necessary
// not necessary for mail related work!
quickFilters.FolderListener = {
  ELog: function(msg)
  {
    try {
      try {Components.utils.reportError(msg);}
      catch(e) {
        var Cc = Components.classes;
        var Ci = Components.interfaces;
        var cserv = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
        cserv.logStringMessage("quickFilters:" + msg);
      }
    }
    catch(e) {
      // write to TB status bar??
      try{quickFilters.Util.logToConsole("Error: " + msg);} catch(e) {;};
    };
  },


  OnItemRemoved: function(parent, item, viewString) {
    // future function: find filters that move mail here and delete or deactivate them
  },

  OnItemAdded: function(parent, item, viewString) {/* NOP */ },
  // parent, item, viewString
  OnItemPropertyChanged: function(property, oldValue, newValue) { /* NOP */ },
  OnItemIntPropertyChanged: function(item, property, oldValue, newValue) { /* NOP */ },
  OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) {},
  OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue) { /* var x=property.toString(); */ },
  OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) {

  },
  OnItemEvent: function(item, event) {
    var eString = event.toString();
    try {
      quickFilters.Util.logDebugOptional("events","event: " + eString);
      switch (eString) {
        case "FolderLoaded": // DeleteOrMoveMsgCompleted
          break;
        case "RenameCompleted":
          // find filters with this target and correct them?
          break;
      }
    }
    catch(e) {this.ELog("Exception in FolderListener.OnItemEvent {" + eString + "}:\n" + e)};
  },
  OnFolderLoaded: function(aFolder) { },
  OnDeleteOrMoveMessagesCompleted: function( aFolder) {}

}

