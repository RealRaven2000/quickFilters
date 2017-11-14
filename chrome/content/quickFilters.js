"use strict";

/*
 ***** BEGIN LICENSE BLOCK *****
 * for detail, please refer to license.txt in the root folder of this extension
 * 
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 3
 * of the License, or (at your option) any later version.
 * 
 * If you use large portions of the code please attribute to the authors
 * (Axel Grude)
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You can download a copy of the GNU General Public License at
 * http://www.gnu.org/licenses/gpl-3.0.txt or get a free printed
 * copy by writing to:
 *   Free Software Foundation, Inc.,
 *   51 Franklin Street, Fifth Floor,
 *   Boston, MA 02110-1301, USA.
 *
 * ***** END LICENSE BLOCK *****
 */


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
	 

	1.8 : 19/05/2013
	 # french locale completed [thanks to Jojaba - BabelZilla]
	 # [FR ???] Added Cut, Copy and Paste to transfer filters between accounts
	 # [Bug 25389] merging filters throws NS_ERROR_FAILURE - this can happen if there is an invalid action in a filter, please check debug log for more information
	 # [FR 15388] Added "run Filters" command to folder tree menu
	 # guards against not selecting enough filters before using the "Merge" command
	 # some debugging improvements during createFilter

	2.0 : 10/09/2013
		# Improved integration with QuickFolders
		# Compatibility change for Tb 24 / Sm2.17 (nsIMsgAccountManager.accounts changed from nsIMutableArray to nsIArray)
		# Compatibility Fixes for Thunderbird 26 (removed widgetglue.js)
    # Added a toolbar which shows the quickFilters commands: Copy, Cut, Paste, Merge, Start Assistant, and settings.	
    #	Added Postbox Compatibility.
		# Improved integration with QuickFolders
		# Compatibility change for Tb 24 / Sm2.17 (nsIMsgAccountManager.accounts changed from nsIMutableArray to nsIArray)
		# Added donate button to settings dialog
	  # (TBD: rename toggleFilter to avoid false validation warnings ??)
		
  2.1 : 27/11/2013
		# improved function that copies filter conditions - copies used to be dependant on their originals
		# [FR 25627] - new template for	Group of People (add more than one email-adress) 
		# [FR 25582] - Allow cloning Filters within the same Mail Account 
		# widened template list to avoid filter titles being cut off
    # fixed a problem in onCloseNotification - Postbox had trouble removing the sliding notification
    # made debug settings (on right-clicking debug checkbox) settings filter more reliable (it sometimes did not work at all)	
		
	2.2 : 30/12/2013
		#	make it possible to disable donation screen displayed on update by rightclicking the donate button
    # [Bug 25668] - Allow "move to folder action" to be disabled. Automatically switch off "move to folder" in 
		  Inbox, Drafts, SentMail, Newsgroup, Queue, Templates
		# [Bug 25669] - Add a listener for adding Tags (keywords) to a Mail
		
	2.3 : 29/01/2014
	  # Added help buttons to filter list and filter assistant
		# Improved merging of filters
		# Default "Target Folder" action to active when using context menu (create filter from message)
		# Bugfix: Postbox does not implement nsMsgFolderFlags
		
	2.4 : 24/02/2014
	  # Fixed [Bug 25686] Cloning Filters fails with Non-String condition attributes. If a filter condition compares with 
		  read status or another non-string attribute (e.g. date, number of age in days, priority, junk status etc.) the cloning will silently fail.
		# Fixed [Bug 25688] Creating Filter on IMAP fails after 7 attempts - caused by missing msgDatbase on target folder.
		# [Fixed] In Postbox / SeaMonkey some Support Site links do not work
		# Added some logic to the naming when filter action focuses on Tags
		# Postbox: [Fixed] gFolderDisplay doesn't exist so selectedMessages could not be determined (Message > quickFilter: define Filter from message)
		# Postbox: [Fixed] Broken styling in Options dialog (Support links + Donate button) due to legacy display menu. 
		           - Added legacy styles for Postbox.
		# Postbox: [FR 25691] Support for Postbox quickmove feature - also support the filter assistant when moving mail to a folder using the shortcut key [v] 
    # [Bug 25692] W.I.P - in Postbox, creating filters from messages that were already moved is not possible.
		              The initial bugfix makes it possible to use this function provided there is only one active mail account
		
  2.5 : 02/04/2014
    # Added UI switches to support Postbox's quickmove feature
    # Additional switch for disabling Tag listener
    # [Bug 25714] Option to disable two-way addressing
    # Added a link for download / installing "Copy Sent to Current"
    # [Bug 25727] Allow to create Group Filter with "Create Filter from Message" menu (select multiple emails for this)
    # Prompt for adding a customized subject to support email
    # Right-click on quickFilters button opens options
    # added extensions.quickfilters.showListAfterCreateFilter switch so display of filter list after creation of filter can be disabled
    
	2.6 : 14/07/2014
		# preparation code for filtering changing to ANY / ALL conditions
    # added "from Domain" filter template
    # [Bug 25758] accounts without a from email address fail with error "idMail is null"
    # [Bug 25752] Add Search Box For Specific Filter Rules
    # [Bug 25789] Add tool to detect duplicate conditions / actions
    # Added notification system for premium features
    # Added hidden switch extensions.quickfilters.showListAfterCreateFilter

  2.6.1 : 18/07/2014
    # [Bug 25802] After editing existing Filter, it should be selected in List 
    # [Bug 25805] Find duplicates tool now also matches target folders
    # Postbox: added "create filter from message" in thread pane context menu
    # Remove duplicate condition context menu command: Improved highlighting of duplicate matches in Filter Rules 
      - on some systems the background gradient was not visible, so it now falls back to a plain red background
    # Completed Chinese translations for 2.6
    # The merge symbol (m+) which is appended to the name of a merged filter can now be configured using the 
      config setting extensions.quickfilters.naming.mergeToken
    # When displaying long folder names in duplicate search, these will be now cut off at the 
		    front (30char limit) to avoid an excessively wide duplicate list

  2.7 : 18/08/2014
    #  [Bug 25737] Filters sort feature
    #  [Bug 25812] Tool to find all filters that move mail to a specific folder
    #  [Bug 25748] Automatic Refresh of Duplicate List (Thunderbird only)
    #  Improved notification message for premium features
    #  Postbox / SeaMonkey: Fixed insert position for cut/paste functionality

  2.7.1 : 28/10/2014
    # [Bug 25829] Pasting filters positions wrong when search box active
    # [Bug 25875] Refresh+Focus Message Filters List after filter creation if already open 
    # [Bug 25876] Disable two way-address search selects wrong condition 
    # [Bug 25877] Automatically select merge instead of new filter
    # [Bug 25873] Postbox: Listen for Tag changes doesn't work
    # [Bug 25874] Postbox: cannot merge 2 different filters, unless they are next to each other
    # Added choice to omit filter list step after filter creation
    # Added option to disable list after filter creation
    # Improved Folder context "Find Filter" Command behavior when multiple filters are found (Sm, Pb)
    # Improved Look of Search Options dropdown button in Linux (Ubuntu)
    # Improved Alphabetic Sorting by using toLocaleLowerCase()
  
  2.8 : 13/12/2014
    # [Bug 25863] Filter by 'Reply To' field - extensions.quickfilters.experimental.replyTo
    # [Bug 25893] Added Toolbarbuttons for QuickFolders' current folder bar
    # [Bug 25895] Option to uncheck "Apply filter when getting new mail"
    # add sliding notification after run filters command
    # [Bug 25912] Support adding subjects from multiple Emails
  
  2.9 : 03/09/2015
    # Postbox 4.0 compatibility
    # [Bug 25989] Support Creation of Custom Templates
    # [Bug 26023] Template "Based on Recipient (To)" returns full lowercase address field
    # Postbox: improved event listener for dropping mails onto the folder tree
    # Split run Filters command into "folders" and "selected messages" - added separate buttons
    # Fixed: creating filters from multiple emails (e.g. "from group") by improving the way
    #        the messages list is processed (refreshHeader) 
    # Improved algorithm for determining the originating folder for mails moved
    
  3.0.1 : 21/11/2015
		# [Bug 26107] when copying / cut & pasting multiple filters across accounts, these are inserted in reverse order.
    # [Bug 26076] Support ContextMenu => Move To Folder
		# Support for "brighttext" themes (Themes with dark backgrounds)
		# removed for..each..in to avoid unnecessary warnings in log window

	3.0.2 : 05/12/2015
	  # [Bug 25688] Creating Filter on IMAP fails after 7 attempts
		              Since update 3.0.1 this was also in some case triggered when the assistant was 
									not activated: https://www.mozdev.org/bugs/show_bug.cgi?id=25688
									
	3.1 : 28/02/2016
		# [Bug 26163] Tagging broken: "too much recursion"
		# [Bug 26110] Tag Listener repeats Assistant multiple times
    # Added config setting to suppress notification when running a filter	
		# Added a sliding notification if during use of customized templates a header cannot be retrieved from the email

	3.2 : 07/06/2016
		# [Bug 26200] "Move To" context menu entry not working in Tb 45.0 
		# [Bug 26231] Add option to run filters on read IMAP mails
		# [Bug 26214] Custom Templates: Regular expression to extract from subject - %subjectRegex()%
		# Thunderbird Daily YouTube channel button
		# [Bug 26232] Tagging fault: ToggleMessageTag is not a function
		
	3.2.1 : 27/05/2017
		# [Bug 26360] Thunderbird 52 Filter List - search function not working
		# Fixed jumping across accounts when searching for filters (Postbox, SeaMonkey)
		# Thunderbird 52: Some Fixes for "Run filters in folder button" on filters list

	3.3 : WIP
	  # Make sure mails that are tagged manually are filtered immediately.
		# New: Option to insert new filter in alphabetical order
		# Added button to search for current folder's filters to QuickFolders' current folder toolbar
		# Removed obsolete option "Run Filters on all Mail" on the account properties dialog
		# Added Spanish locale (es) thanks to strel at Babelzilla
		# Added Argentinian locale (es-ar) thanks to Tonyman at Babelzilla
		# [Bug 26354] When merging / creating a filter, select "run on folder" automatically. This should be set to the specified account's inbox.
		
	PLANNED CHANGES  
		# [add support for Nostalgy: W.I.P.]  we now have quickMove in QuickFolders and it works with that
  PREMIUM FEATURES:
    # [Bug 25409] Extended autofill on selection: Date (sent date), Age in Days (current mail age), Tags, Priority, From/To/Cc etc., (Full) Subject
	 */
  
if (Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo).ID != "postbox@postbox-inc.com")
{
  // Here, Postbox declares fixIterator
  Components.utils.import("resource:///modules/iteratorUtils.jsm");  
}   

var quickFilters = {
  Properties: {},
  _folderTree: null,
  strings: null,
  initialized: false,
  firstRunChecked: false,
  firstRunCount: 0,
  quickFilters_originalDrop: null,
  isLoading: false,
  get mailSession() { 
    return Components.classes["@mozilla.org/messenger/services/session;1"].getService(Components.interfaces.nsIMsgMailSession);
	},
	get notificationService() {
    return Components.classes["@mozilla.org/messenger/msgnotificationservice;1"].getService(Components.interfaces.nsIMsgFolderNotificationService);
	},
	
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
     onDrop: function folderObserver_onDrop(row, orientation) {
        if (quickFilters.Worker.FilterMode) {
          try { 
					  quickFilters.onFolderTreeViewDrop(aRow, aOrientation); 
					}
          catch(e) {
            quickFilters.Util.logException("quickFilters.onFolderTreeViewDrop FAILED\n", e);
          }
        }
     } ,
		 onDropPostbox: function folderObserver_onDropPostbox(event) {
				try { 
					quickFilters.Util.logDebugOptional("events,msgMove", "onDropPostbox: " + event);
					if (!quickFilters.Worker.FilterMode)
						return;
					let row = { }, col = { }, child = { },
					    treechildren = event.originalTarget,
					    tree = treechildren.parentNode,
					    tbo = tree.treeBoxObject;
					tbo.getCellAt(event.clientX, event.clientY, row, col, child);
					quickFilters.onFolderTreeViewDrop(row.value); 
				}
				catch(e) {
					quickFilters.Util.logException("quickFilters.onFolderTreeViewDrop FAILED\n", e);
				}
		 }
  },
  
  pbDropEvent: function pbDropEvent(event) {
    quickFilters.folderObserver.onDropPostbox(event);
  } ,

  onLoad: function onLoad() {
    // initialization code - guard against all other windows except 3pane
    let util = quickFilters.Util,
        el = document.getElementById('messengerWindow');
    if (this.isLoading) return; // avoid multiple onLoad triggering (Postbox?)
    if (!el || el.getAttribute('windowtype') !== "mail:3pane")
      return;
    this.isLoading = true;
    try {
      let v = util.Version; // start the version proxy, throw away v

      util.logDebugOptional("events,listeners", "quickFilters.onload - starts");
      this.strings = document.getElementById("quickFilters-strings");

      let tree = quickFilters.folderTree,
          treeView = quickFilters.folderTreeView;

      // let's wrap the drop function in our own (unless it already is quickFilters_originalDrop would be defined])
      if (!tree.quickFilters_originalDrop) {  
        switch (util.Application) {
          case 'Postbox':  
            // tree.quickFilters_originalDrop = treeView.drop;
            // tree.addObserver (quickFilters.folderObserver);
            tree.removeEventListener("drop", quickFilters.pbDropEvent);
            tree.addEventListener("drop", quickFilters.pbDropEvent);
            break;
          case 'SeaMonkey':
            tree.quickFilters_originalDrop = folderObserver.onDrop; // backup old drop function
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
                util.logException("quickFilters.onFolderTreeViewDrop FAILED\n", e);
              }
            }
            // fix "too much recursion" error!
            tree.quickFilters_originalDrop.apply(treeView, arguments);
          }
          /**************************************/

          switch (util.Application) {
            case 'Postbox':  // to test!
              treeView.drop = newDrop;
              // treeview is wrapped [Cannot modify properties of a WrappedNative = NS_ERROR_XPC_CANT_MODIFY_PROP_ON_WN]
              // therefore we can't add treeView.quickFiltersDropper
              break;
            case 'SeaMonkey':
              folderObserver.onDrop = newDrop;
              break;
            case 'Thunderbird':
              treeView.drop = newDrop;
              break;
          }
        }
      }

      this.initialized = true;
      
      if (util.Application == 'Postbox') {
				if (gQuickfilePanel && !gQuickfilePanel.executeQuickfilePanel) {
					gQuickfilePanel.executeQuickfilePanel = gQuickfilePanel.execute;
					gQuickfilePanel.execute = function() {
						let restoreFunction = MsgMoveMessage;
						quickFilters.executeQuickfilePanelPreEvent(gQuickfilePanel);
						gQuickfilePanel.executeQuickfilePanel();  // the actual workload, 
																											// includes creating the filter and calling the wrapped MsgMoveMessage
																											// all contained in the wrapper MsgMoveMessage
																											// the actual move isn't done until quickFilters.Worker.createFilter
																											// has done its work and resets the promiseCreateFilter semaphor
					}
				}
      }
			// use also in Postbox:
			if (!quickFilters.executeMoveMessage
					&&
					quickFilters.MsgMove_Wrapper != MsgMoveMessage) {
				util.logDebugOptional('msgMove', ' Wrapping MsgMoveMessage...');
				quickFilters.executeMoveMessage = MsgMoveMessage;
				MsgMoveMessage = quickFilters.MsgMove_Wrapper; // let's test this for a while...
				util.logDebugOptional('msgMove', 
															' quickFilters.executeMoveMessage == quickFilters.MsgMove_Wrapper :' 
															+ (quickFilters.executeMoveMessage == quickFilters.MsgMove_Wrapper));
				quickFilters.executeCopyMessage = MsgCopyMessage;
				MsgCopyMessage = quickFilters.MsgCopy_Wrapper; // let's test this for a while...
			}
      // for move to / copy to recent context menus we might have to wrap mailWindowOverlay.js:MsgMoveMessage in Tb!
      
      
      // problem with setTimeout in SeaMonkey - it opens the window and then never calls the function?
      if (quickFilters.Preferences.getBoolPref("autoStart") &&  !quickFilters.Worker.FilterMode) 
      {
        util.logDebugOptional("events","setTimeout() - toggle_FilterMode");
        setTimeout(function() { quickFilters.Worker.toggle_FilterMode(true, true);  }, 100);
      }

      // Add Custom Terms... - only from next version after 2.7.1 !
      if (quickFilters.Preferences.getBoolPref('templates.replyTo')) {
        try {
          let customId = quickFilters.CustomTermReplyTo.id,
              filterService = Components.classes["@mozilla.org/messenger/services/filters;1"]
                              .getService(Components.interfaces.nsIMsgFilterService);
          if (!filterService.getCustomTerm(customId)) {
            //l10n
            quickFilters.CustomTermReplyTo.name = util.getBundleString("quickfilters.customfilter.replyto", "Reply-To");
            util.logDebug('Adding Custom Term: ' + quickFilters.CustomTermReplyTo.name);
            filterService.addCustomTerm(quickFilters.CustomTermReplyTo);
          }
          else {
            util.logDebug('Custom Filter Term exists: ' + customId);
          }
        }
        catch(ex) {
          util.logException('Adding custom filter failed ', ex);
        }
      }
      
      util.logDebugOptional("events","setTimeout() - checkFirstRun");
      setTimeout(function() { quickFilters.checkFirstRun(); }, 1000);
      
      quickFilters.toggleCurrentFolderButtons();
    }
    catch(ex) {
      quickFilters.Util.logException("quickFilters.onLoad failed", ex);
    }
    finally {
      this.isLoading = false;
      util.logDebugOptional("events,listeners", "quickFilters.onload - ends");
    }
		
  },

  onUnload: function onUnload() {
    // remove the event handlers!
  },

  showOptions: function showOptions() {
    window.openDialog('chrome://quickfilters/content/quickFilters-options.xul','quickfilters-options','chrome,titlebar,centerscreen,resizable,alwaysRaised,instantApply').focus();
  },

  checkFirstRun: function checkFirstRun() {
		let util = quickFilters.Util;
    try {
      if (this.firstRunChecked)
        return;
      this.firstRunCount++;
      util.logDebug("=================quickFilters==============\n" + "   checkFirstRun() - attempt " + this.firstRunCount);
      let currentVersion = util.Version;
      // retry until version number doesn't lie anymore
      if (currentVersion.indexOf("hc")>=0) {
        window.setTimeout(function() { quickFilters.checkFirstRun(); }, 1000);
        return;
      }
      let installedVersion = quickFilters.Preferences.getCharPref("installedVersion"),
          firstRun = quickFilters.Preferences.getBoolPref("firstRun");
      util.logDebug("firstRun = " + firstRun + "  - currentVersion = " + currentVersion + "  - installed = " + installedVersion);
      let toolbarId = '';
      if (firstRun) {
        switch(util.Application) {
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
        quickFilters.Preferences.setBoolPref("firstRun", false);
        util.showHomePage();
      }
      else {
        // is this an update?
				let installedV = util.getVersionSimple(installedVersion),
				    currentV = util.getVersionSimple(currentVersion);
        if (currentVersion.indexOf("hc") ==-1)
        {
					if (util.versionLower(installedV, currentV))
					{ 				
						util.showVersionHistory(false);
						
						if (quickFilters.Preferences.getBoolPrefSilent("extensions.quickfilters.donations.askOnUpdate")
						    && !(installedV=="2.3" && currentV=="2.3.1")
                && !(installedV=="2.4" && currentV=="2.4.1")
                && !(installedV=="2.6" && currentV=="2.6.1"))
						  util.showDonatePage();
					}
        }
        util.logDebug("store installedVersion: " + util.getVersionSimple(currentVersion));
        quickFilters.Preferences.setCharPref("installedVersion", util.getVersionSimple(currentVersion));
      }
      this.firstRunChecked = true;
    }
    catch(ex) {
      util.logException("checkFirstRun failed", ex);
    }

  },

  onMenuItemCommand: function onMenuItemCommand(e, cmd) {
//     let promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
//                                   .getService(Components.interfaces.nsIPromptService);
//     promptService.alert(window, this.strings.getString("helloMessageTitle"),
//                                 this.strings.getString("helloMessage"));
		switch(cmd) {
			case 'toggle_Filters':
				quickFilters.Worker.toggle_FilterMode(!quickFilters.Worker.FilterMode);
				break;
			case 'createFilterFromMsg':
				let selectedMessages,
            selectedMessageUris,
				    messageList = [];
				if (quickFilters.Util.Application === 'Postbox') {
				  selectedMessages = quickFilters.Util.pbGetSelectedMessages();
          selectedMessageUris = quickFilters.Util.pbGetSelectedMessageUris();
				}
				else {
				  selectedMessages = gFolderDisplay.selectedMessages; 
          selectedMessageUris = gFolderDisplay.selectedMessageUris;
				}
				// && selectedMessages[0].folder.server.canHaveFilters
				if (selectedMessages.length > 0 && selectedMessages[0].folder ) {
				  // ### [Bug 25688] Creating Filter on IMAP fails after 7 attempts ###
          for (let m=0; m<selectedMessages.length; m++) {  // ### Bug 25727 Allow to create Group Filter with "Create Filter from Message" menu
            messageList.push(quickFilters.Util.makeMessageListEntry(selectedMessages[m], selectedMessageUris[m])); 
          }
				  // the original command in the message menu calls the helper function MsgCreateFilter()
					// we do not know the primary action on this message (yet)
					let currentMessageFolder = quickFilters.Util.getCurrentFolder();
					if (quickFilters.Util.isVirtual(currentMessageFolder)) {
					  if (selectedMessages[0].folder)  // find the real folder!
							currentMessageFolder = selectedMessages[0].folder;
          }					
					quickFilters.Worker.createFilterAsync_New(null, currentMessageFolder, messageList, null, false);
				}
				else {
				  let wrn = quickFilters.Util.getBundleString("quickfilters.createFromMail.selectWarning",
						"To create a filter, please select exactly one email!");
				  quickFilters.Util.popupAlert(wrn);
				}
				break;
		}
  },

  onToolbarButtonCommand: function onToolbarButtonCommand(e) {
    // just reuse the function above.  you can change this, obviously!
    quickFilters.onMenuItemCommand(e, 'toggle_Filters');
  },

  onToolbarListCommand: function onToolbarListCommand(e) {
	  if (quickFilters.Util.Application == 'Postbox') {
			MsgFilters(null, null);
		}
		else 
      goDoCommand('cmd_displayMsgFilters');
  },

  onApplyFilters: function onApplyFilters(e) {
    goDoCommand('cmd_applyFilters'); // same in Postbox
		if (quickFilters.Preferences.getBoolPref('notifications.runFilter')) {
			let text = quickFilters.Util.getBundleString('quickfilters.runFiltersOnFolder.notify', 'Ran filters on current folder');
			quickFilters.Util.slideAlert(text, 'quickFilters');
		}
  },
  
  onApplyFiltersToSelection: function onApplyFiltersToSelection(e) {
    goDoCommand('cmd_applyFiltersToSelection'); // same in Postbox
		if (quickFilters.Preferences.getBoolPref('notifications.runFilter')) {
			let text = quickFilters.Util.getBundleString('quickfilters.runFiltersOnMails.notify', 'Applied filters to selected messages');
			quickFilters.Util.slideAlert(text, 'quickFilters');
		}
  },
  
  searchFiltersFromFolder: function searchFiltersFromFolder(e) {
		const util = quickFilters.Util,
					Ci = Components.interfaces;
    let menuItem = e ? e.target : null,
        folders = GetSelectedMsgFolders(); // quickFilters.folderTreeView.getSelectedFolders();
    if (!folders.length)
      return false;    
    // 1. open filters list
    //quickFilters.onToolbarListCommand();
    // 2. iterate accounts, find matching filter using the folder as search attribute with "move to folder" search.
    let targetFolder = folders[0],
        matchedAccount,
        matchedFilter;
    
    try {
      let acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
                          .getService(Ci.nsIMsgAccountManager),
          FA = Components.interfaces.nsMsgFilterAction;
			for (let account in fixIterator(acctMgr.accounts, Ci.nsIMsgAccount)) {
        if (account.incomingServer && account.incomingServer.canHaveFilters )
        {
          let msg ='',
              ac = account.incomingServer.QueryInterface(Ci.nsIMsgIncomingServer),
              // 2. getFilterList
              filterList = ac.getFilterList(msgWindow).QueryInterface(Ci.nsIMsgFilterList);
          // 3. use  nsIMsgFilterList.matchOrChangeFilterTarget(oldUri, newUri, false)
          if (filterList) {
            // filterList.matchOrChangeFilterTarget(sourceURI, targetURI, false)
            let numFilters = filterList.filterCount;
            util.logDebugOptional("filterSearch", "checking account [" + ac.prettyName + "] for target folder: " +  targetFolder.URI + '\n'
                                               + "iterating " + numFilters + " filters...");
            for (let i = 0; i < numFilters; i++)
            {
              let curFilter = filterList.getFilterAt(i),
                  actionList = curFilter.actionList ? curFilter.actionList : curFilter.sortedActionList,
                  acLength = actionList.Count ? actionList.Count() : actionList.length;
              for (let index = 0; index < acLength; index++) { 
                let action = actionList.queryElementAt ? 
                             actionList.queryElementAt(index, Components.interfaces.nsIMsgRuleAction) :
                             actionList.QueryElementAt(index, Components.interfaces.nsIMsgRuleAction);
                if (action.type == FA.MoveToFolder || action.type == FA.CopyToFolder) {
                  if (action.targetFolderUri) { 
                    msg += "[" + i + "] Current Filter URI:" +  action.targetFolderUri + "\n";
                    if (action.targetFolderUri === targetFolder.URI) {
                      util.logDebugOptional("filterSearch", "FOUND FILTER MATCH:\n" + curFilter.filterName);
                      matchedFilter = curFilter;
                      matchedAccount = ac;
                      break;
                    }
                    // also allow complete match (for duplicate search)
                    //if (action.targetFolderUri.toLocaleLowerCase() == aKeyword)
                    //  return true;
                  }
                }                
                
              }
              if (matchedAccount) break;
            }            
          }
          if (matchedAccount) break;
          util.logDebugOptional("filterSearch.detail", msg);
        }
        
      }
    }
    catch(ex) {
      util.logException("Exception in quickFilters.searchFiltersFromFolder ", ex);
    }
    let aFolder = matchedAccount ? matchedAccount.rootMsgFolder : null,
        win = util.getLastFilterListWindow(); 
    // close old window
    if (win) win.close();

    quickFilters.Worker.openFilterList(true, aFolder, matchedFilter, targetFolder);
    
    if (!matchedAccount) {
      let wrn = util.getBundleString('quickfilters.search.warning.noresults', 'No matching filters found.');
			util.popupAlert(wrn, "quickFilters", 'fugue-clipboard-exclamation.png');    
    }
    else {
      util.popupProFeature("searchFolder", "quickfilters.premium.title.searchFolder", true, false);    
    }
  },

  LocalErrorLogger: function LocalErrorLogger(msg) {
    let Cc = Components.classes,
        Ci = Components.interfaces,
        cserv = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
    cserv.logStringMessage("quickFilters:" + msg);
  },

  onFolderTreeViewDrop: function onFolderTreeViewDrop(aRow, aOrientation) {
    let Cc = Components.classes,
        Ci = Components.interfaces,
				util = quickFilters.Util,
        treeView = quickFilters.folderTreeView,
				worker = quickFilters.Worker,
        dataTransfer,
        dragSession;
		util.logDebugOptional("events,msgMove", "onFolderTreeViewDrop");
    switch(util.Application) {
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
    if (Array.indexOf(types, "text/x-moz-message") === -1 || (!worker.FilterMode))
      return;

    let targetFolder;
    switch(util.Application) {
      case 'Thunderbird':
        targetFolder = treeView._rowMap[aRow]._folder.QueryInterface(Ci.nsIMsgFolder);
        break;
      case 'SeaMonkey': // messengerdnd.js: dragService
        targetFolder = GetFolderResource(quickFilters.folderTree, aRow).QueryInterface(Ci.nsIMsgFolder);
        break;
      case 'Postbox':
        targetFolder = GetFolderResource(quickFilters.folderTree, aRow).QueryInterface(Ci.nsIMsgFolder);
        break;
    }

    let sourceFolder,
        messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger),
        messageUris = [];
    for (let i = 0; i < dataTransfer.mozItemCount; i++) {
      let messageUri = dataTransfer.mozGetDataAt("text/x-moz-message", i);

      if (!i) {
        let msgHdr = messenger.msgHdrFromURI(messageUri);
        sourceFolder = msgHdr.folder;
      }

      //dataObj = dataObj.value.QueryInterface(Components.interfaces.nsISupportsString);
      //let messageUri = dataObj.data.substring(0, len.value);

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
      util.logDebugOptional("dnd", "onDrop: " + messageUris.length + " messageUris to " + targetFolder.URI);
      if(messageUris.length > 0) {
        if (worker.FilterMode) {
          // note: getCurrentFolder fails when we are in a search results window!!
          sourceFolder = util.getCurrentFolder();
          if (!sourceFolder || util.isVirtual(sourceFolder))
          {
            let msgHdr = messenger.msgHdrFromURI(messageUris[0].toString());
            sourceFolder = msgHdr.folder;
          }
        }
        let msgList = util.createMessageIdArray(targetFolder, messageUris);

        if (worker.FilterMode) {
          worker.createFilterAsync_New(sourceFolder, targetFolder, msgList,
					  isMove ? Components.interfaces.nsMsgFilterAction.MoveToFolder : Components.interfaces.nsMsgFilterAction.CopyToFolder,
						null, false);
					
				}
      }

    }
    catch(e) {
      quickFilters.LocalErrorLogger("Exception in onFolderTreeViewDrop:" + e);
      return;
    };
  },

  onFolderTreeDrop: function onFolderTreeDrop(evt, dropData, dragSession) {
    const Ci = Components.interfaces,
		      util = quickFilters.Util,
					worker = quickFilters.Worker;
    if (!dragSession)
      dragSession = Components.classes["@mozilla.org/widget/dragservice;1"]
                              .getService(Ci.nsIDragService)
                              .getCurrentSession();
    let isMove = (dragSession.dragAction == Ci.nsIDragService.DRAGDROP_ACTION_MOVE),
        treeView = quickFilters.folderTreeView,
        dataTransfer = evt.dataTransfer ? evt.dataTransfer : treeView._currentTransfer,
        types = dataTransfer.mozTypesAt(0);  // one flavor
    if (Array.indexOf(types, "text/x-moz-message") === -1 || (!worker.FilterMode))
      return false;

    util.logDebugOptional("dnd", "buttonDragObserver.onDrop flavor[0]=" + types[0].toString());


//    if ((dropData.flavour.contentType !== "text/x-moz-message") || (!worker.FilterMode))
//      return false;


    let prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Ci.nsIPrefService).getBranch("mail."),
        theURI = prefBranch.getCharPref("last_msg_movecopy_target_uri"),
        targetFolder = util.getMsgFolderFromUri(theURI),
        trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
    //alert('trans.addDataFlavor: trans=' + trans + '\n numDropItems=' + dragSession.numDropItems);
    trans.addDataFlavor("text/x-moz-message");

    let messageUris = [], 
        sourceFolder = null;

    for (let i = 0; i < dragSession.numDropItems; i++) {
      dragSession.getData (trans, i);
      let dataObj = new Object(),
          flavor = new Object(),
          len = new Object();
      try {
        trans.getAnyTransferData(flavor, dataObj, len);

        if (flavor.value === "text/x-moz-message" && dataObj) {

          dataObj = dataObj.value.QueryInterface(Components.interfaces.nsISupportsString);
          let messageUri = dataObj.data.substring(0, len.value);

          messageUris.push(messageUri);
        }
      }
      catch (e) {
        quickFilters.LocalErrorLogger("Exception in onDrop item " + i + " of " + dragSession.numDropItems + "\nException: " + e);
      }
    }
    // handler for dropping messages
    try {
      util.logDebugOptional("dnd", "onDrop: " + messageUris.length + " messageUris to " + targetFolder.URI);
      if(messageUris.length > 0) {
        if (worker.FilterMode)
        {
          // note: getCurrentFolder fails when we are in a search results window!!
          let sourceFolder = util.getCurrentFolder();
          if (!sourceFolder || util.isVirtual(sourceFolder))
          {
            let msgHdr = messenger.msgHdrFromURI(messageUris[0].toString());
            sourceFolder = msgHdr.folder;
          }
        }
        let msgList = util.createMessageIdArray(targetFolder, messageUris);
          // dragSession.dragAction === Components.interfaces.nsIDragService.DRAGDROP_ACTION_COPY

        if (worker.FilterMode)
          worker.createFilterAsync_New(sourceFolder, targetFolder, msgList, 
					   isMove ? Components.interfaces.nsMsgFilterAction.MoveToFolder : Components.interfaces.nsMsgFilterAction.CopyToFolder, 
						 null, false);
      }

    }
    catch(e) {
      quickFilters.LocalErrorLogger("Exception in onFolderTreeDrop:" + e);
    };
    return false;
  } ,
  
  toggleCurrentFolderButtons: function toggleCurrentFolderButtons() {
    // to do - read options and hide buttons from current folder bar
    // options:
    //   quickfolders.curFolderbar.listbutton
    //   quickfolders.curFolderbar.folderbutton
    //   quickfolders.curFolderbar.messagesbutton
    let prefs = quickFilters.Preferences,
        util = quickFilters.Util,
        win = util.getMail3PaneWindow();
    util.logDebug('toggleCurrentFolderButtons()');
    try {
      let btn = win.document.getElementById('quickfilters-current-listbutton');
			if (btn) {
				btn.collapsed = !prefs.getBoolPref('quickfolders.curFolderbar.listbutton');
				btn = win.document.getElementById('quickfilters-current-runbutton');
				btn.collapsed = !prefs.getBoolPref('quickfolders.curFolderbar.folderbutton');
				btn = win.document.getElementById('quickfilters-current-msg-runbutton');
				btn.collapsed = !prefs.getBoolPref('quickfolders.curFolderbar.messagesbutton');
				btn = win.document.getElementById('quickfilters-current-searchfilterbutton');
				btn.collapsed = !prefs.getBoolPref('quickfolders.curFolderbar.findfilterbutton');
			}
    }
    catch (ex) {
      util.logException('toggleCurrentFolderButtons()', ex);
    }
  } ,
  
  MsgMove_Wrapper: function MsgMove_Wrapper(uri) {
    const util = quickFilters.Util;
    try {
      util.logDebugOptional('msgMove', 
                            ' quickFilters.executeMoveMessage == quickFilters.MsgMove_Wrapper :' 
                            + (quickFilters.executeMoveMessage == quickFilters.MsgMove_Wrapper));
      quickFilters.MsgMoveCopy_Wrapper(uri, false);
    }
    catch(ex) {
      util.logException('MsgMove_Wrapper()', ex);
    }
  } ,
  
  MsgCopy_Wrapper: function MsgCopy_Wrapper(uri) {
    const util = quickFilters.Util;
    try {
      util.logDebugOptional('msgMove', 
                            ' quickFilters.executeCopyMessage == quickFilters.MsgMove_Wrapper :' 
                            + (quickFilters.executeCopyMessage == quickFilters.MsgCopy_Wrapper));
      quickFilters.MsgMoveCopy_Wrapper(uri, true);
    }
    catch(ex) {
      util.logException('MsgMove_Wrapper()', ex);
    }
  } ,
  
  MsgMoveCopy_Wrapper: function MsgMoveCopy_Wrapper(uri, isCopy) {
    const util = quickFilters.Util,
          worker = quickFilters.Worker,
          prefs = quickFilters.Preferences,
					Ci = Components.interfaces,
		      rdf = Components.classes['@mozilla.org/rdf/rdf-service;1'].getService(Ci.nsIRDFService);
					
    // MsgMoveMessage wrapper function
    try {
      util.logDebugOptional('msgMove', "Executing wrapped MsgMoveMessage");
      if (prefs.isDebug) debugger;
			if (worker.FilterMode) {
				let sourceFolder = util.getCurrentFolder(),
						destResource = (uri.QueryInterface && uri.QueryInterface(Ci.nsIMsgFolder)) ? 
							uri : rdf.GetResource(uri),
						destMsgFolder = destResource.QueryInterface(Ci.nsIMsgFolder),						
						// get selected message uris - see case 'createFilterFromMsg'
						selectedMessages,
						selectedMessageUris,
						messageList = [];
				if (util.Application === 'Postbox') {
					selectedMessages = util.pbGetSelectedMessages();
					selectedMessageUris = util.pbGetSelectedMessageUris();
				}
				else {
					selectedMessages = gFolderDisplay.selectedMessages; 
					selectedMessageUris = gFolderDisplay.selectedMessageUris;
				}	
				util.logDebugOptional('msgMove', 'MsgMoveCopy_Wrapper(): ' + selectedMessages.length + ' selected Messages counted.');
				//
				let i;
				for (i=0; i<selectedMessages.length; i++) {
					messageList.push(util.makeMessageListEntry(selectedMessages[i], selectedMessageUris[i])); 
					// the original command in the message menu calls the helper function MsgCreateFilter()
					// we do not know the primary action on this message (yet)
				}
				if (i)	{				
					// can we clone here - let's try as counter measure for IMAP users..
					worker.refreshHeaders(messageList, sourceFolder, null); // attempt an early message clone process
					worker.promiseCreateFilter = true;
					worker.createFilterAsync_New(sourceFolder, 
						destMsgFolder, 
						messageList, 
						Ci.nsMsgFilterAction.MoveToFolder,   // filterAction
						false);  // filterActionExt
					util.logDebugOptional('msgMove', "After calling createFilterAsync_New()");
				}
			} // only do if Filter Assistant is active
    }
    catch(ex) {
      util.logException("MsgMoveCopy_Wrapper", ex);
    }					
    finally { 
      // this is very important as we need to restore the original MsgMoveMessage
      let promiseDone = function() { 
        // we cannot quickmove until we are done evaluating the message headers for filter creation
        if (worker.promiseCreateFilter) {
          util.logDebugOptional('msgMove', 'worker.promiseCreateFilter => setTimeout(..)');
          setTimeout(promiseDone, 100);
        }
        else {
          if (isCopy) {
            util.logDebugOptional('msgMove', "Executing original CopyMessage [[");
            quickFilters.executeCopyMessage(uri);
          }
          else {
            util.logDebugOptional('msgMove', "Executing original MoveMessage [[");
            quickFilters.executeMoveMessage(uri); // calls original MsgMoveMessage
          }
          util.logDebugOptional('msgMove', "After original Move/CopyMessage.]]");
        }
      }
      util.logDebugOptional('msgMove', ' setTimeout(..) for final move / copy call');
      setTimeout(promiseDone, 20);
    }					
  },
	
	executeQuickfilePanelPreEvent: function executeQuickfilePanelPreEvent(panel) {
	  // postbox specific 'quickMove' function
		// we need to wrap MsgMoveMessage before calling the original gQuickfilePanel.execute
    const util = quickFilters.Util,
          worker = quickFilters.Worker,
          prefs = quickFilters.Preferences;
		if (!worker.FilterMode) return;
		if (!prefs.getBoolPref('postbox.quickmove')) return;
		
	  if (panel.panel._type === "file") {
		  // wrap the MsgMoveMessage
			try {
			  // we need a closure for executeMoveMessage, cannot store it in the object as 
				// this context might be lost when callint it
        util.logDebugOptional('msgMove', ' Wrapping MsgMoveMessage...');
        if (quickFilters.executeMoveMessage != MsgMoveMessage
            &&
            quickFilters.MsgMove_Wrapper != MsgMoveMessage) {
          quickFilters.executeMoveMessage = MsgMoveMessage;
          MsgMoveMessage = quickFilters.MsgMove_Wrapper;
        }
			}
			catch(ex) {
			  util.logException("executeQuickfilePanelPreEvent", ex);
			}
		}
	},
  
	// this is the wrapped MsgMoveMessage
	executeMoveMessage: null  

}; // quickFilters MAIN OBJECT

// mail3pane events

//if (document.getElementById('messengerWindow').getAttribute('windowtype') === "mail:3pane") {
// adding the SetTimeOut for debugging this!
//  window.addEventListener("load", function () { setTimeout( function () {quickFilters.onLoad()}, 30000 ) }, false);
  window.addEventListener("load", function () { quickFilters.onLoad(); }, false);
  window.addEventListener("unload", function () { quickFilters.onUnload(); }, false);
//}

// https://mxr.mozilla.org/addons/source/3376/chrome/content/mailclassifier/js/main.js#91
quickFilters.MsgFolderListener = {
  qfInstance: quickFilters,
  /**
   * Event fired after message was moved or copied
   *
   * @param {boolean} isMoved  
   * @param {nsIArray} aSrcMsgs    Array of Messages
   * @param {nsIMsgFolder} targetFolder   
   * @param {nsIArray} aDestMsgs    Array of Messages
   */
	msgsMoveCopyCompleted: function(isMoved, aSrcMsgs,  targetFolder, aDestMsgs) {
    let qF = quickFilters ? quickFilters : this.qfInstance;
		qF.Util.logDebug("msgsMoveCopyCompleted: Move = " + isMoved + "  Dest Folder=  " + targetFolder.prettyName);
		try {	
			let firstMsg = aSrcMsgs.queryElementAt(0, Components.interfaces.nsIMsgDBHdr);
			if (firstMsg){
				let srcFolder = firstMsg.folder;				
				if (false){  // from mailclassifier
					let enumeration = aSrcMsgs.enumerate()
					while(enumeration.hasMoreElements()){
						let msg = enumeration.getNext(),
						    uri = targetFolder.getUriForMsg(msg);
							it.emasab.Mailclassifier.controller.setClassification(uri, targetFolder);
						}
					}	
				}
			} catch(e){dump(e);}		
  },
	msgAdded: function msgAdded(aMsg){ ; },
	msgsClassified: function msgsClassified(aMsgs, aJunkProcessed, aTraitProcessed){;},
	msgsDeleted: function msgsDeleted(aMsgs){ ; },
	folderAdded: function folderAdded(aFolder){ ; },
	folderDeleted: function folderDeleted(aFolder){ ; },
	folderMoveCopyCompleted: function folderMoveCopyCompleted(aMove,aSrcFolder,aDestFolder){ ; },
	folderRenamed: function folderRenamed(aOrigFolder, aNewFolder){ ; } ,
	itemEvent: function itemEvent(aItem, aEvent, aData){ ; }
}; // MsgFolderListener
quickFilters.MsgFolderListener.qfInstance = quickFilters;

// this should do all the event work necessary
// not necessary for mail related work!
quickFilters.FolderListener = {
  qfInstance: quickFilters,
  ELog: function(msg) {
    try {
      try {Components.utils.reportError(msg);}
      catch(e) {
        const Cc = Components.classes,
              Ci = Components.interfaces,
              cserv = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
        cserv.logStringMessage("quickFilters:" + msg);
      }
    }
    catch(e) {
      // write to TB status bar??
      try{quickFilters.Util.logToConsole("Error: " + msg);} catch(e) {;};
    };
  },
	
  OnItemAdded: function(parent, item, viewString) {
		const Ci = Components.interfaces;
		try {
			let qfEvent = this.qfInstance || quickFilters;
			if (!qfEvent) return;
	    let logDebug = qfEvent.Util.logDebugOptional.bind(qfEvent.Util);
	    logDebug("events,msgMove","OnItemAdded() " + item.toString());  	
    
      const win = qfEvent.Util.getMail3PaneWindow(),
            util = win.quickFilters.Util,
						prefs = win.quickFilters.Preferences,
            worker = win.quickFilters.Worker;
			if (!worker || !worker.FilterMode) return;
			if (!prefs.getBoolPref("nostalgySupport")) return;
			
			// this code is too dangerous - we need to wrap the nostalgy functions for more reliable results
			let folder = parent.QueryInterface(Ci.nsIMsgFolder);
			// we might have to hook in here to support Nostalgy
			if (item && item.messageKey) {  // mail
				// probably too late to look for selectedMessage at this stage...
				let hdr = item.QueryInterface(Ci.nsIMsgDBHdr),
				    key = hdr.messageKey,
				    subject = hdr.mime2DecodedSubject.toLowerCase();
				logDebug("nostalgy", "Message[" + key + "]: " + subject + " by " + hdr.author.toString());
				let isProcessed = false,
				    list = worker.lastAssistedMsgList,
				    messageDb = folder.msgDatabase ? folder.msgDatabase : null;
				for (let i=0; i<list.length; i++) {
				  let messageId = list[i],
					    messageHeader = messageDb.getMsgHdrForMessageID(messageId);
					if (!messageHeader)
					  continue;
				  let msg = messageHeader.QueryInterface(Ci.nsIMsgDBHdr);
					if (key == msg.messageKey) {
					  isProcessed = true;
						return; // this message was already processed by quickFilters (Dnd to folder tree, QF tab or via context menu).
					}
				}
				logDebug("nostalgy", "Folder listener - item [" + item.toString() + "] added to folder " + folder.name);
				
				// not found = not processed => was moved by nostalgy?
				// problem how to accumulate multiple headers?
				// reset the array!
				while (worker.lastAssistedMsgList.length)
					worker.lastAssistedMsgList.pop();
				// add to the list of message Ids to be processed now
				let selectedMessages = [],  // quickFilters.Util.createMessageIdArray(targetFolder, messageUris);
				    isCopy = false;
				selectedMessages.push(util.makeMessageListEntry(hdr)); // Array of message entries ### [Bug 25688] Creating Filter on IMAP fails after 7 attempts ###
				worker.createFilterAsync_New(null, hdr.folder, selectedMessages, 
           isCopy ? Ci.nsMsgFilterAction.CopyToFolder : Ci.nsMsgFilterAction.MoveToFolder,				
				   null, false);
			}		// it could also be a folder that was added...
		}
		catch(e) { 
		  this.ELog("Exception in FolderListener.OnItemAdded {}:\n" + e)
		};
	
	},
	
  OnItemEvent: function(item, event) {
		if (!event) return; // early exit for 'bad' events happening during MsgMoveMessage
    let eString = event.toString();
    try {
			let qfEvent = this.qfInstance || quickFilters;
			if (!qfEvent) return;
      const win = qfEvent.Util.getMail3PaneWindow(),
            util = win.quickFilters.Util,
            worker = win.quickFilters.Worker;
			util.logDebugOptional("events","OnItemEvent( " + item + ", " + eString +")");
      switch (eString) {
        case "FolderLoaded": 
          break;
        case "RenameCompleted":
          // find filters with this target and correct them?
          break;
        case "DeleteOrMoveMsgCompleted":
          let isAssistant = worker.FilterMode;
          util.logDebugOptional("events,msgMove","DeleteOrMoveMsgCompleted(" + 
            (item ? (item.prettyName ? item.prettyName : item) : '<no folder>') +
						")\n" +
            'Assistant is ' + (isAssistant ? 'active' : 'off'));
          break;
      }
    }
    catch(e) {this.ELog("Exception in FolderListener.OnItemEvent {" + eString + "}:\n" + e)};
  } ,

	/*
	OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue)  {
		const win = qfEvent.Util.getMail3PaneWindow(),
					util = win.quickFilters.Util;
		try {
			util.logDebugOptional("events","OnItemUnicharPropertyChanged( " + item + ", " + property + "," + oldValue + ")");
		}
    catch(e) {this.ELog("Exception in FolderListener.OnItemUnicharPropertyChanged {" + property + "}:\n" + e)};
	} ,
	
	OnItemPropertyChanged: function (item, property, oldValue, newValue) {
		const win = qfEvent.Util.getMail3PaneWindow(),
					util = win.quickFilters.Util;
		try {
			util.logDebugOptional("events","OnItemPropertyChanged( " + item + ", " + property + "," + oldFlag + "," + newFlag + ")");
		}
    catch(e) {this.ELog("Exception in FolderListener.OnItemPropertyChanged {" + property + "}:\n" + e)};
	},

	OnItemPropertyFlagChanged: function (item, property, oldFlag, newFlag) {
		const win = qfEvent.Util.getMail3PaneWindow(),
					util = win.quickFilters.Util;
		try {
			util.logDebugOptional("events","OnItemPropertyFlagChanged( " + item + ", " + property + "," + oldFlag + "," + newFlag + ")");
		}
    catch(e) {this.ELog("Exception in FolderListener.OnItemPropertyFlagChanged {" + property + "}:\n" + e)};
	} 
  */
}  // FolderListener
quickFilters.FolderListener.qfInstance = quickFilters;

// Custom Search Terms...
quickFilters.CustomTermReplyTo = {
  id: "quickFilters@axelg.com#replyTo",
  name: "Reply-To",
  getEnabled: function customTermReplyTo_getEnabled(scope, op) {
    return this._isLocalSearch(scope);
  },
  needsBody: false,
  getAvailable: function customTermReplyTo_getAvailable(scope, op) {
    return this._isLocalSearch(scope); // && Preferences.getBoolPref(customTermReplyToEnabled);
  },
  getAvailableOperators: function customTermReplyTo_getAvailableOperators(scope, length) {
    if (!this._isLocalSearch(scope)) {
      length.value = 0;
      return [];
    }
    length.value = 6;
    let nsMsgSearchOp = Components.interfaces.nsMsgSearchOp;
    return [nsMsgSearchOp.Contains, nsMsgSearchOp.DoesntContain, nsMsgSearchOp.Is, nsMsgSearchOp.Isnt, nsMsgSearchOp.BeginsWith, nsMsgSearchOp.EndsWith];
  },
  match: function customTermReplyTo_match(aMsgHdr, aSearchValue, aSearchOp) {
    // get custom header "replyTo"
    let replyTo = aMsgHdr.getStringProperty('replyTo'),
        matches = false,
        nsMsgSearchOp = Components.interfaces.nsMsgSearchOp;

    switch (aSearchOp) {
      case nsMsgSearchOp.Contains:
      case nsMsgSearchOp.DoesntContain:
        if (replyTo.indexOf(aSearchValue) != -1)
          matches = true;
        break;

      case nsMsgSearchOp.Is:
      case nsMsgSearchOp.Isnt:
        if (replyTo == aSearchValue)
          matches = true;
        break;

      case nsMsgSearchOp.BeginsWith:
        if (replyTo.indexOf(aSearchValue) == 0)
          matches = true;
        break;

      case nsMsgSearchOp.EndsWith:
        let index = replyTo.lastIndexOf(aSearchValue);
        if (index != -1 && index == (replyTo.length - aSearchValue.length))
          matches = true;
        break;

        default:
          Components.utils.reportError("invalid search operator in replyTo custom search term");
    }
    if (aSearchOp == nsMsgSearchOp.DoesntContain || aSearchOp == nsMsgSearchOp.Isnt)
      return !matches;
    return matches;
  },
  _isLocalSearch: function(aSearchScope) {
    const Ci = Components.interfaces;
    switch (aSearchScope) {
      case Ci.nsMsgSearchScope.offlineMail:
      case Ci.nsMsgSearchScope.offlineMailFilter:
      case Ci.nsMsgSearchScope.onlineMailFilter:
      case Ci.nsMsgSearchScope.localNews:
        return true;
      default:
        return false;
    }
  }
  
}; // CustomTermReplyTo

(function qf_addfolderlistener() {
	const IFL = Components.interfaces.nsIFolderListener;
  quickFilters.mailSession.AddFolderListener(quickFilters.FolderListener, 
	  IFL.event | IFL.added);
})();
// jcranmer suggest using  this
// quickFilters.notificationService.addListener(quickFilters.MsgFolderListener, Ci.nsIFolderListener.all);
quickFilters.addTagListener = function() {
	const util = quickFilters.Util;
  if (util) {
		util.logDebugOptional('listeners', "addTagListener()");
		// wrap the original method
		if (typeof ToggleMessageTag !== 'undefined') {
			if (!quickFilters.ToggleMessageTag) {
				const contextWin = util.getMail3PaneWindow();
				util.logDebugOptional('listeners','Wrapping ToggleMessageTag...');
				let originalTagToggler = contextWin.ToggleMessageTag;
				if (!originalTagToggler) {
					util.logToConsole("getMail3PaneWindow - Could not retrieve the original ToggleMessageTage function from main window:\n" + util.getMail3PaneWindow());
					return false; // let's short ciruit here
				}
				if (typeof originalTagToggler.fromQuickFilters !== 'undefined') {
					util.logDebug("quickFilters.addTagListener: ToggleMessageTag.fromQuickFilters already is set\n");
					return false;
				}
				contextWin.quickFilters.ToggleMessageTag = originalTagToggler; // should be the global function from Tb main Window
				
				ToggleMessageTag = function ToggleMessageTagWrapped(tag, checked) {
					if(quickFilters.Preferences.isDebugOption('listeners'))
						debugger;
					// call the original function (tag setter) first
					let tmt = contextWin.quickFilters.ToggleMessageTag;
					util.logDebugOptional('listeners', "ToggleMessageTagWrapped()"
					  + "\ncontextWin == win: " + (window == contextWin)
						+ "\ncontextWin.quickFilters == quickFilters: " + (contextWin.quickFilters == quickFilters)
						+ "\noriginalTagToggler == contextWin.quickFilters.ToggleMessageTag: " + (originalTagToggler == tmt)
						+ "\nToggleMessageTag == contextWin.quickFilters.ToggleMessageTag: "  + (ToggleMessageTag == tmt));
					contextWin.quickFilters.ToggleMessageTag(tag, checked);

					// no Assistant active - if current folder is the inbox: apply the filters.
					if (!quickFilters.Worker.FilterMode) {
						quickFilters.onApplyFiltersToSelection();
						return false;
					}

					if (checked) { // only if tag  gets toggle ON
						// Assistant is active?
						if (!quickFilters.Worker.FilterMode) return false;
						// make it possible to ignore tag changes.
						if (!quickFilters.Preferences.getBoolPref('listener.tags')) return false; 
						// ==> SetTagHeader(aConversation)
						let msgHdr;
						switch (util.Application) {
							case 'Postbox':
								// tag headers are rebuilt in Postbox (SetTagHeader function)
								let aConversation = messageHeaderSink._conversationMode;
								try {
									msgHdr = gDBView.hdrForFirstSelectedMessage;
								}
								catch (ex) {
									util.logDebug('Cannot react to tagging message as ' + tag + ': no Message Header found!');
									return false; // no msgHdr to add our tags to
								}
								break;
							default:
							  if (!gFolderDisplay.selectedMessages.length) return false;
							  msgHdr = gFolderDisplay.selectedMessages[0];
							  break;
						}

						let selectedMails = [];  // util.createMessageIdArray(targetFolder, messageUris);
						selectedMails.push(util.makeMessageListEntry(msgHdr)); // Array of message entries  ### [Bug 25688] Creating Filter on IMAP fails after 7 attempts ###
						contextWin.quickFilters.Worker.createFilterAsync_New(null, msgHdr.folder, selectedMails, 
																									Components.interfaces.nsMsgFilterAction.AddTag, 
																									tag,
																									false);
					}
					return true;
				} //  wrapper function for ToggleMessageTag
				util.logDebugOptional('listeners', "typeof ToggleMessageTag =" + typeof contextWin.ToggleMessageTag + "\n adding flag...");
			  contextWin.ToggleMessageTag.fromQuickFilters = true; // add a property flag to avoid recursion!
				util.logDebugOptional('listeners', "typeof ToggleMessageTag =" + typeof contextWin.ToggleMessageTag);
			}
		}

    return true; // early exit, no need for this in Tb/Sm
  }
  setTimeout(function() { quickFilters.addTagListener() } , 1000); // retry
  return false;
}

quickFilters.addTagListener();

