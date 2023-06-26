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
  AG - Axel Grude - Lead Developer, Marketing and owner of this project
  KB - Klaus Buecher - Head Developer for Thunderbird 78 conversion
  RM - Richard Marti - Icon Design + Layout Tb78

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
    # Added Postbox Compatibility.
    # Improved integration with QuickFolders
    # Compatibility change for Tb 24 / Sm2.17 (nsIMsgAccountManager.accounts changed from nsIMutableArray to nsIArray)
    # Added donate button to settings dialog
    # (TBD: rename toggleFilter to avoid false validation warnings ??)
    
  2.1 : 27/11/2013
    # improved function that copies filter conditions - copies used to be dependant on their originals
    # [FR 25627] - new template for Group of People (add more than one email-adress) 
    # [FR 25582] - Allow cloning Filters within the same Mail Account 
    # widened template list to avoid filter titles being cut off
    # fixed a problem in onCloseNotification - Postbox had trouble removing the sliding notification
    # made debug settings (on right-clicking debug checkbox) settings filter more reliable (it sometimes did not work at all) 
    
  2.2 : 30/12/2013
    # make it possible to disable donation screen displayed on update by rightclicking the donate button
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
      Something causes the filters to run automatically (may be related to tags)
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
      
  5.0 - 29/11/2020
    # [issue 14] make quickFilters compatible with THUNDERBIRD 78
    #            convert to web experiment
    #            subscribe to https://github.com/RealRaven2000/quickFilters/issues/14 for up-to-date news on this
    # [issue 39] Rewrite "Reply-To" custom condition to work without bindings.
    # [issue 33] Copy  / move mail context menu broken with quickfilters
    # [issue 27] Filter creation (merging) window not sized constrained when many test items.
    # [issue 26] "Next Steps" does not over-ride "Settings/Actions."
   
  5.0.1 - 01/12/2020
    # 5.0.1 - fixed the broken options screen that comes up on Add-ons Manager. You cannot currently open options from there. 
      Please use the tools / addons menu or right-click the main icon (quickFilters assistant) on the toolbar
      
  5.0.2 - 02/12/2020
    # Add-on was broken (no toolbar buttons / options dialog) for Spanish and Hungarian users due to a problem with localisation  
    
  5.1 - 27/02/2021
    # Filter Editor: The reply-to field can be broken / disabled if certain character combinations are used 
    #     (usually involving parentheses or angle brackets)
    # [issue 41] Merge filters (at least manually) is broken
    # [issue 42] All cut / copied filters in list should be highlighted with icon
    # [issue 44] Folder names default delimiter shows black diamond �  instead »
    # Improved reopening any support sites already open in a tab by jumping to the correct place if necessary
    
  5.2 - 06/04/2021
    # [issue 11] Feature request: Sort Search Terms in a filter
    # [issue 20] allow pasting filters multiple accounts across different accounts.
    # [issue 51] Merging filters can lead to duplicate conditions
    # [issue 52] Own Emails are not automatically suggested for merging when using context menu
    # [issue 23] Avoid Empty Conditions list due to removed recipients - filter cannot be edited
    # [issue 47] Using the %subject% placeholder in custom templates doesn't work in Assistant
    # Moved settings from tools menu to Add-on Manager (according to standard)
    # [issue 48] Make quickFilters compatible with Thunderbird 87 beta (ongoing):
      - open sites in tab was broken because of modified openTab parameters
      - search terms now in a different type of collection can lead to failures when defining new filters.
      
  5.3 - 04/08/2021
    # Using notifyTools for updating UI via background page (mail extension conversion)
    # [mx l10n] Use new localization method (json files, more robust and compatible with mx)
    # [issue 66] On some machines, quickFilters is not loading at startup (due to accounts not loading)
    # Completed Argentinian Locale using strings from the Spanish one
    # Added Finnish, Portuguese and Polish translations (using google translate)
    # [issue 67] Added colored icons and theme support in message filter list toolbar
    # [issue 20] Remember Copied filters List to insert to other Accounts multiple times
    # Hiding / showing the toolbar in filter list is now instant
    # Removed obsolete legacy locale files (12 languages * 9 = 108 files) and merged into messages.json
    # Replaced links to expired mozdev.org to the archived bugs at quickfolders.org
    # Restricted  special search types in filter list to licensed users
    # Tb 91: Removed deprecated fixIterator function from findInboxFromRoot() function
    # Tb 91: Fixed missing icons on sliding notification bars
    # Tb 91: Fixed style of [Buy License] button at bottom of settings dialog
    # Tb 91: Fixed missing "about:config" dialogs
    
  5.3.1 - 06/08/2021
    # Link on the registration screen in 5.3 accidentally directed to buy a QuickFolders license. Fixed in version 5.3.1.
    # License validation didn't tell if license failing - fixed in 5.3.1
    
  5.3.2 - 20/08/2021
    # removed "workaround" experimental APIs (notifications, accounts)
    # Link to premium features directed to QuickFolders site, not quickFilters!
    # Fixed instant link to shopping page for quickFilters domain licenses
    
  5.4 - 04/02/2022
    # Fixed alias identity algorithm
    # [issue 89] Create filter by subject - option to insert the full subject if [string] in line
    # [issue 77] When copying an email during assistant, the action "Copy to Folder" should be set + populated
    # [issue 90] Fixed: When uninstalling / updating quickFilters, toggling tags may fail
    # [issue 92] UI to view license extension longer than 1 month before expiry of Pro license
    
  5.5 - 30/05/2022
    # fixed notification dialogs for Thunderbird 99 and higher.
    # fixed notification image for Thunderbird 91 
    # fixed icon on OS notification (Run filters on folder / selected mails...)
    # fixed "copy" icon in filter list removed in TB102
    # added help panel for custom template switch in settings / advanced
    # added help panel in custom template editor that explains the placeholder action "set priority to normal"
    # added domain modifiers to custom template editor
    # [issue 100] Improve location of added toolbar buttons when installing quickFilters
    # [issue 101] Betterbird: With 2-way addresses make sure "any" operator is selected.
    # [issue 104] Filter Rules sorting - fails if no quickFilters Pro license
    # [issue 105] Backup of Custom Templates (Local Folders) does not store placeholders correctly
    
  5.5.1 - 30/05/2022
    # removed debugger statements
  
  5.5.4 - 07/06/2022
    # Added improved Italian translation by Pol Hallen 
    # [issue 107] Existing "Reply-To" conditions cannot be edited (no text field displayed in Tb 91)
    # [issue 108] Fixed: Edit fields of custom search term "Reply-To" is not displayed in Thunderbird 102
    # [issue 109] Adding "Reply To" parts in Custom Template Editor fails with an error
    # [issue 110] Added an option to disable removing own email addresses (mainly for testing)
    # Added a help panel in custom template editor that explains the placeholder action "set priority to normal"
    # Added more transparency for features that require a Pro license.    
    
  5.6 - 16/10/2022
    # Fixed toolbar Icon colors for Thunderbird 102
    # [issue 102] WIP: Support mixed "any" / "all" filters with mail clients that do (Betterbird 91.8)
    # [issue 123] Clicking Sort leads to empty search terms (Thunderbird 102 regression)
    # Updated support website
    # [issue 125] Support license validation with Exchange accounts (from Tb 102)
    # Improved default filter name for starred messages.
    # [issue 316] improved integration of buttons on QuickFolders' current folder bar (requires QF 5.14 or higher)
    
  5.7 - 22/12/2022
    # [issue 132] Avoid accidentally running filters through Shortcut, add confirmation dialog
    # [issue 133] Reply-To filter is case sensitive - should be case insensitive
    # [issue 140] Support creating filters that move mail to another inbox
    # enable running filters (on appropriate inbox) if server node is selected in folder tree
    # Made reading mail headers (and create filter functions) asynchronous for future stability
    # fixed: help text of tooltip (e.g. actions in filter editor) not readable in dark themes
    # WIP: remove sync-stream-listener which will go away in future versions of Thunderbird
    #   https://searchfox.org/comm-central/rev/9385c66c25d39efe2d7ccfcdb3a9b079da8d4b71/mail/components/extensions/parent/ext-messages.js#255-320
    # Remove monkey patch code for Tb move mail commands (MsgCopyMessage)
    # Improved filter naming for standard Tag actions

  5.7.1 - 26/12/2022
    # [issue 142] Assistant triggered when emails are deleted
    # [issue 143] Assistant triggered by filters that execute moving / copying mail 


  5.8 - 16/02/2023
    # [issue 146] Added link to github for bug reports on support tab
    # [issue 149] Fixed: Sorting filter items resurrects deleted search terms
    # [issue 145] Allow assistant trigger when deleting or moving mail to Junk
    #             also add switch to support Archives (with FiltaQuilla only)
    # New: Store only highlighted filters using Backup Button + CTRL key
    # [issue 152] Restored Monkey patch changes, to avoid crashes on some systems
    # Removed Service wrappers for nsIWindowMediator, nsIPrefBranch, nsIPrefService, nsIPromptService, nsIConsoleService,
    #                              nsIStringBundleService, nsIXULAppInfo, nsIWindowWatcher, nsIVersionComparator, nsIXULRuntime
    # [issue 138] Fixed message filters button for Thunderbird 110 beta and later
    # Allow matching folders for Merge when captialization of folder name(s) hase changed

  5.8.1 - 18/02/2023
    # [issue 160] Ctrl-A (Select All) shortcut key no longer working in version 5.8
    # [issue 161] Merging to a filter with "Subject" template breaks filter 
    # [issue 163] Troubleshooter: in step one, only flag enabled filters that have no valid way of running
    # (asyncified all calling functions) to call asynchronous function Util.copyTerms correctly
    # Removed shim code for searchTerm array (Tb91 and later) util.querySearchTermsArray, util.querySearchTermsAt, util.querySearchTermsLength
    # Avoid breaking filters with the wrong operator (any / all)


  5.9 - 28/03/2023
    # Remove monkey patch code for tag changes
    # [issue 167] Simplify opting out of expired license - unblock assistant button
    # [issue 164] Disable assistant when dragging mail from special folders: Queue | Templates | Drafts | Trash
    # [issue 166] Remove donate button from assistant dialog for licensed users
    # [issue 170] Repaired option to add new rules (merge) to existing filters on the top 
    # [issue 171] Added a warning if the quickFilters license is about to expire (displayed 10 days before).

  5.9.1 - 09/04/2023
    # [issue 172] Missing quickFilters buttons on QuickFolders Current Folder Bar (Linux)
    # [issue 175] quickFilters buttons don't work when dragging from customize toolbar 
    # [issue 177] Added pricing section to license dialog. 
    # Added Czech translation to license dialog.
    # to encourage license renewals: Show bargain section in splash screen if <=10 days to expiry
    
  5.9.2 - 25/06/2023
    # [issue 185] Custom Template fail reading header fields from email (inserts ??)
    # [issue 182] Add explanation to the "New filter Properties" page in settings 
    # Ensure to disable assistant on onload
    # [issue 178] Correct the Number of days left in license by rounding up
    # do not trigger "news" unless min ver changes at least.
    
  6.0 - WIP
    # [issue 181] Version compatibily with Thunderbird 115 (SuperNova UI)
    # - new browser action button
    # - messageServiceFromURI moved to MailServices
    # - richtlistbox.insertItemAt deprecated
    # - all commands are now in unified toolbar dropdown menu
    # - adjusted styles for news / license warning menu items for better visibility
    # option to disable notification after running filters manually (quickFilters Pro)

  6.x - TO DO
    # convert settings to html / Thunderbird tab
    # "Create Filter from message" context menu item
   
  ============================================================================================================
  FUTURE WORK:
  PREMIUM FEATURES:
    # [Bug 26690] Add Extra Column In Filter Browser "Auto"
    # [Bug 25409] Extended autofill on selection: Date (sent date), Age in Days (current mail age), Tags, Priority, From/To/Cc etc., (Full) Subject
    # [Bug 25801] Assistant in Merge mode, cancel does not undo changes 
    
   */

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var {MailServices} = ChromeUtils.import("resource:///modules/MailServices.jsm");
    
var quickFilters = {
  Properties: {},
  _folderTree: null,
  strings: null,
  initialized: false,
  firstRunChecked: false,
  firstRunCount: 0,
  quickFilters_originalDrop: null,
  isNewAssistantMode: false,  /* restore monkey patch */
  isLoading: false,
  get notificationService() {
    return MailServices.mfn; //nsIMsgFolderNotificationService
  },
  
  /*******
  as we cannot add quickFilters_originalDrop to folderTree
  Error: Cannot modify properties of a WrappedNative = NS_ERROR_XPC_CANT_MODIFY_PROP_ON_WN
  **/


  get folderTree() {
      
    return  document.getElementById('folderTree');
  },

  get folderTreeView() {
    try {
      if (!this.folderTree) {
        this.folderTree = document.getElementById('folderTree');
      }
  
      if (this.folderTree.tagName=="ul")  {  // Thunderbird 112+
        if (gFolderDisplay && gFolderDisplay.tree) { 
          return gFolderDisplay.tree.view;
        }
      }
    }
    catch (ex) {
      console.log ("quickFilters - get folderTreeView() failed", ex)
    }
    return null;
  },

  onLoadQuickFilters: async function() {
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

// TEST CODE...      
      let folderTrees = [];
      window.gTabmail.tabInfo.filter(t => t.mode.name == "mail3PaneTab").forEach(tabInfo => { 
        folderTrees.push(tabInfo.chromeBrowser.contentWindow.document.getElementById("folderTree")) 
      });       
      // new drop handler, see
      // https://searchfox.org/comm-central/source/mail/base/content/about3Pane.js#1806
      // folderPane._onDrop

      // window.gTabmail.tabInfo[0].chromeBrowser.contentWindow.folderPane._onDrop(event)

/*    
      // Original Code (Tb <= 111)
      let tree = quickFilters.folderTree,
          treeView = quickFilters.folderTreeView;

      if (tree && !tree.quickFilters_originalDrop) {  
        tree.quickFilters_originalDrop = treeView.drop;
        if (tree.quickFilters_originalDrop) {
          // new drop function, wraps original one
          let newDrop = function (aRow, aOrientation) {
            if (quickFilters.Util.AssistantActive) {  
              try { 
                debugger;
                quickFilters.onFolderTreeViewDrop(aRow, aOrientation); 
              }
              catch(e) {
                util.logException("quickFilters.onFolderTreeViewDrop FAILED\n", e);
              }
            }
            // fix "too much recursion" error!
            tree.quickFilters_originalDrop.apply(treeView, arguments);
          }
          treeView.drop = newDrop;
        }
      }
*/
      this.initialized = true;
 
      // for move to / copy to recent context menus we might have to wrap mailWindowOverlay.js:MsgMoveMessage in Tb!
      if (quickFilters.Preferences.getBoolPref("autoStart") &&  !quickFilters.Util.AssistantActive) {
        util.logDebugOptional("events","setTimeout() - toggle_FilterMode");
        setTimeout(function() { quickFilters.Worker.toggle_FilterMode(true, true);  }, 100);
      }

      if (!quickFilters.doCommandOriginal) {
        quickFilters.doCommandOriginal = DefaultController.doCommand;
        DefaultController.doCommand = quickFilters.doCommandWrapper;
      }


      // Add Custom Terms... - only from next version after 2.7.1 !
      if (quickFilters.Preferences.getBoolPref('templates.replyTo')) {
        try {
          let customId = quickFilters.CustomTermReplyTo.id,
              filterService = MailServices.filters; // nsIMsgFilterService
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
        }, 1000);
        
      quickFilters.Util.notifyTools.notifyBackground({ func: "toggleCurrentFolderButtons" }); 
      quickFilters.Util.notifyTools.notifyBackground({ func: "updatequickFiltersLabel"}); // initialize the button in case there was an ignored update!
    }
    catch(ex) {
      quickFilters.Util.logException("quickFilters.onLoadQuickFilters failed", ex);
    }
    finally {
      this.isLoading = false;
      util.logDebugOptional("events,listeners", "quickFilters.onLoadQuickFilters - ends");
    }
    
  },

  onUnload: function onUnload() {
    // disable assistant mode if it is active
    if (quickFilters.Util.AssistantActive) {
      quickFilters.Worker.toggle_FilterMode(false); 
    }

    if (quickFilters.doCommandOriginal) {
      DefaultController.doCommand = quickFilters.doCommandOriginal;
      quickFilters.doCommandOriginal = null;
    }

    // remove the event handlers!
  },

  patchFolderTree: function(tabInfo) { 
    let fPane = tabInfo.chromeBrowser.contentWindow.folderPane;
    if (fPane && !fPane.quickFilters_originalDrop) {
      fPane.quickFilters_originalDrop = fPane._onDrop;
      let newDrop = function (event) {
        if (quickFilters.Util.AssistantActive) {  
          try { 
            quickFilters.onFolderTreeViewDrop(event); 
            quickFilters.Util.logDebug("Drop event detected!");
          }
          catch(e) {
            quickFilters.Util.logException("quickFilters.onFolderTreeViewDrop FAILED\n", e);
          }
        }
        fPane.quickFilters_originalDrop.apply(fPane, arguments); // call original drop function.
      }
      fPane._onDrop = newDrop;
    }
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
      let installedVersion = prefs.getCharPref("installedVersion"),
          firstRun = prefs.getBoolPref("firstRun");
      util.logDebug("firstRun = " + firstRun + "  - currentVersion = " + currentVersion + "  - installed = " + installedVersion);
      let toolbarId = '';
      if (firstRun) {
        toolbarId = "mail-bar3";
        util.installButton(toolbarId, "quickfilters-toolbar-button");
        util.installButton(toolbarId, "quickfilters-toolbar-listbutton", "quickfilters-toolbar-button");
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
              util.showVersionHistory();
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

  onMenuItemCommand: function onMenuItemCommand(cmd) {
    const util = quickFilters.Util,
          prefs = quickFilters.Preferences;
    switch(cmd) {
      case 'toggle_Filters':
        quickFilters.Worker.toggle_FilterMode(!quickFilters.Util.AssistantActive); 
        break;
      case 'createFilterFromMsg':
        let selectedMessageUris = [],
            messageList = [],
            isInbox = false;
        let selectedMessages = quickFilters.Util.getSelectedMessages(selectedMessageUris); 
        // && selectedMessages[0].folder.server.canHaveFilters
        if (selectedMessages.length > 0 && selectedMessages[0].folder ) {
          // check the tags
          let firstSelectedMsg = selectedMessages[0],
              tags = firstSelectedMsg.getStringProperty ? firstSelectedMsg.getStringProperty("keywords") : firstSelectedMsg.Keywords;
          isInbox = firstSelectedMsg.folder.flags & util.FolderFlags.Inbox;
          if (isInbox
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
          let fA = null;
          if (!isInbox) {
            fA = Ci.nsMsgFilterAction.MoveToFolder;
          }
          if (firstSelectedMsg.isFlagged ) {
            // fA = Ci.nsMsgFilterAction.AddTag;
            fA = Ci.nsMsgFilterAction.MarkFlagged; // ??
          }
          
          // now really an async function:
          // TO DO:  test / check this code branch asyncify - (create filter from message seems to fail)
          quickFilters.Worker.createFilterAsync_New(null, currentMessageFolder, messageList, fA, false);
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
    quickFilters.onMenuItemCommand("toggle_Filters");
  },

  onToolbarListCommand: function onToolbarListCommand(e) {
    if (quickFilters.Util.versionSmaller(quickFilters.Util.AppverFull, "110")) {
      goDoCommand('cmd_displayMsgFilters');
    }
    else {
      MsgFilters();
    }
  },

  onApplyFilters: function onApplyFilters(silent) {

    // does this work in non-inbox current folder?
    // Get the folder where filters should be defined, if that server
    // can accept filters.
    const util = quickFilters.Util,
          Ci = Components.interfaces,
          Cc = Components.classes,
          filterService = MailServices.filters; // nsIMsgFilterService

          
    let folder = util.getCurrentFolder(),
        msgWindow = Cc["@mozilla.org/messenger/msgwindow;1"].createInstance(Ci.nsIMsgWindow);
        
    // from  MsgApplyFiltersToSelection()
    if (!silent && quickFilters.Preferences.getBoolPref('notifications.runFilter')) {
      let text = quickFilters.Util.getBundleString('quickfilters.runningFiltersOnFolder.notify', 'Running filters on folder {1}');
      util.slideAlert(text.replace("{1}",folder.prettyName), 'quickFilters');
    }   

    if (folder.flags & util.FolderFlags.Inbox) {
      // MsgApplyFilters();
      goDoCommand("cmd_applyFilters");
    }
    else {
      // is the account itself selected?
      if (folder.isServer) {
        console.log (`Attempt to run filters on account [${folder.prettyName}]: no folder selected - trying to find related Inbox instead`);
        // use inbox instead.
        folder = folder.subFolders.find((f) => f.flags & 4096)
        if (!folder) {
          console.log ("Could not determine inbox - not running filters!");
          return;
        }
      }
      
      // see mailWindowOverlay.js - MsgApplyFilters()
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
          isListArray = util.versionGreaterOrEqual(util.AppverFull, "85"),
          selectedFolders = 
            isListArray ? [] : Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
      if (isListArray) 
        selectedFolders.push(folder);
      else
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

            for (let i = 0; i < numFilters; i++) {
              let curFilter = filterList.getFilterAt(i),
                  actionList = curFilter.sortedActionList,
                  acLength = actionList.length;
              for (let index = 0; index < acLength; index++) { 
                let action = actionList[index].QueryInterface(Components.interfaces.nsIMsgRuleAction);
                if (action.type == FA.MoveToFolder || action.type == FA.CopyToFolder) {
                  if (action.targetFolderUri) { 
                    let isTargetMatch = (action.targetFolderUri === targetFolder.URI),
                        title = isTargetMatch ? "MATCHED TARGET: " : 
                                                "Target URI:     " ;
                    
                    msg += "[" + i + "] " + title + action.targetFolderUri + "\n";
                    if (isTargetMatch) {
                      util.logDebugOptional("filterSearch", "FOUND FILTER MATCH at index [" + i + "]:\n" 
                        + "filter '" + curFilter.filterName + "'");
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
    // if (win) win.close();

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
    Services.console.logStringMessage("quickFilters:" + msg);
  },

  // Tb115 - new drop interface: passes the event now, and not (row, orientation) !
  onFolderTreeViewDrop: function onFolderTreeViewDrop(event) {  // , aRow, aOrientation
    const Cc = Components.classes,
        Ci = Components.interfaces,
        util = quickFilters.Util;
    let worker = quickFilters.Worker,
        dataTransfer = event.dataTransfer,
        origTarget = event.explicitOriginalTarget;


    let types = dataTransfer.mozTypesAt(0);  // one flavor
    if (!types.contains("text/x-moz-message") || (!quickFilters.Util.AssistantActive)) {
      return;
    }
    util.logDebugOptional("events,msgMove", `onFolderTreeViewDrop\ntarget = ${event.target.innerText}`);

    if (quickFilters.isNewAssistantMode) {
      // will be handled by folder listener!
      return;
    }


    let row = event.target.closest("li");
    let targetFolder = MailServices.folderLookup.getFolderForURL(row.uri);

    // OLD CODE ...
    // let targetFolder = treeView._rowMap[aRow]._folder.QueryInterface(Ci.nsIMsgFolder);
    let sourceFolder,
        messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger),
        messageUris = [];

    for (let i = 0; i < dataTransfer.mozItemCount; i++) {
      let messageUri = dataTransfer.mozGetDataAt("text/x-moz-message", i);

      if (!i) {
        let msgHdr = messenger.msgHdrFromURI(messageUri);
        sourceFolder = msgHdr.folder;
      }
      messageUris.push(messageUri);
    }
    let isMove = Cc["@mozilla.org/widget/dragservice;1"]
                   .getService(Ci.nsIDragService).getCurrentSession()
                   .dragAction == Ci.nsIDragService.DRAGDROP_ACTION_MOVE;
    if (!sourceFolder.canDeleteMessages)
      isMove = false;

    // handler for dropping messages
    try {
      util.logDebugOptional("dnd", "onDrop: " + messageUris.length + " messageUris to " + targetFolder.URI);
      if(messageUris.length > 0 && !sourceFolder) {
        // note: getCurrentFolder fails when we are in a search results window!!
        if (!sourceFolder) {
          sourceFolder = util.getCurrentFolder();
        }
      }
      let msgList = util.createMessageIdArray(targetFolder, messageUris);
      if (quickFilters.Util.checkAssistantTargetExclusion(targetFolder)) {
        return;
      }
      if (quickFilters.Util.checkAssistantSourceExclusion(sourceFolder)) {
        return;
      }      
      // TODO - asyncify ?
      window.setTimeout(async function() {
        worker.createFilterAsync_New(sourceFolder, targetFolder, msgList,
          isMove ? Ci.nsMsgFilterAction.MoveToFolder : Ci.nsMsgFilterAction.CopyToFolder,
          null, false);
      });
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
    if (!types.contains("text/x-moz-message") || (!quickFilters.Util.AssistantActive)) 
      return false;

    if (quickFilters.isNewAssistantMode) {
      // will be handled by folder listener!
      return false;
    }
  
    util.logDebugOptional("dnd", "buttonDragObserver.onDrop flavor[0]=" + types[0].toString());
    let prefBranch = Services.prefs.getBranch("mail."),
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
        if (quickFilters.Util.AssistantActive) {
          // note: getCurrentFolder fails when we are in a search results window!!
          if (!sourceFolder) {
            sourceFolder = util.getCurrentFolder();
          }
          if (util.isVirtual(sourceFolder)) {
            quickFilters.logDebug("onFolderTreeDrop - Retrieved message from a virtal folder:", sourceFolder);
          }
        }
        let msgList = util.createMessageIdArray(targetFolder, messageUris);
          // dragSession.dragAction === Components.interfaces.nsIDragService.DRAGDROP_ACTION_COPY

        if (quickFilters.Util.AssistantActive) {
          // is now async too. TO DO asyncify - await needed?
          if (quickFilters.Util.checkAssistantTargetExclusion(targetFolder)) {
            return false;
          }
          if (quickFilters.Util.checkAssistantSourceExclusion(sourceFolder)) {
            return false;
          }
          
          window.setTimeout(async function() {
            worker.createFilterAsync_New(sourceFolder, targetFolder, msgList, 
             isMove ? Components.interfaces.nsMsgFilterAction.MoveToFolder : Components.interfaces.nsMsgFilterAction.CopyToFolder, 
             null, false)
          });
        }
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
        win = window;
    util.logDebug('toggleCurrentFolderButtons()');
    try {
      // in tb 68 we need to move the buttons into the correct place first,
      let btnList = win.document.getElementById('quickfilters-current-listbutton');
      if (btnList) { 
        let injected = win.document.getElementById('quickFilters-injected'),
            btnRun = win.document.getElementById('quickfilters-current-runbutton'),
            btnMsgRun = win.document.getElementById('quickfilters-current-msg-runbutton'),
            btnSearch = win.document.getElementById('quickfilters-current-searchfilterbutton');
            
        if (injected)  { 
          util.logDebug("found injected container with current toolbar buttons");
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
        // QuickFolders settings - we need to notify quickfolders instead!
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
  
  MsgMoveCopy_Wrapper: function MsgMoveCopy_Wrapper(uri, isCopy, originalControllerCopyMove) {
    // TB115 deprecated:
    // gFolderDisplay
    // gFolderDisplay.selectedMessages
    // gFolderDisplay.selectedMessageUris
    const util = quickFilters.Util,
          worker = quickFilters.Worker,
          Ci = Components.interfaces;

    if (quickFilters.Preferences.isDebugOption("assistant")) {
      debugger;
    }          
    // MsgMoveMessage wrapper function
    let sourceFolder, destMsgFolder, messageList = [], isCreateFilter = false;
    
    try {
      util.logDebugOptional('msgMove', "Executing wrapped MsgMoveMessage");
      if (quickFilters.Util.AssistantActive) { 
        sourceFolder = util.getCurrentFolder();
        
        let destResource = uri;  
        
        destMsgFolder = destResource.QueryInterface(Ci.nsIMsgFolder);
        
        // get selected message uris - see case 'createFilterFromMsg'
        // gFolderDisplay.selectedMessageUris;
        let selectedMessageUris = [] ; 
        let selectedMessages = quickFilters.Util.getSelectedMessages(selectedMessageUris);
            
        util.logDebugOptional('msgMove', 'MsgMoveCopy_Wrapper(): ' + selectedMessages.length + ' selected Messages counted.');

        if (util.checkAssistantTargetExclusion(destMsgFolder)
            ||
            util.checkAssistantSourceExclusion(sourceFolder))
        {
          isCreateFilter = false;
        }
        else {        
          let i;
          for (i=0; i<selectedMessages.length; i++) {
            messageList.push(util.makeMessageListEntry(selectedMessages[i], selectedMessageUris[i])); 
            // the original command in the message menu calls the helper function MsgCreateFilter()
            // we do not know the primary action on this message (yet)
          }
          if (i)  {       
            // can we clone here - let's try as counter measure for IMAP users..
            worker.refreshHeaders(messageList, sourceFolder, null); // attempt an early message clone process
            worker.promiseCreateFilter = true;
            isCreateFilter = true;
            // move filter  creation until after copy / move!
          }
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
        {
          if (isCopy) {
            util.logDebugOptional('msgMove', "Executing original CopyMessage [[");
            // calls original copy message function of Thunderbird
            originalControllerCopyMove(uri); 
          }
          else {
            util.logDebugOptional('msgMove', "Executing original MoveMessage [[");
            // call original move message function of Thunderbird
            originalControllerCopyMove(uri); 
          }
          util.logDebugOptional('msgMove', "After original Move/CopyMessage.]]");
          // MOVED FILTER CREATION AFTER MESSAGES ARE MOVED.
          let fA = isCopy ? Ci.nsMsgFilterAction.CopyToFolderMsgCopyMessage : Ci.nsMsgFilterAction.MoveToFolder; // [issue 77]
          if(isCreateFilter) {
            worker.createFilterAsync_New(sourceFolder, 
              destMsgFolder, 
              messageList, 
              fA,   // filterAction
              false);  // filterActionExt
            util.logDebugOptional('msgMove', "After calling createFilterAsync_New()");
          }
        }
      }
      
      util.logDebugOptional('msgMove', "calling promiseDone()...");
      promiseDone();  //was setTimeout(promiseDone, 20);
    }         
  },

  MsgArchive_Wrapper: async function(callbackFunction) {
    const util = quickFilters.Util,
          Ci = Components.interfaces;

    let sourceFolder, destMsgFolder, messageList = [], isCreateFilter = false;
    try {
      if (quickFilters.Util.AssistantActive &&
          !quickFilters.Preferences.getBoolPref("assistant.exclude.archive")
          ) { 
        sourceFolder = util.getCurrentFolder();

        let selectedMessageUris = [] ; 
        let selectedMessages = quickFilters.Util.getSelectedMessages(selectedMessageUris);

        let i;
        for (i=0; i<selectedMessages.length; i++) {
          messageList.push(util.makeMessageListEntry(selectedMessages[i], selectedMessageUris[i])); 
          // the original command in the message menu calls the helper function MsgCreateFilter()
          // we do not know the primary action on this message (yet)
        }      
        // archive mail: FiltaQuilla custom action!
        let fA = Ci.nsMsgFilterAction.Custom;  
        // we do not know the final archive folder, (messages have not been archived yet)
        // so we use the source folder. The action will be archice and so doesn't need a new targetFolder
        destMsgFolder = sourceFolder;
        if (messageList.length) {
          await quickFilters.Worker.createFilterAsync_New(sourceFolder, 
            destMsgFolder, 
            messageList, 
            fA,   // filterAction
            "Archive");  // filterActionExt
          util.logDebugOptional('msgMove', "After calling createFilterAsync_New()");
        }
      }
    }
    catch(ex) {
      util.logException("MsgArchive_Wrapper()", ex);
    }
    callbackFunction(); // call original archive function
  },

  doCommandWrapper: function(cmd, aTab) {
    if ((cmd=="cmd_delete" || cmd=="button_delete") &&  DefaultController.isCommandEnabled(cmd)) try {
      // determine which messages are currently selected
      // then call assistant first. Or alternatively call after original function returns true.
      // original call was gFolderDisplay.doCommand(Ci.nsMsgViewCommandType.deleteMsg);
      const Ci = Components.interfaces;
      quickFilters.Util.logDebugOptional("assistant,msgMove", `doCommandWrapper(${cmd}, ${aTab}):`);

      if (quickFilters.Util.AssistantActive && !quickFilters.isNewAssistantMode) { 
        if (quickFilters.Preferences.getBoolPref("assistant.exclude.trash")) {
          quickFilters.Util.logDebugOptional("assistant,msgMove", "Not invoking assistant on delete as it is excluded.");
        }
        else {
          let selectedMessages = quickFilters.Util.getSelectedMessages();
          if (selectedMessages.length) {
            let selectedMails = [];  
            for (let i=0; i< selectedMessages.length; i++) {
              let msgHdr = selectedMessages[i];
              selectedMails.push(quickFilters.Util.makeMessageListEntry(msgHdr)); 
            }
            let src = selectedMessages[0].folder;
            // determine the target (Trash for this account)
            if (src.canDeleteMessages) {
              let targetFolder = src.server.rootFolder.getFolderWithFlags(Ci.nsMsgFolderFlags.Trash);
              quickFilters.Worker.createFilterAsync_New(src, targetFolder, selectedMails, 
                Components.interfaces.nsMsgFilterAction.Delete, 
                null,
                false);          
            }
          }
        }
        
      }
    }
    catch(ex) {
      quickFilters.Util.logException("quickFilters.doCommandWrapper()", ex)
    }
    let result = quickFilters.doCommandOriginal.call(DefaultController, cmd, aTab); // make sure to bind "this" to DefaultController!
    return result;
  },

  windowKeyPress: function windowKeyPress(e,dir) {
    // var isDisableKeyListeners = true; // test
    // if (isDisableKeyListeners) return;

    const util = quickFilters.Util,
          prefs = quickFilters.Preferences,
          isRunFolderKey = prefs.isShortcut("folder"),
          isSelectedMailsKey = prefs.isShortcut("mails");
    if (!isRunFolderKey && !isSelectedMailsKey) return;
    
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
            tag == 'findbar'
            ||
            tag == 'search-textbox' // in-mail search
            ||
            tag == 'html:input')   // Tb 102 search box
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
      let selectedTab = quickFilters.Util.tabContainer.selectedTab,
          tabMode = null;
      if (selectedTab) {
        tabMode = quickFilters.Util.getTabMode(selectedTab);
        if (tabMode == "glodaSearch" && tab.collection) { //distinguish gloda search result
          tabMode = "glodaSearch-result";
        }
        if (quickFilters.Util.isTabMode(selectedTab,"mail")) {
          let isShiftOnly = !isAlt && !isCtrl && isShift && dir!='up',
              theKeyPressed = (String.fromCharCode(e.charCode)).toLowerCase();
          if (isRunFolderKey) {
            if (isShiftOnly && theKeyPressed == prefs.getShortcut("folder").toLowerCase()) {
              util.logDebug("detected: Shortcut for Run filters on Folder");
              
              if (quickFilters.Preferences.getBoolPref("shortcuts.challenge")) {
                let folder = util.getCurrentFolder();
                if (!(folder.getFlag(util.FolderFlags.Inbox))) {
                  let txt = util.getBundleString("runFilters.folder.confirm", "", [folder.prettyName]);
                  let result = Services.prompt.confirm(util.getMail3PaneWindow(), "quickFilters", txt);
                  if (!result) return;
                }
              }
              quickFilters.onApplyFilters();
              return; 
            }
          }
          if (isSelectedMailsKey) {
            if (isShiftOnly && theKeyPressed == prefs.getShortcut("mails").toLowerCase()) {
              util.logDebug("detected: Shortcut for Run filters on Selected Mails");
              let folder = util.getCurrentFolder();
              if (!(folder.getFlag(util.FolderFlags.Inbox)) && quickFilters.Preferences.getBoolPref("shortcuts.challenge")) {
                let txt = util.getBundleString("runFilters.selection.confirm");
                let result = Services.prompt.confirm(util.getMail3PaneWindow(), "quickFilters", txt);
                if (!result) return;
              }
              quickFilters.onApplyFiltersToSelection();
              return; 
            }
          }
        }
      }
    }
  } ,
  
  // show news on update
  updatequickFiltersLabel: function() {
    const util = quickFilters.Util;
    let hasNews = quickFilters.Preferences.getBoolPref("hasNews"),
        btn = document.getElementById("quickfilters-toolbar-button"),
        isDropDownMarkerStyled = false;
    let newLabel = "", newTooltip = "";
    // for styling button parent background image
    //   in  Tb115 we need to add the class to the parent <div class="live-content">!
    function addClass(element, c) {
      element.classList.add(c);
      element.parentElement.classList.add(c)
    }
    function removeClass(element, c) {
      element.classList.remove(c);
      element.parentElement.classList.remove(c);
    }

    if (btn) {
      if (hasNews) {
        addClass(btn,"newsflash");
      } else {
        removeClass(btn,"newsflash");
      }
      if (util.licenseInfo.isExpired) {
        addClass(btn,"expired");
        removeClass(btn,"renew");
        newLabel = util.getBundleString("quickfiltersToolbarButton.expired");
        newTooltip = util.getBundleString("quickfiltersToolbarButton.expired.tip");
        isDropDownMarkerStyled = true;
      }
      else {
        removeClass(btn,"expired");
        if (hasNews) {
          newLabel = util.getBundleString("quickfiltersToolbarButton.updated");
          newTooltip = util.getBundleString("quickfiltersToolbarButton.updated.tip");
          isDropDownMarkerStyled = true;
        }
        else {
          newLabel = "quickFilters"; // let's use the standard label
          newTooltip = util.getBundleString("quickfiltersToolbarButton.tooltip");
        }
        let mnuGoPro = document.getElementById("quickfilters-gopro");
        if (util.licenseInfo.isValid) { 
          if (util.licenseInfo.licensedDaysLeft<11) {
            addClass(btn,"renew");
            newLabel = util.getBundleString("quickfiltersToolbarButton.renew", "License expires in $daysLeft$ days", [util.licenseInfo.licensedDaysLeft]);
            isDropDownMarkerStyled = true;
          } else {
            removeClass(btn,"renew");
          }
          mnuGoPro.classList.add ("hasLicense");
        } else {
          mnuGoPro.classList.remove ("hasLicense");
        }
      }
      // style dropdownmarker directly (it's hidden in dropmarker.shadowRoot)
      // we cannot set a selector for the parent element (#quickfilters-toolbar-button.expired)
      // because this is not visible to the shadowRoot.
      let dm = btn.querySelector("dropmarker");
      if (dm && dm.shadowRoot) {
        let dmImage = dm.shadowRoot.querySelector("image");
        if (isDropDownMarkerStyled) {
          dmImage.classList.add("qi-highlighted");
        } else {
          dmImage.classList.remove("qi-highlighted");
        }
        dmImage.style.color = isDropDownMarkerStyled ? "#FFFFFF" : "";
      }
      // uses browser.browserAction.setTitle() 
      if (newTooltip) {
        util.notifyTools.notifyBackground({ func: "setActionTip", text: newTooltip });
      }
      
      // used browser.browserAction.setLabel() 
      util.notifyTools.notifyBackground({ func: "setActionLabel", text: newLabel });
    }
  } ,

  // unfortunately, this is also triggered when a FILTER changes a tag of a message.
  // this might make it useless for our purposes
  // This will eventually have to replace ToggleMessageTagWrapped()
  // and get rid of the monkey patch
  listenerFlagChanged: function(item, oldFlag, newFlag) {
    // check old flags
    let tags = item.getProperty("keywords");
    tags = tags ? tags.split(" ") : [];
    let newTags = tags.filter(MailServices.tags.isValidKey); // filter out nonsense tags
    if (quickFilters.Preferences.isDebugOption("listeners")) {
      console.log("listenerFlagChanged - new tags:", item, oldFlag, newFlag, newTags);
    }
    if (!quickFilters.Preferences.getBoolPref('listener.tags')) {
      return; // ignore tag changes.
    }
    if (newTags.length) { // tags have been added.
      if (!quickFilters.Util.AssistantActive) return false; 
      if (!quickFilters.Preferences.getBoolPref('listener.tags')) return false; 
      let messages = quickFilters.Util.getSelectedMessages(); 
      if (!messages.length) return false;
      let msgHdr = messages[0];
      let selectedMails = [];  
      selectedMails.push(quickFilters.Util.makeMessageListEntry(msgHdr)); // Array of message entries  ### [Bug 25688] Creating Filter on IMAP fails after 7 attempts ###
      
      // THIS SHOULD ONLY BE DONE IF THE TAG CHANGE WAS INTERACTIVE!!
      // SO WE CANNOT DO THIS HERE TO REMOVE THE TAG CHANGE MONKEY PATH AT THE MOMENT.
      /*
      quickFilters.Worker.createFilterAsync_New(null, msgHdr.folder, selectedMails, 
                                            Components.interfaces.nsMsgFilterAction.AddTag, 
                                            tag,
                                            false);
                                            */
    }
    return true;
  },

  TabEventListeners: {}, // make a map of tab event listeners
  addTabEventListener : function() {
    try {
      let tabContainer = quickFilters.Util.tabContainer;
      this.TabEventListeners["TabSelect"] = function(event) { quickFilters.TabListener.selectTab(event); }
      this.TabEventListeners["TabOpen"] = function(event) { quickFilters.TabListener.openTab(event); }
      // this.TabEventListeners["TabClose"] = function(event) { quickFilters.TabListener.closeTab(event); }
      // this.TabEventListeners["TabMove"] = function(event) { quickFilters.TabListener.moveTab(event); }
      for (let key in this.TabEventListeners) {
        tabContainer.addEventListener(key, this.TabEventListeners[key], false);
      }
    }
    catch (e) {
      quickFilters.LocalErrorLogger("No tabContainer available! " + e);
      quickFilters._tabContainer = null;
    }
  } ,
	removeTabEventListener: function() {
    // this might not be necessary, as we iterate ALL event listeners when add-on shuts down 
    // (see "undo monkey patch" in qFi-messenger.js)
    let tabContainer = quickFilters.Util.tabContainer;
    for (let key in this.TabEventListeners) {
      tabContainer.removeEventListener(key, this.TabEventListeners[key]);
    }
  }  

}; // quickFilters MAIN OBJECT


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
  msgsMoveCopyCompleted: function(isMoved, aSrcMsgs, targetFolder, aDestMsgs) {
    let qF = quickFilters ? quickFilters : this.qfInstance;
    let isMoveDebug = qF.Preferences.isDebugOption("msgMove"), 
        isDebugDetail = false;
    qF.Util.logDebugOptional("listeners", `MsgFolderListener.msgsMoveCopyCompleted()\n ${aSrcMsgs[0].folder.prettyName} ${targetFolder.prettyName}  ${aDestMsgs && aDestMsgs.length ? aDestMsgs[0].folder.prettyName : "no destmsg!"}`);
    if (isMoveDebug) {
      console.log ("msgsMoveCopyCompleted()\n", {isMoved, aSrcMsgs, targetFolder, aDestMsgs});
      isDebugDetail = qF.Preferences.isDebugOption("msgMove.detail");
    }    

    if (!aDestMsgs || !aDestMsgs.length) {
      return; // early exit - could be a filter execution (empty array) or IMAP synchronisation (null == aDestMsgs).
    }

    if (qF.Util.AssistantActive) {
      if (!quickFilters.isNewAssistantMode) {
        if (isMoveDebug) {
          qF.Util.logDebug("New assistant mode disabled, msgsMoveCopyCompleted does not invoke filter assistant.");
        }
        return; // early exit
      }

      if (qF.Util.checkAssistantTargetExclusion(targetFolder)) {
        // Avoid triggering assistant for certain folders
        return;
      }

      let sourceFolder = aSrcMsgs[0].folder;
      let msgList = [];

      if (isMoveDebug) {
        console.log(`Assistant triggered for folder ${targetFolder.prettyName}`, 
        targetFolder, 
          `\nflags: 0x${targetFolder.flags.toString(16)}\nURI: ${targetFolder.URI}`)
      }
      // guard against being triggered during filtering:
      // check if there is a filter for the folder
      let filtersList = sourceFolder.getEditableFilterList(msgWindow); // msgWindow = global variable
      let isFoundActiveFilterMatch = false;
      for (let f = 0; f < filtersList.filterCount; f++) {
        let aFilter = filtersList.getFilterAt(f),  // nsIMsgFilter 
            acLength = qF.Util.getActionCount(aFilter);
        if (!aFilter.enabled) {
          if (isDebugDetail) {
            console.log(`skipping disabled filter ${aFilter.filterName}`);
          } 
          continue;
        }

        if (isDebugDetail) {
          console.log(`Testing for filter match: ${aFilter.filterName} ...`);
        }
        for (let index = 0; index < acLength; index++) {
          let ac = aFilter.getActionAt(index);
          try {
            if (ac.type == Ci.nsMsgFilterAction.MoveToFolder ||
              ac.type ==Ci.nsMsgFilterAction.CopyToFolder) {
                  if (ac.targetFolderUri == targetFolder.URI) {
                    // now make sure that all filter conditions match!
                    // just use the first message
                    let ms = aSrcMsgs[0];
                    // API way: messenger.filters.filterMatches(filter.filterId, message.id)
                    // match all search terms
                    let match = aFilter.MatchHdr(ms, ms.folder,  ms.folder.msgDatabase, "");
                    // aFilter.MatchHdr(aDestMsgs[0], targetFolder,  targetFolder.msgDatabase, "")
                    if (match) {
                      isFoundActiveFilterMatch = true;
                      break;
                    }
                  }
                }
          } 
          catch(ex) {
            // NOP
            quickFilters.Util.logException(`Error while testing filter  ${aFilter.filterName}`, ex);
          }
        }
        if (isFoundActiveFilterMatch) {
          if (isMoveDebug) {
            console.log(`No Assistant triggered by moving ${aSrcMsgs.length} messages, because a matching filter ${aFilter.filterName} exists and may have caused this event:\n`, aFilter);
          }
          return;
        }
      }

      for (let i=0; i<aSrcMsgs.length; i++) {
        msgList.push(qF.Util.makeMessageListEntry(aSrcMsgs[i])); 
        // the original command in the message menu calls the helper function MsgCreateFilter()
        // we do not know the primary action on this message (yet)
      }

      if (msgList.length) {
        if (isMoveDebug) {
          let done = isMoved ? "moved" : "copied";
          console.log(`${done} ${msgList.length} messages, now invoking filter assistant...`)
        }
        qF.Worker.createFilterAsync_New(sourceFolder, targetFolder, msgList,
          isMoved ? Ci.nsMsgFilterAction.MoveToFolder : Ci.nsMsgFilterAction.CopyToFolder,
          null, false);
      }

    }

  },
  msgAdded: function msgAdded(aMsg){ 
    quickFilters.Util.logDebugOptional("listeners", "MsgFolderListener.msgAdded()"); 
  },
  msgsClassified: function msgsClassified(aMsgs, aJunkProcessed, aTraitProcessed){;},
  msgsDeleted: function msgsDeleted(aMsgs) { 
    let qF = quickFilters ? quickFilters : this.qfInstance;
    let isMoveDebug = qF.Preferences.isDebugOption("msgMove");
    if (isMoveDebug) {
      console.log (`msgsDeleted()\nImmediately deleted messages from ${aMsgs[0].folder.prettyName}`, aMsgs);
    }
  },
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
        Services.console.logStringMessage("quickFilters:" + msg);
      }
    }
    catch(e) {
      // write to TB status bar??
      try{quickFilters.Util.logToConsole("Error: " + msg);} catch(e) {;};
    };
  },
  
  onMessageAdded: function() {
  },
  // legacy method: works in 91 https://searchfox.org/comm-esr91/source/mailnews/base/public/nsIFolderListener.idl
  // in Tb102 -= Replaced with void onMessageAdded(in nsIMsgFolder parent, in nsIMsgDBHdr msg);
  // https://searchfox.org/comm-central/rev/fa8e67bb1f40b7381b3e4db9545574cdc4758db9/mailnews/base/public/nsIFolderListener.idl#27
  OnItemAdded: async function(parent, item) {
    const Ci = Components.interfaces;
    try {
      let qfEvent = this.qfInstance || quickFilters;
      if (!qfEvent) return;
    
      const win = qfEvent.Util ? qfEvent.Util.getMail3PaneWindow() : quickFilters.Util.getMail3PaneWindow(),
            util = win.quickFilters.Util,
            prefs = win.quickFilters.Preferences,
            worker = win.quickFilters.Worker,
            logDebug = util.logDebugOptional.bind(util),
            isLocalFolders = prefs.getBoolPref('localFoldersRun');
            
      logDebug("events,msgMove","FolderListener.OnItemAdded() " + item.toString());    
      if (prefs.isDebugOption("events")) {
        console.log(parent, item);
      }
            
      // referencing parent may re-invoke OnItemAdded! [issue 80]
      if (isLocalFolders && util.isLocalInbox(parent)) {
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
      if (!worker || !quickFilters.Util.AssistantActive) return;
      // removed old nostalgy code...
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
          let isAssistant = quickFilters.Util.AssistantActive, 
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

  
  // TB 91
  OnItemPropertyFlagChanged: function (item, property, oldFlag, newFlag) {
    const win = quickFilters.Util.getMail3PaneWindow(),
          util = win.quickFilters.Util;
    try {
      util.logDebugOptional("events","OnItemPropertyFlagChanged( " + item + ", " + property + "," + oldFlag + "," + newFlag + ")");
      if (property == "Keywords") {
        quickFilters.listenerFlagChanged(item, oldFlag, newFlag);
      }
    }
    catch(e) {this.ELog("Exception in FolderListener.OnItemPropertyFlagChanged {" + property + "}:\n" + e)};
  } ,


  // Tb 102 - does not exist in Tb 91
  onFolderPropertyFlagChanged(item, property, oldFlag, newFlag) {
    switch (property) {
      case "Status": // not used
        break;
      case "Flagged": // not used
        break;
      case "Keywords":
        quickFilters.listenerFlagChanged(item, oldFlag, newFlag);
        break;
    }
  }  
  
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
  getAvailableOperators: function customTermReplyTo_getAvailableOperators(scope) {
    if (!this._isLocalSearch(scope)) {
      return [];
    }
    let nsMsgSearchOp = Components.interfaces.nsMsgSearchOp;
    return [nsMsgSearchOp.Contains, nsMsgSearchOp.DoesntContain, nsMsgSearchOp.Is, nsMsgSearchOp.Isnt, nsMsgSearchOp.BeginsWith, nsMsgSearchOp.EndsWith];
  },
  match: function customTermReplyTo_match(aMsgHdr, aSearchValue, aSearchOp) {
    // get custom header "replyTo"
    let replyTo = aMsgHdr.getStringProperty('replyTo').toLocaleLowerCase(),
        searchVal = aSearchValue.toLocaleLowerCase(),
        matches = false,
        nsMsgSearchOp = Components.interfaces.nsMsgSearchOp;

    switch (aSearchOp) {
      case nsMsgSearchOp.Contains:
      case nsMsgSearchOp.DoesntContain:
        if (replyTo.includes(searchVal)) { matches = true; }
        break;

      case nsMsgSearchOp.Is: // fallthrough
      case nsMsgSearchOp.Isnt:
        if (replyTo == searchVal) { matches = true; }
        break;

      case nsMsgSearchOp.BeginsWith:
        if (replyTo.startsWith(searchVal)) { matches = true; }
        break;

      case nsMsgSearchOp.EndsWith:
        if (index = replyTo.endsWith(searchVal)) { matches = true; }
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


// [issue 12] shortcuts for run filter buttons.
quickFilters.addKeyListener = function(win) {
  const prefs = quickFilters.Preferences;
  let isRunFolderKey = prefs.isShortcut("folder"),
      isSelectedMailsKey = prefs.isShortcut("mails");

  if (isRunFolderKey || isSelectedMailsKey) {
    // check main instance 
    if (!win.quickFilters.isKeyListener) {
      win.quickFilters_keyListener = (event) => { 
        win.quickFilters.windowKeyPress(event,'down'); 
      }
      win.addEventListener("keypress", win.quickFilters_keyListener, {capture:true, passive: true})    
      win.quickFilters.isKeyListener = true;
    }
  }
};

quickFilters.removeKeyListener = function(win) {
  if (win.quickFilters && win.quickFilters.isKeyListener && win.quickFilters_keyListener) {
    win.removeEventListener("keypress", win.quickFilters_keyListener, {capture:true, passive: true});
    delete win.quickFilters_keyListener;
  }
}

quickFilters.addFolderListeners = function() {
  MailServices.mailSession.AddFolderListener(quickFilters.FolderListener, 
    Ci.nsIFolderListener.event | 
    Ci.nsIFolderListener.added | 
    Ci.nsIFolderListener.propertyFlagChanged );

   // nsIMsgFolderListener
  MailServices.mfn.addListener(quickFilters.MsgFolderListener,
      MailServices.mfn.msgsMoveCopyCompleted |
      MailServices.mfn.msgsDeleted |
      MailServices.mfn.msgKeyChanged
  );
}

quickFilters.removeFolderListeners = function() {
  MailServices.mfn.removeListener(quickFilters.MsgFolderListener);
  MailServices.mailSession.RemoveFolderListener(quickFilters.FolderListener);
}


// jcranmer suggest using this
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
          if (!quickFilters.Util.AssistantActive && prefs.getBoolPref('listener.tags.autofilter')) { 
            quickFilters.onApplyFiltersToSelection(true); // suppress the message
            return false;
          }

          if (checked) { // only if tag  gets toggle ON
            // Assistant is active?
            if (!quickFilters.Util.AssistantActive) return false; 
            // make it possible to ignore tag changes.
            if (!prefs.getBoolPref('listener.tags')) return false; 

            let selectedMessages = quickFilters.Util.getSelectedMessages(); 
            if (!selectedMessages.length) return false;
            let msgHdr = selectedMessages[0];

            let selectedMails = [];  
            selectedMails.push(util.makeMessageListEntry(msgHdr)); // Array of message entries  ### [Bug 25688] Creating Filter on IMAP fails after 7 attempts ###
            window.setTimeout(async function() {
              contextWin.quickFilters.Worker.createFilterAsync_New(null, msgHdr.folder, selectedMails, 
                                                    Components.interfaces.nsMsgFilterAction.AddTag, 
                                                    tag,
                                                    false);
            });
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

quickFilters.restoreTagListener = function() {
  if (quickFilters.ToggleMessageTag) {
    ToggleMessageTag = quickFilters.ToggleMessageTag;
  }
}

quickFilters.patchMailPane = () => {
  // THUNDERBIRD 115
  // fix selectors
  let mainButton = document.querySelector("button[extension='quickFilters@axelg.com']");
  if (mainButton) {
    // was the button already patched?
    if (mainButton.id == "quickfilters-toolbar-button") {
      return;
    }
    mainButton.id = "quickfilters-toolbar-button";
    mainButton.setAttribute("popup", "quickFiltersMainPopup");
    // we still may have to remove the default command handler and add the popup one,
    // just like 

    // build the menu - quick and dirty:
    quickFilters.WL.injectElements(`
      <button id="quickfilters-toolbar-button">
        <menupopup id="quickFiltersMainPopup">
          <menuitem id="quickfilters-news" label="__MSG_quickfilters.menu.news__" class="menuitem-iconic marching-ants" oncommand="window.quickFilters.doCommmand(this);"  onclick="event.stopPropagation();"/>
          <menuitem id="quickfilters-checkLicense"    label="__MSG_quickfilters.menu.license__" class="menuitem-iconic marching-ants" oncommand="window.quickFilters.doCommmand(this);"  onclick="event.stopPropagation();"/>
          <menuitem id="quickfilters-toggleAssistant" label="__MSG_quickfilters.FilterAssistant.start__" class="menuitem-iconic" oncommand="window.quickFilters.doCommmand(this);"  onclick="event.stopPropagation();" />
          <menuitem id="quickfilters-runFilters"      label="__MSG_quickfilters.RunButton.label__" class="menuitem-iconic" oncommand="window.quickFilters.doCommmand(this);" onclick="event.stopPropagation();"/>
          <menuitem id="quickfilters-runFiltersMsg"   label="__MSG_quickfilters.RunButtonMsg.label__" class="menuitem-iconic" oncommand="window.quickFilters.doCommmand(this);" onclick="event.stopPropagation();"/>
          <menuseparator />
          <menu label="__MSG_quickfilters.menu.tools__">
            <menupopup>
              <menuitem id="quickfilters-menu-filterlist" label="__MSG_quickfilters.ListButton.label__" class="menuitem-iconic" oncommand="window.quickFilters.doCommmand(this);" onclick="event.stopPropagation();"/>
              <menuitem id="quickFilters-menu-filterFromMsg" label="__MSG_quickfilters.FromMessage.label__" oncommand="window.quickFilters.doCommmand(this);"  onclick="event.stopPropagation();"/>                    
              <menuitem id="quickfilters-menu-searchfilters" label="__MSG_quickfilters.findFiltersForFolder.menu__"  class="menuitem-iconic" oncommand="window.quickFilters.doCommmand(this);" onclick="event.stopPropagation();"/>
              <menuitem id="quickfilters-menu-test-midnight" label="Test - Label update (midnight)" oncommand="window.quickFilters.doCommmand(this);" onclick="event.stopPropagation();"/>
            </menupopup>
          </menu>
          <menuitem id="quickfilters-options" label="__MSG_quickfilters.button.settings__" class="menuitem-iconic" oncommand="window.quickFilters.doCommmand(this);" onclick="event.stopPropagation();"/>
          <menuitem id="quickfilters-changelog"    label="__MSG_quickfilters.menu.changelog__" class="menuitem-iconic" oncommand="window.quickFilters.doCommmand(this);" onclick="event.stopPropagation();" />
          <menuitem id="quickfilters-gopro"   label="__MSG_getquickFilters__" class="menuitem-iconic" oncommand="window.quickFilters.doCommmand(this);" onclick="event.stopPropagation();"/>
        </menupopup>
      </button>
    `); 

    let mnuToolsCreateFromMsg  = document.getElementById("quickFilters-menu-filterFromMsg");
    if (mnuToolsCreateFromMsg) {
      mnuToolsCreateFromMsg.label = mnuToolsCreateFromMsg.label.replace("quickFilters: ", "");
    }

  }
  else {
    console.log("quickFilters - mainButton not found!!")
  }
}

quickFilters.TabListener = {
  selectTab: function(evt) {
    const isMailPane = quickFilters.Util.isTabMode (evt.detail.tabInfo, "mail");
    if (isMailPane) {
      quickFilters.patchMailPane();
      quickFilters.Util.notifyTools.notifyBackground({ func: "updatequickFiltersLabel"});
    }
  },
  openTab: function(evt) {
    function getTabDebugInfo(tab) {
      return `[ mode = ${tab.mode.name}, title = ${tab.title}, tabId = ${tab.tabId} ]`;
    }
    let tabmail = document.getElementById("tabmail");
    // evt.detail.tabInfo.tabId 
    const newTabInfo = tabmail.tabInfo.find(e => e == evt.detail.tabInfo);
    const RETRY_DELAY = 2500;
    if (newTabInfo) {
      const isMailPane = quickFilters.Util.isTabMode (newTabInfo, "mail");
      if (isMailPane) {
        quickFilters.patchMailPane();
      }

      if (newTabInfo.quickFilters_patched) {
        quickFilters.Util.logDebug("Tab is already patched: " + getTabDebugInfo(newTabInfo));
        return;
      }
      quickFilters.Util.logDebugOptional("listeners", 
        "quickFilters.TabListener.openTab() \n" + getTabDebugInfo(newTabInfo));
      if (isMailPane) {  // let's include single message tabs, let's see what happens
        try {
          if (typeof newTabInfo.chromeBrowser.contentWindow.commandController == "undefined") {
            quickFilters.Util.logDebug("commandController not defined, retrying later..." + getTabDebugInfo(newTabInfo));
            setTimeout(() => { 
                quickFilters.TabListener.openTab(evt); 
              }, 
              RETRY_DELAY);
            return;
          }
        }
        catch(ex) {
          quickFilters.Util.logException("Patching failed", ex);
          return;
        }

        quickFilters.Util.logDebug("Starting to monkey patch new Tab:" + getTabDebugInfo(newTabInfo));
        const callBackCommands = newTabInfo.chromeBrowser.contentWindow.commandController._callbackCommands;
        // backup wrapped functions:
        callBackCommands.quickFilters_cmd_moveMessage = callBackCommands.cmd_moveMessage; 
        callBackCommands.quickFilters_cmd_copyMessage = callBackCommands.cmd_copyMessage; 
        callBackCommands.quickFilters_cmd_archive = callBackCommands.cmd_archive;
    
        callBackCommands.cmd_moveMessage = function (destFolder) {
          quickFilters.MsgMoveCopy_Wrapper(destFolder, false, callBackCommands.quickFilters_cmd_moveMessage);  
        }
   
        callBackCommands.cmd_copyMessage = function (destFolder) {
          quickFilters.MsgMoveCopy_Wrapper(destFolder, true, callBackCommands.quickFilters_cmd_copyMessage);  
        }        

        // monkey patch for archiving
        callBackCommands.cmd_archive = function () {
          quickFilters.MsgArchive_Wrapper(callBackCommands.quickFilters_cmd_archive);
        }

        // monkey patch foldertree drop method
        quickFilters.patchFolderTree(newTabInfo);
        newTabInfo.quickFilters_patched = true;
        quickFilters.Util.logDebug("new Tab patched successfully.");
      }
    }
  } 
}


