"use strict";

/* 
BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK 
*/


/*===============
  Project History
  ===============

  Note: All Dates here are given in UK format - dd/MM/yyyy

  Personnel:
  AG - Lead Developer and owner of the Mozdev project
  KB - head developer for Thunderbird 78 conversion

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

	3.4 : 11/12/2017
		# quickFilters Pro License!
	  # Make sure mails that are tagged manually are filtered immediately.
		# New: Option to insert new filter in alphabetical order
		# Added button to search for current folder's filters to QuickFolders' current folder toolbar
		# Removed obsolete option "Run Filters on all Mail" on the account properties dialog
		# Added Spanish locale (es) thanks to strel at Babelzilla
		# Added Argentinian locale (es-ar) thanks to Tonyman at Babelzilla
		# Completed Swedish Locale (sv-SE) thanks to Mikael Hiort af Ornäs, A. Regnander at Babelzilla
		# [Bug 26354] When merging / creating a filter, select "run on folder" automatically. This should be set to the specified account's inbox.

  3.4.1 : 19/12/2017
    # [Bug 26457] Auto processing of filters with tags when option is off
		  Something causes the filters to run automatically	(may be related to tags)
		# Added a checkbox for the auto filtering manually tagged messages
		
	3.4.2 : 25/12/2017
	  # Uniquified SHIM pathes to avoid side effects
		# Fixed a typo in Italian translation (on special request by Leopoldo Saggin)
		
	3.5 : 03/05/2018
	  # [Bug 25844] Add Backup + Restore Feature (Premium Feature)
		# [Bug 26488] ESR 2018 readiness - Make quickFilters compatible tB 60
		# [Bug 26477] Make quickFilters Postbox 5.52 beta6 compatible
		# SearchTerms Array changed from nsICollection to nsIMutableArray, following changes from comm-central
		# [Bug 26486] quickfilters-3.4.2 can't create Filter in Thunderbird versions < 47
		# main icon looks broken in brighttext mode (Thunderbird 60)
		
	3.6 / 3.6.1 : 16/06/2018
	  # [Bug 26542] quickFilters not defined in Postbox 5.0
		# [Bug 26543] Custom Templates: Support gathering address fields from multiple mails
		# Fixed version history jumping to correct version heading for Pro Users
		# Improved "Run Filters on Folder" function for non-Inbox folders.
		# [Bug 26545] Filter Merge should be triggered when emails are tagged
	  # [Bug 26548] Run Filters in folder context menu not working
		# [Bug 26549] Option to skip Filter Editor
		# Scroll current template into view
		# Fixed toolbar coloring + image in brighttext mode
		# 3.6.1 - Custom Templates: reading headers not working when moving mail to Local Folders. Wrote a workaround.
	
	3.7 : 05/10/2018
	  # [Bug 26547] Added default options for when filters are run
		# [Bug 26574] Filter Naming: Added configuration for customized delimiter character between folder and filter name
		# Moved links from addons.mozilla.org to addons.thunderbird.net
		# Added Unicode support to Custom Template Names
		# Description field is now automatically filled by the preselected template
		# [Bug 26579] Added message info panel in template dialog
		# [Bug 26582] Backup filters not working in Thunderbird 60. (gCurrentFolder not defined)
		
	3.8 : 01/01/2019
	  # [Bug 26625] New filters do not automatically run when getting mail. 
		  This problem was introduced in version 2.8 by not adding an important flag 
		  to the filter type, based on the new setting "Run Manually" 
		  (and later the additional settings in the "Apply Filter when" box)
      Use the new "Debug" button to track down and fix these filters.
		# Filters are now merged on import. When a filter is imported it will overwrite a filter 
		  of the same name, rather than creating a duplicate.
		# Fixed some layout problems (truncation) in filter assistant.

	3.8.1 : 09/01/2019
	  # When backing up filters with custom actions, this failed silently if necessary third 
		  party addons  were missing (e.g. FiltaQuilla). quickFilters will now display an error 
			message with a list of filters and custom actions that weren't fully saved.
		# Improved bug icon when faulty filters are found
		# Fixed: Message popups for running filters manually stopped closing automatically.
    # Fixed the license renewal link at the fastspring shop - it was broken and redirected to the QuickFolders homepage.
		
	3.9 : 13/02/2019
	  # from now on - show no more donation tab on update - handle all update news via change log (version history)
		# [Bug 26630] - quickFilters Assistant merge list too tall. Also dialog can grow too wide when certain templates are selected
		# [Bug 26192] - Improved "mailing list" template to use the "List-id" header, where available.
		# Added easier Renewal logic that reads the old license date and adds a whole year even when extending license early
		# Backup / Restore Filters will now remember the last folder pickd for loading / saving
		
	3.10 : 31/03/2019
	  # [Bug 26643] - Run filters on Local Folders Inbox automatically 
		# Create Filter from message: warn if email is still in inbox and also has no tags
		# [Bug 26649] - Creating a new "maillist" filter throws undeclared variable exception
		# Added skip 'filter rules' / 'filter list' options to the 'Create Filters' assistant window
		# Added support for navigation assistant screens using [Enter] key
		
	3.11 : 04/04/2019
	  # [Bug 26653] - Skipping filter list step in assistant ignores alphabetical order option
		# [Bug 26652] - Add option to Autorun filter (with filter list skipped option)
		# Removed some outdated code (extension manager)
	
	3.11.1 : 07/04/2019
	  # Completed Japanese locale - thanks to Masahiko Imanaka 
		# Completed Dutch locale - thanks to markh van BabelZilla.org [nl]
		# Also thanks to Leopoldo Saggin [it], A. Regnander + Mikael Hiort af Ornäs [sv-SE]
		
	3.12 : 11/05/2019
	  # [Bug 26657] ESR Readiness 2020 - Make compatible with Thunderbird 68
		# Replaced preferences dialog, groupbox elements with html fields. New AddonManager object
	  # made close button for premium notification visible again.
		
	3.12.2 : 14/05/2019	
	  # [Bug 26662] quickFilters 3.12 - Run Filters button not working on Thunderbird 60 
		
	3.12.3 : 15/05/2019	
	  # last official "Old school" release using install.rdf
		# [Bug 26663] Force secondary identity for licenses doesn't work.
		
	4.0.1 : 28/05/2019
	  # [Bug 26657] ESR Readiness (WIP):
	    Version 4.0 officially supports Thunderbird 68 beta, minimum version from now on will be Thunderbird 60
		# [Bug 26664] Merging filters - option to add condition on top instead of appending at bottom

  4.0.2: 01/06/2019
	  # [Bug 26668] "singleFilter is undefined" - this Error log is generated when using the run filters 
		  on folder command which may cause no filters to run at all. 
		# added compatibiliy code for Tb69 (createXULElement replaces createElement)
		
  4.0.3: 17/06/2019
		# Fixed the option "Run Filters on Local Folders" which was not stored in configuration when changed in the prefereences screen.
		# Moved the paste and validation buttons underneath the license key field.
	
	4.1: 30/08/2019
	  # [Bug 26695] Filter assistant buttons doesn't work. When clicking the filter assistant
		  button, assistant mode is not toggled on.
		# Added path validation of target folders (move to / copy to) to "debug filters" button.
		# Added custom action validations to "debug filters" button.
		# Fixed notification bars for Thunderbird 68.
		# Added support for the "run periodially" option (can be set as default for new filters).
		# Fixed some spacing issues with the licensing field / validation buttons.
		
	4.1.1 09/09/2019
	  # Run Filters on Folder button - stopped working because Thunderbird 
		  renamed mailServices to MailServices
	  # Improved labelling for troubleshooting button and "running filters on folder" notifications
	
  4.2 - 21/09/2019
    # The buttons on the QuickFolders "current folder toolbar" are not displayed anymore in Thunderbird 68
    # Custom filters: removing / avoiding own email addresses from new filter conditions is not working 
      in Custom Filters. This is now remedied. If you need to add your own email address to the filter conditions
      its probably a safe bet you would want to do it manually.
      
  4.3.1 - 13/12/2019
    # missing notifyBox can lead to problems when toggling assistant
    # premium feature: run filters local inbox didn't work depending on local folder hostname,
      changed method of determining whether an inbox is in local folders (to force filter running)    
    # made modification of toolbar more reliable
    # fixed licensing problem with accounts that have no default identity
    # [issue 2] Merged filters: some conditions not working
    
  4.4 - 09/06/2020 
    # [issue 12] Pro Feature: Add keyboard shortcuts for Run Filters buttons. 
      Default shortcuts are:
      Shift + F: Run Filters on folder
      Shift + R: Run Filters on selected mails
    # migrated support site from mozdev to quickfolders.org
    
  4.4.1 - 20/06/2020 
    # Fixed a layout problem in settings that caused some bad text characters showing at the top of the dialog.
      
  5.0 - WIP
    # [issue 14] make quickFilters compatible with THUNDERBIRD 78
    #            convert to web experiment
    #            subscribe to https://github.com/RealRaven2000/quickFilters/issues/14 for up-to-date news on this
    
   
  ============================================================================================================
  FUTURE WORK:
  PREMIUM FEATURES:
		# [Bug 26690] Add Extra Column In Filter Browser "Auto"
		# [Bug 26373] Sort definitions within a filter
    # [Bug 25409] Extended autofill on selection: Date (sent date), Age in Days (current mail age), Tags, Priority, From/To/Cc etc., (Full) Subject
    # [Bug 25801]	Assistant in Merge mode, cancel does not undo changes 
		
	 */
  
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
      setTimeout(function() { 
          quickFilters.checkFirstRun(); 
          quickFilters.addKeyListener();
        }, 1000);
        
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
    // disable assistant mode if it is active
    const filterWorker = quickFilters.Worker
    if (filterWorker.FilterMode) {
      // or we do 
      quickFilters.onToolbarButtonCommand();
      // filterWorker.toggleFilterMode(false, false);
    }
    // remove the event handlers!
  },

  showOptions: function showOptions() {
    window.openDialog('chrome://quickfilters/content/quickFilters-options.xhtml','quickfilters-options','chrome,titlebar,centerscreen,resizable,alwaysRaised,instantApply').focus();
  },

  checkFirstRun: function checkFirstRun() {
		let util = quickFilters.Util,
		    prefs = quickFilters.Preferences;
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
      let installedVersion = prefs.getCharPref("installedVersion"),
          firstRun = prefs.getBoolPref("firstRun");
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
        prefs.setBoolPref("firstRun", false);
        util.showHomePage();
      }
      else {
        // is this an update?
				let installedV = util.getVersionSimple(installedVersion),
				    currentV = util.getVersionSimple(currentVersion);
        if (currentVersion.indexOf("hc") ==-1) {
					if (util.versionLower(installedV, currentV)) { 	
						util.logDebug("update case: showing version history\n"
						            + "Current Version: " + installedV + "\n"
												+ "New Version: " + currentV);
						// silent updates (for all users)
						if (!(installedV.toString()=="3.4.1" && currentV=="3.4.2")) {
							util.showVersionHistory(false);
						}
					
					}
        }
				else { 
					util.logDebug("currentVersion not determined: " + currentVersion);
				}
        util.logDebug("store installedVersion: " + util.getVersionSimple(currentVersion));
        prefs.setCharPref("installedVersion", util.getVersionSimple(currentVersion));
      }
      this.firstRunChecked = true;
    }
    catch(ex) {
      util.logException("checkFirstRun failed", ex);
    }

  },

  onMenuItemCommand: function onMenuItemCommand(e, cmd) {
		const util = quickFilters.Util,
		      prefs = quickFilters.Preferences;
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
				if (util.Application=='Postbox' 
				    && 
						(typeof gFolderDisplay =='undefined' || !gFolderDisplay.selectedMessageUris)) {
					// old Postbox
				  selectedMessages = util.pbGetSelectedMessages();
          selectedMessageUris = util.pbGetSelectedMessageUris();
				}
				else {
				  selectedMessages = gFolderDisplay.selectedMessages; 
          selectedMessageUris = gFolderDisplay.selectedMessageUris;
				}
				// && selectedMessages[0].folder.server.canHaveFilters
				if (selectedMessages.length > 0 && selectedMessages[0].folder ) {
					// check the tags
					let firstSelectedMsg = selectedMessages[0],
					    tags = firstSelectedMsg.getStringProperty ? firstSelectedMsg.getStringProperty("keywords") : firstSelectedMsg.Keywords;
					if (firstSelectedMsg.folder.flags & util.FolderFlags.Inbox
							&& prefs.getBoolPref('warnInboxAssistant')
					    && (!tags || tags.length == 0 || tags.toLowerCase()=='nonjunk' || tags.toLowerCase()=='junk')
							) {
						// if email is still in inbox and also has no tags, warn about this
						let checkState = { value: false },
						    promptTxt =  util.getBundleString("quickfilters.createFromMail.inboxWarning",
									"Create filter from message is much more useful if you have already moved " +
									"the mail to a different folder or added a tag to it, as quickFilters " +
									"will then select the appropriate Action for you.\n" +
									"Still create a filter from this message?"),
								ans = Services.prompt.confirmCheck(null, 
								"quickFilters", 
						    promptTxt, 
								util.getBundleString("quickfilters.promptDontRepeat", "Do not show this message again."),
								checkState);
						if (checkState.value==true) {
							prefs.setBoolPref('warnInboxAssistant', false); // disable warning for the future
						}
						if(!ans) return; // early exit
					}
					
					
				  // ### [Bug 25688] Creating Filter on IMAP fails after 7 attempts ###
          for (let m=0; m<selectedMessages.length; m++) {  // ### Bug 25727 Allow to create Group Filter with "Create Filter from Message" menu
            messageList.push(util.makeMessageListEntry(selectedMessages[m], selectedMessageUris[m])); 
          }
				  // the original command in the message menu calls the helper function MsgCreateFilter()
					// we do not know the primary action on this message (yet)
					let currentMessageFolder = util.getCurrentFolder();
					if (util.isVirtual(currentMessageFolder)) {
					  if (firstSelectedMsg.folder)  // find the real folder!
							currentMessageFolder = firstSelectedMsg.folder;
          }					
					quickFilters.Worker.createFilterAsync_New(null, currentMessageFolder, messageList, null, false);
				}
				else {
				  let wrn = util.getBundleString("quickfilters.createFromMail.selectWarning",
						"To create a filter, please select exactly one email!");
				  util.popupAlert(wrn);
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

  onApplyFilters: function onApplyFilters(silent) {
		// from FilterListDialog.js
		function getFilterFolderForSelection(aFolder) {
			let rootFolder = aFolder && aFolder.server ? aFolder.server.rootFolder : null;
			if (rootFolder && rootFolder.isServer && rootFolder.server.canHaveFilters)
				return (aFolder.server.type == "nntp") ? aFolder : rootFolder;

			return null;
		}
		

		// does this work in non-inbox current folder?
    // Get the folder where filters should be defined, if that server
    // can accept filters.
		const util = quickFilters.Util,
					Ci = Components.interfaces,
					Cc = Components.classes,
					filterService = Cc["@mozilla.org/messenger/services/filters;1"].getService(Ci.nsIMsgFilterService);

		var {MailServices} = 
		  (util.versionGreaterOrEqual(util.AppverFull, "64")) ?
				ChromeUtils.import("resource:///modules/MailServices.jsm") : // new module spelling
				Components.utils.import("resource:///modules/mailServices.js", {});
					
		if (util.isDebug) debugger;
		let folder = util.getCurrentFolder(),
        firstItem = getFilterFolderForSelection(folder),
		    folders = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray),
				msgWindow = Cc["@mozilla.org/messenger/msgwindow;1"].createInstance(Ci.nsIMsgWindow)
				
		// from  MsgApplyFiltersToSelection()
		if (!silent && quickFilters.Preferences.getBoolPref('notifications.runFilter')) {
			let text = quickFilters.Util.getBundleString('quickfilters.runningFiltersOnFolder.notify', 'Running filters on folder {1}');
			util.slideAlert(text.replace("{1}",folder.prettyName), 'quickFilters');
		}		

		if (util.isDebug) debugger;
		if (folder.flags & util.FolderFlags.Inbox) {
			// goDoCommand('cmd_applyFilters'); // same in Postbox
			MsgApplyFilters();
		}
		else {
			// see mailWindowOverlay.js - MsgApplyFilters()
			//	MsgApplyFilters();
			// If the selected server cannot have filters, get the default server
			// If the default server cannot have filters, check all accounts
			// and get a server that can have filters.
			
			let curFilterList = folder.getFilterList(msgWindow);
			// create a new filter list and copy over the enabled filters to it.
			// We do this instead of having the filter after the fact code ignore
			// disabled filters because the Filter Dialog filter after the fact
			// code would have to clone filters to allow disabled filters to run,
			// and we don't support cloning filters currently.
			let tempFilterList = MailServices.filters.getTempFilterList(folder),
			    numFilters = curFilterList.filterCount,
					selectedFolders = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
			selectedFolders.appendElement(folder, false);
			// make sure the temp filter list uses the same log stream
			tempFilterList.logStream = curFilterList.logStream;
			tempFilterList.loggingEnabled = curFilterList.loggingEnabled;
			let newFilterIndex = 0;
			try {
				for (let i = 0; i < numFilters; i++) {
					let curFilter = curFilterList.getFilterAt(i);
					// only add enabled, UI visibile filters that are in the manual context
					if (curFilter.enabled && !curFilter.temporary &&
							(curFilter.filterType & Components.interfaces.nsMsgFilterType.Manual))
					{
						tempFilterList.insertFilterAt(newFilterIndex, curFilter);
						newFilterIndex++;
					}
				}
			}
			catch (ex) {
				util.logException(ex);
			}
			if (util.isDebug) debugger;
			MailServices.filters.applyFiltersToFolders(tempFilterList, selectedFolders, msgWindow);
		}
  },
  
  onApplyFiltersToSelection: function onApplyFiltersToSelection(silent) {
    goDoCommand('cmd_applyFiltersToSelection'); // same in Postbox
		if (!silent && quickFilters.Preferences.getBoolPref('notifications.runFilter')) {
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
      const FA = Ci.nsMsgFilterAction,
						accountList = util.Accounts;
			for (let a=0; a<accountList.length; a++) {  
				let account = accountList[a];
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
      util.popupProFeature("searchFolder", true);
    }
  },

  LocalErrorLogger: function LocalErrorLogger(msg) {
    let Cc = Components.classes,
        Ci = Components.interfaces,
        cserv = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
    cserv.logStringMessage("quickFilters:" + msg);
  },

  onFolderTreeViewDrop: function onFolderTreeViewDrop(aRow, aOrientation) {
    const Cc = Components.classes,
        Ci = Components.interfaces,
				util = quickFilters.Util,
        treeView = quickFilters.folderTreeView;
		let worker = quickFilters.Worker,
        dataTransfer,
        dragSession;
		util.logDebugOptional("events,msgMove", "onFolderTreeViewDrop");
    dataTransfer = treeView._currentTransfer;

    // let array = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
    let types = dataTransfer.mozTypesAt(0);  // one flavor
    if (!types.contains("text/x-moz-message") || (!worker.FilterMode))
      return;

    let targetFolder = treeView._rowMap[aRow]._folder.QueryInterface(Ci.nsIMsgFolder);

    let sourceFolder,
        messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger),
        messageUris = [];
    for (let i = 0; i < dataTransfer.mozItemCount; i++) {
      let messageUri = dataTransfer.mozGetDataAt("text/x-moz-message", i);

      if (!i) {
        let msgHdr = messenger.msgHdrFromURI(messageUri);
        sourceFolder = msgHdr.folder;
      }

     //dataObj = dataObj.value.QueryInterface(Ci.nsISupportsString);
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
					  isMove ? Ci.nsMsgFilterAction.MoveToFolder : Ci.nsMsgFilterAction.CopyToFolder,
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
    if (!types.contains("text/x-moz-message") || (!worker.FilterMode))
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
  
  // read QF options and hide buttons from current folder bar
  toggleCurrentFolderButtons: function toggleCurrentFolderButtons() {
    // options:
    //   quickfolders.curFolderbar.listbutton
    //   quickfolders.curFolderbar.folderbutton
    //   quickfolders.curFolderbar.messagesbutton
    let prefs = quickFilters.Preferences,
        util = quickFilters.Util,
        win = util.getMail3PaneWindow();
    util.logDebug('toggleCurrentFolderButtons()');
    try {
      // in tb 68 we need to move the buttons into the correct place first,
      let btnList = win.document.getElementById('quickfilters-current-listbutton');
			if (btnList) { 
        let injected = win.document.getElementById('quickFilters-injected'),
            btnRun = win.document.getElementById('quickfilters-current-runbutton'),
            btnMsgRun = win.document.getElementById('quickfilters-current-msg-runbutton'),
            btnSearch = win.document.getElementById('quickfilters-current-searchfilterbutton');
            
        if (injected)  { // Thunderbird 68 specific part.
          // insert after QuickFolders-currentFolderFilterActive
          let toolbar = win.document.getElementById('QuickFolders-CurrentFolderTools');
          if (toolbar) {
            let refNode = win.document.getElementById('QuickFolders-Options');
            toolbar.insertBefore(btnList, refNode);
            toolbar.insertBefore(btnRun, refNode);
            toolbar.insertBefore(btnMsgRun, refNode);
            toolbar.insertBefore(btnSearch, refNode);
          }
        }
				btnList.collapsed = !prefs.getBoolPref('quickfolders.curFolderbar.listbutton');
				btnRun.collapsed = !prefs.getBoolPref('quickfolders.curFolderbar.folderbutton');
				btnMsgRun.collapsed = !prefs.getBoolPref('quickfolders.curFolderbar.messagesbutton');
				btnSearch.collapsed = !prefs.getBoolPref('quickfolders.curFolderbar.findfilterbutton');
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
						selectedMessages = gFolderDisplay.selectedMessages,
						selectedMessageUris = gFolderDisplay.selectedMessageUris,
						messageList = [];
            
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
  
  windowKeyPress: function windowKeyPress(e,dir) {
    const util = quickFilters.Util,
          prefs = quickFilters.Preferences,
          isRunFolderKey = prefs.isShortcut("folder"),
          isSelectedMailsKey = prefs.isShortcut("mails");
		let isAlt = e.altKey,
		    isCtrl = e.ctrlKey,
		    isShift = e.shiftKey,
        eventTarget = e.target,
        isHandled = false, 
				isShortcutMatched = false; 
          
    // shortcuts should only work in thread tree, folder tree and email preview (exclude conversations as it might be in edit mode)
    let tag = eventTarget.tagName ? eventTarget.tagName.toLowerCase() : '';
    if (   eventTarget.id != 'threadTree' 
        && eventTarget.id != 'folderTree'
        && eventTarget.id != 'accountTree'
        && (
          (tag
            &&       
            (tag == 'textarea'  // Postbox quick reply
            ||
            tag == 'textbox'    // any textbox
            ||
            tag == 'input'      // Thunderbird 68 textboxes.
						||
						tag == 'findbar')   // [Bug 26654] in-mail search
          )
					||
					(eventTarget.baseURI 
					  &&
					 eventTarget.baseURI.toString().lastIndexOf("chrome://conversations",0)===0)
				)
       )
    {
      return; // NOP
    }
    
    if (window) {
      let tabmail = window.document.getElementById("tabmail"),
          selectedTab = util.tabContainer.selectedIndex,
          tabMode = null;
      if (selectedTab>=0) {
        let tab = util.getTabInfoByIndex(tabmail, selectedTab);
        if (tab) {
          tabMode = util.getTabMode(tab);  // test in Postbox
          if (tabMode == "glodaSearch" && tab.collection) { //distinguish gloda search result
            tabMode = "glodaSearch-result";
          }
        }
        else {
          if (!tabmail.tabInfo.length)
            tabMode = "3pane";
          else
            tabMode = ""; 
        }      
      }
      if ((tabMode == 'message' || tabMode == 'folder' || tabMode == '3pane')) {
				let isShiftOnly = !isAlt && !isCtrl && isShift && dir!='up',
            isNoAccelerator = !isAlt && !isCtrl && !isShift && dir!='up',
				    theKeyPressed = (String.fromCharCode(e.charCode)).toLowerCase();
        if (isRunFolderKey) {
          if (isShiftOnly && theKeyPressed == prefs.getShortcut("folder").toLowerCase()) {
            util.logDebug("detected: Shortcut for Run filters on Folder");
            quickFilters.onApplyFilters();
            return; 
          }
        }
        if (isSelectedMailsKey) {
          if (isShiftOnly && theKeyPressed == prefs.getShortcut("mails").toLowerCase()) {
            util.logDebug("detected: Shortcut for Run filters on Selected Mails");
            quickFilters.onApplyFiltersToSelection();
            return; 
          }
        }
      }
    }
  } ,
  
	// this is the wrapped MsgMoveMessage
	executeMoveMessage: null  

}; // quickFilters MAIN OBJECT

// mail3pane events

//if (document.getElementById('messengerWindow').getAttribute('windowtype') === "mail:3pane") {
// adding the SetTimeOut for debugging this!
//  window.addEventListener("load", function () { setTimeout( function () {quickFilters.onLoad()}, 30000 ) }, false);
//78  window.addEventListener("load", function () { quickFilters.onLoad(); }, false);
//78  window.addEventListener("unload", function () { quickFilters.onUnload(); }, false);
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
	localMoved: [],
  qfInstance: quickFilters,
  ELog: function(msg) {
    try {
      try {
				Components.utils.reportError(msg);
			}
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
    
      const win = qfEvent.Util ? qfEvent.Util.getMail3PaneWindow() : quickFilters.Util.getMail3PaneWindow(),
            util = win.quickFilters.Util,
						prefs = win.quickFilters.Preferences,
            worker = win.quickFilters.Worker,
						logDebug = util.logDebugOptional.bind(util);
						
	    logDebug("events,msgMove","OnItemAdded() " + item.toString());  	
						
			if (prefs.getBoolPref('localFoldersRun') && util.isLocalInbox(parent)) {
				// make a stack of moved messages to work through
				let h = item.QueryInterface(Ci.nsIMsgDBHdr);
				// avoid duplicates
				if (!quickFilters.FolderListener.localMoved.find(o => o.messageKey == h.messageKey)) {
          util.logDebugOptional("msgMove", "Adding 1 message to list of localMoved");
					quickFilters.FolderListener.localMoved.push(
					{ hdr: h,
						key: h.messageKey}
					);
				}
			}
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
      const win = qfEvent.Util ? qfEvent.Util.getMail3PaneWindow() : quickFilters.Util.getMail3PaneWindow(),
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
          let isAssistant = worker.FilterMode,
              srcName = (item ? (item.prettyName ? item.prettyName : item) : '<no folder>')
              
          util.logDebugOptional("events,msgMove","DeleteOrMoveMsgCompleted(" + 
            srcName + ")\n" +
            'Assistant is ' + (isAssistant ? 'active' : 'off'));
          let isLocal = util.isLocalInbox(item);
          util.logDebugOptional("msgMove", "Source folder (" + srcName + ") is local inbox = " + isLocal);
					if (!isAssistant && !util.isLocalInbox(item)) { // item is the source folder (usually another inbox, not local folders)
					let LM = quickFilters.FolderListener.localMoved;
          util.logDebugOptional("msgMove", "List of LocalMoved = " + (LM ? (LM.length + " items.") : "NULL!"));
						if (LM.length) {
							let target = LM[0].hdr.folder;
							util.logDebugOptional("msgMove", "Running filters on " + LM.length + " messages in " + target.prettyName + "...");
							while (LM.pop()); // empty array
							setTimeout(function() { 
									util.applyFiltersToFolder(target); 
									util.popupProFeature("localFolderFilters", true);    
								}, 25
							);
						}
					}
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

// [issue 12] shortcuts for run filter buttons.
quickFilters.addKeyListener = function() {
  const util = quickFilters.Util,
	      prefs = quickFilters.Preferences;
  if (util.isDebug) debugger;
  let isRunFolderKey = prefs.isShortcut("folder"),
      isSelectedMailsKey = prefs.isShortcut("mails");
      
  if (isRunFolderKey || isSelectedMailsKey) {
    const win = util.getMail3PaneWindow();
      // check main instance 
      let main = win.quickFilters;
      if (!main.isKeyListener) {
        win.addEventListener("keypress", this.keyListen = function(e) {
          main.windowKeyPress(e,'down');
        }, true)    
        win.quickFilters.isKeyListener = true;
      }
  }
};

// jcranmer suggest using  this
// quickFilters.notificationService.addListener(quickFilters.MsgFolderListener, Ci.nsIFolderListener.all);
quickFilters.addTagListener = function() {
	const util = quickFilters.Util,
	      prefs = quickFilters.Preferences;
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
					if(prefs.isDebugOption('listeners'))
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
					// Bug 26457 - disable this behavior by default
					if (!quickFilters.Worker.FilterMode && prefs.isDebugOption('listener.tags.autofilter')) {
						quickFilters.onApplyFiltersToSelection(true); // suppress the message
						return false;
					}

					if (checked) { // only if tag  gets toggle ON
						// Assistant is active?
						if (!quickFilters.Worker.FilterMode) return false;
						// make it possible to ignore tag changes.
						if (!prefs.getBoolPref('listener.tags')) return false; 
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

