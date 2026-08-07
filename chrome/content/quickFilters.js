"use strict";

/* 
BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK 
*/

/*
  globals
    DefaultController 
    goDoCommand 
  */


/*===============
  Project History
  ===============

  legacy history (0.8 - 5.9.2) moved to file: history_legacy.txt

  Note: All Dates here are given in UK format - dd/MM/yyyy

  Personnel:
  AG - Axel Grude - Lead Developer, Marketing and owner of this project
  KB - Klaus Buecher - Head Developer for Thunderbird 78 conversion
  RM - Richard Marti - Icon Design + Layout Tb78
    
  6.0 - 30/06/2023
    # [issue 181] Version compatibility with Thunderbird 115 (SuperNova UI)
    # - new browser action button
    # - messageServiceFromURI moved to MailServices
    # - richtlistbox.insertItemAt deprecated
    # - all commands are now in unified toolbar dropdown menu
    # - adjusted styles for news / license warning menu items for better visibility
    # option to disable notification after running filters manually (quickFilters Pro)
    # - Fix integration of buttons on QuickFolders Navigation bar (Current Folder Toolbar)

  6.1 - 22/07/2023
    # - [issue 197] quickFilters 6.0.* Backups stored in broken format
    # Added thread list menu item "Create Filter from message"

  6.1.1 - 29/07/2023
    # Improved main action menu (show filters is now in the main menu)
    # modified QuickFolders Navigation bar integration for Tb115 to require either license
    # Registration dialog: made sure it can be scrolled down on small screens
    #                      Fixed "license is valid" label
    # Settings Dialog: Fixed "renew license" dialog button 

  6.2 - 13/08/2023
    # [issue 203] Added folder context menu entries: find filters, run filters.
    # [issue 203] Added tools content menu: Start Filter Assistant
    # [issue 204] Edit Custom filters shows all filters in Local folders 
    # Fixed some German translations..
    # Fix duplicated message context menu... ??
    # [issue 205] QuickFolders + quickMove fails to invoke the assistant
    # [issue 206] When creating new filters - Reading headers can fail if mail is larger than 16kByte

  6.2.1 - 22/08/2023
    # [issue 208] Fixed: global keyboard shortcuts for running filters don't work anymore 
    # Show localized date in registration dialog
    # After the license was viewed via the menu "check license status", now reset the "renew license" button for the day and return to normal toolbar icon (no color / message).

  6.2.2 - 30/08/2023
    # [issue 210] Autostart assistant problems: button not highlighted when updating / starting Add-on from extension manager

  6.3 - 18/10/2023
    # [issue 220] Fixed: Create filter from message with Custom templates may fail
    # [issue 221] Fixed: quickFilters assistant not triggered anymore by adding Tags to Emails
    # [issue 215] Optimized code to show assistant if folder database need to be repaired
    # [issue 217] Optimize the registration screen, it's too tall 
    # Completed translations for traditional Chinese 

  6.4 - 11/04/2024
    # [issue 225] Betterbird fixes
    # Add Alias to register dialog if already set in a license
    # Improved Italian Translations thanks to Leopoldo Saggin 
    # Opening support sites in a tab is now using API method
    # [issue 235] Assistant not opening when using context menu to create filter from message (in local folder)
    # [issue 237] increase tooltips of toolbar buttons in messages list
    # [issue 234] WIP - Special quickFilters buttons are not displayed on QuickFolders Navigation Bar (current folder bar)

  6.5.1 - 16/07/2024 
    # [issue 138] Made compatible with Thunderbird 128
    # [issue 244] Fix file picker which is broken in Thunderbird 125 [bug 1882701]
    # Fixed reading & prefilling headers in custom filter templates
    # [issue 243] Dialog buttons cut off on filter assistant window (Ubuntu 22.04)
    # optimize licenser (omit folders while listing accounts)

  6.5.2 - 09/08/2024
    # [issue 249] Fixed: Cut & Paste filters doesn't work in Thunderbird 128  
    # [issue 258] Thunderbird 128 - Notifications are now async! This may lead to the filter 
                  assistant not starting up successfully
    # Improved dark theme support to message filters window
    # Some theme fixes for icons: copy/cut icons for filters dialog
    # Removed vendor prefix from -moz-appearance
    # [issue 254] msgsMoveCopyCompleted: remove "no destmsg!"


  6.5.3 - 27/08/2024
    # [issue 262] Maintenance fix in v6.5.3: The merge filters option had stopped working in 6.5.2 
    # Added compatibility with Thunderbird 130
    
  6.6 - 07/03/2025
    # made compatible with Tb 137.*+   
    # [issue 294] Support Filter search terms Sort button with complex filters (Betterbird)
    # [issue 282] Fixed: Copying filters across to different server links the filters
    # [issue 284] Compatibility with Tb 134: fixed a problem with broken notification box (.shown() removed)
    # [issue 293] Thunderbird 136 retires ChromeUtils.import - replace with importESModule
    # [issue 295] Remove the custom templates actions tooltip from 'normal' filter editor.
    # [issue 275] Keyboard Shortcut conflict with 'AI Anywhere' extension
    

  6.6.1 - 01/05/2025
    # made compatible with Tb 138.*+   
    # [issue 299] Fixed feature to run filters on local folder inbox
    # Improved icons to distinguish menu commands which run filters from other ones

  6.7 - 23/07/2025
    # made compatible with Tb 141.*
    # [issue 308] Fixed: Thunderbird 141 removed nsIMsgFolder.prettyName
    # [issue 305, issue 318] Added context menu item to allow running filters 
    #     automatically on folders other than inbox (IMAP only)
    # [issue 301] Fixed: Custom fields %from(domain)%, %from% create empty search terms
    #             when moving mail + merging via assistant
    # Fixed finding duplicate filters from tags (qFilters-list.js:1360)

  6.8 - 14/08/2025
    # [issue 313] context menu "Find filters" and "Run Filters" work on current folder and not on clicked folder
    # [issue 309] Convert Assistant window from XUL to HTML
    # Improved settings dialog to avoid vertical truncation
    # Improve handling recipient / author retreive from msg during assistant (using MailUtils.headerParser)
    # Improved filter search: avoids being mislead by old / incorrect account keys. these can be created by 
    # importing account data or renaming / moving accounts.

  6.8.1 - 18/08/2025
    # [issue 315] Call new html assistent dialog from "merge" function in filter list. 
    #             let params = { answer: null, selectedMergedFilterIndex: -1, cmd: "mergeList" },
    # During merge, removed code that disabled target folder option (triggered by starred message)

  6.8.2 - 27/08/2025
    # [issue 231] Implement [Enter] and [Escape] keys to cause default action / close in filter assistant
    # [issue 317] Thunderbird 143: menu icons of main toolbar button missing
    # [issue 320] Regression: Cannot copy messages using the "Move To" / "copy To" messages context menu
    # known issue: icons in search options of message filters need to also be fixed for Tb 143
    # [issue 318] WIP - added switch extensions.quickfilters.notifications.changelog to disable version tab

  6.8.3 - 19/08/2025
    # Compatibility with Thunderird 144
    # Improved help button icon in assistant
    # [issue 317] Fixed menu icons broken Thunderbird 143 in filter list popup menu and search options 
    # [issue 318] Added option in settings dialog to disable version tab 
    # [issue 321] Improved quickFilters integration with QuickFolders — button injection & toolbar fixes

  6.9 - 22/10/2025
    # Compatibility with Thunderird 145
    # [issue 325] Convert Settings Dialog from XUL to HTML
    # [issue 322] Merging filters broken in new html assistant
    # [issue 327] Moving mail across accounts - HTML Assistant creates new filter, deletes old one instead of merging
    # [issue 324] Disable Assistant in Composer
    # [issue 326] Thunderbird 143: Custom Filter Template modifications missing
    # [issue 324] Removed "Start Filter Assistant" in Composer
    # [issue 323] "Mailing List" filter template shows alert: "currentHeaderData is not defined"
    # Improved html assistant: integration of next steps; more resilient filter search API 
    # (these used to fail with invalid actions and cause complete blocking of the assistant) 

  6.9.1 - 31/10/2025
    # Improved accessibility in new HTML Settings dialog, including correct tab reuse + navigation in URI
    # [issue 330] HTML Settings: quickFilters Licenses screen is not configured properly without license key
    # [issue 328] Regression: Current folder buttons (on the QuickFolders toolbar) don't update immediately
    # [issue 329] HTML settings: Show "extend license" button by clicking on expiry date

  6.9.2 - 03/11/2025
    # Fix: Now always Remove go pro menu item when news are displayed with a valid license
    # Fixed Merging - there was a problem with a data type in the new Filters API
    # Remove assignments to innerHTML in update / install welcome screens
    # Improved merging filters in new HTML assistant, by making API calls more robust

  6.10 - 04/01/2026 (reviewed 13/01/2026)
    # [issue 339] Improve startup stability
    # [issue 335] Improve default filter names based on Custom Templates.
    # [issue 338] Empty search terms from assistant or built-in templates 
    #     (Reply-To, filter-tagging) now display correctly in the editor.
    #     (Tb used to remove the edit box)
    # [issue 334] Add keyboard shortcut for 'Create Filter from Message'
    # [issue 331] After quickFilters 6.9.2 HTML Assistant - "Automatically select Merge" 
    #             not honored (need to be selected each time)
    # [issue 333] Fixed: Extend License button opens 2 tabs
    # bring assistant to foreground if lock is on and user tries to spawn a new one
    # Custom Template Editor / Filter Editor: gFilter was removed in modern versions of Thunderbird

  6.11 - 27/01/2026
    # [issue 346] - _toggleMessageTag was moved in Tb145, see [bug 1990790]
    # [issue 290] Add parent folder names in Filter Name for "Move / copy Message" actions
    # [issue 341] Message Filters ⇒ New... ⇒ Copy... creates TWO Copies
    # [issue 342] Allow merging of a single mail to group filter
    # [issue 343] Enhance Filter Naming: Add Subject Keyword Blacklist and Multi-Topic Support
    # [issue 344] Improved subject matching: detect subjects starting with the same word combos
    # Removed old settings dialog (xul will be deprecated in the future)

  6.12 - 30/03/2026
    # Compatibility with Thunderbird 151
    # [issue 349] Replace deprecated showAlertNotification with showAlert
    # [issue 350] List-Id header case sensitive 🡆 Filter creation with template "Mailing Lists" fails
    # [issue 354] Add “Switch to Free version” option and license backup / recovery after key expiry 
    # [issue 346] quickFilter assistant does not trigger after manual tag changes (Tb 147) 
    # [issue 356] Right-click on Thunderbird account in folder tree shows an error in console
    # [issue 357] Toolbar Icons should reflect the main theme color
    # [issue 359] Remove duplicate condition - context menu missing icon

  6.12.2 - 07/04/2026
    # [issue 360] Domain Renewal mislabelled. 

  6.12.3 - 09/06/2026
    # support for Thunderbird 152
    # [issue 364] Fixed: HTML Assistant cannot populate preview message when moving mail to local folder
    # Fixed: License key restore has the wrong key (QuickFolders instead of quickFilters)

  6.13 - 03/07/2026
    # new Github Default branch ESR140
    # Added Czech translation
    # [issue 367] Convert Legacy Preferences to new local storage
    # [issue 362] Set Minimum Version to Thunderbird 140 to avoid problems with deprecated APIs
    # [issue 364] HTML Assistant cannot read API message preview when moving mail to local folder
    # [issue 365] Improved integration of buttons in QuickFolders Current Folder toolbar
    # [issue 366] Search filters by folder URI (parts of target folder path)
    # [issue 372] Fixed: Console error thrown by getUserName
    # [issue 373] Modernize calling assistant: use external Message list
    # [issue 374] External API discovery function: add and document listExternalCommands

  6.13.1 - 12/07/2026
    # [issue 382] 3pane window content truncated at top. Originally reported on QuickFolders Github issue 673
    # [issue 376] Filter assistant not using correct built in template (domain instead from)
    # [issue 380] Remember position of Filter Assistant window. New option to force assistant to the top.
    # [issue 365] Improved QuickFolders current folder bar integration stability
    # [issue 367] Support reading debug settings in legacy code
    # -----------------
    # Note for reviewers: we still require the "tabs" permission in manifest.json to 
    #      read the URL of iterated tabs for the reopening settings on qi-utils.js:97
 
  6.13.2 - WIP
    # [issue 365] Further Improved QuickFolders current folder bar integration stability
    # [issue 383] exception in quickFilters.Worker.Create.Filter: can't access property "startswith," template is null
    # [issue 245] Backup failing - clicking on button doesn't do anything (Betterbird, OpenSuse)
    # Some fixes in Polish locale file that showed wrong language in settings

    
  ============================================================================================================
  6.* - WIP
    # [issue ]   
    # [issue ]   
    
    
    # [issue ]   
    # [issue ]   
    # convert settings to html / Thunderbird tab

   
  FUTURE WORK:
  PREMIUM FEATURES:
    # [Bug 26690] Add Extra Column In Filter Browser "Auto"
    # [Bug 25409] Extended autofill on selection: Date (sent date), Age in Days (current mail age), Tags, Priority, From/To/Cc etc., (Full) Subject
    # [Bug 25801] Assistant in Merge mode, cancel does not undo changes 
    # use browser.messagesonMoved.addListener(listener, {reason: "user" })
    
   */

var { MailServices } = ChromeUtils.importESModule("resource:///modules/MailServices.sys.mjs");
    
var quickFilters = {
  Properties: {},
  blocks: {
    _map: {},

    /**
     * Attempt to block an action.
     * @param {string} action
     * @returns {boolean} true if already blocked, false if newly blocked
     */
    tryBlock(action) {
      if (this._map[action]) {
        return true; // Already blocked
      }
      this._map[action] = true;
      return false; // Newly blocked
    },

    release(action) {
      delete this._map[action];
    },

    isBlocked(action) {
      return !!this._map[action];
    },
  },
  _pendingAssistantRequests: [],
  _folderTree: null,
  strings: null,
  initialized: false,
  firstRunChecked: false,
  firstRunCount: 0,
  quickFilters_originalDrop: null,
  // was esNewAssistantMode, now optimised out
  // Keep property for legacy QuickFolders reads.
  isNewAssistantMode: false,
  isLoading: false,
  get notificationService() {
    return MailServices.mfn; //nsIMsgFolderNotificationService
  },

  /*******
  as we cannot add quickFilters_originalDrop to folderTree
  Error: Cannot modify properties of a WrappedNative = NS_ERROR_XPC_CANT_MODIFY_PROP_ON_WN
  **/

  get folderTree() {
    return document.getElementById("folderTree");
  },

  get folderTreeView() {
    try {
      if (!this.folderTree) {
        this.folderTree = document.getElementById("folderTree");
      }

      if (this.folderTree.tagName == "ul") {
        // Thunderbird 112+
        if (gFolderDisplay && gFolderDisplay.tree) {
          return gFolderDisplay.tree.view;
        }
      }
    } catch (ex) {
      console.log("quickFilters - get folderTreeView() failed", ex);
    }
    return null;
  },

  onLoadQuickFilters: async function () {
    // initialization code - guard against all other windows except 3pane
    let util = quickFilters.Util,
      el = document.getElementById("messengerWindow");
    if (this.isLoading) {
      return;
    } // avoid multiple onLoad triggering (Postbox?)
    if (!el || el.getAttribute("windowtype") !== "mail:3pane") {
      return;
    }
    this.isLoading = true;
    try {
      // eslint-disable-next-line no-unused-vars
      let v = util.Version; // start the version proxy, throw away v

      util.logDebugOptional("events,listeners", "quickFilters.onload - starts");
      this.strings = document.getElementById("quickFilters-strings");

      // TEST CODE...
      let folderTrees = [];
      window.gTabmail.tabInfo
        .filter((t) => t.mode.name == "mail3PaneTab")
        .forEach((tabInfo) => {
          folderTrees.push(
            tabInfo.chromeBrowser.contentWindow.document.getElementById("folderTree")
          );
        });
      // new drop handler, see
      // https://searchfox.org/comm-central/source/mail/base/content/about3Pane.js#1806
      // folderPane._onDrop

      // window.gTabmail.tabInfo[0].chromeBrowser.contentWindow.folderPane._onDrop(event)
      quickFilters.Util.notifyTools.notifyBackground({ func: "addKeyListener" });

      this.initialized = true;

      // for move to / copy to recent context menus we might have to wrap mailWindowOverlay.js:MsgMoveMessage in Tb!
      if (quickFilters.Preferences.getBoolPref("autoStart") && !quickFilters.Util.AssistantActive) {
        util.logDebugOptional("events", "setTimeout() - toggle_FilterMode");
        setTimeout(function () {
          quickFilters.Worker.toggle_FilterMode(true, true);
        }, 100);
      }

      if (!quickFilters.doCommandOriginal) {
        quickFilters.doCommandOriginal = DefaultController.doCommand;
        DefaultController.doCommand = quickFilters.doCommandWrapper;
      }

      // Add Custom Terms... - only from next version after 2.7.1 !
      if (quickFilters.Preferences.getBoolPref("templates.replyTo")) {
        try {
          let customId = quickFilters.CustomTermReplyTo.id,
            filterService = MailServices.filters; // nsIMsgFilterService
          if (!filterService.getCustomTerm(customId)) {
            //l10n
            quickFilters.CustomTermReplyTo.name = util.getBundleString(
              "quickfilters.customfilter.replyto",
              "Reply-To"
            );
            util.logDebug("Adding Custom Term: " + quickFilters.CustomTermReplyTo.name);
            filterService.addCustomTerm(quickFilters.CustomTermReplyTo);
          } else {
            util.logDebug("Custom Filter Term exists: " + customId);
          }
        } catch (ex) {
          util.logException("Adding custom filter failed ", ex);
        }
      }

      util.logDebugOptional("events", "setTimeout() - checkFirstRun");
      setTimeout(function () {
        quickFilters.checkFirstRun();
      }, 1000);

      quickFilters.Util.notifyTools.notifyBackground({ func: "toggleCurrentFolderButtons" });
      quickFilters.Util.notifyTools.notifyBackground({ func: "updatequickFiltersLabel" }); // initialize the button in case there was an ignored update!
    } catch (ex) {
      quickFilters.Util.logException("quickFilters.onLoadQuickFilters failed", ex);
    } finally {
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

  patchFolderTree: function (tabInfo) {
    quickFilters.Util.logDebug("patchFolderTree", tabInfo);
    let fPane = tabInfo.chromeBrowser.contentWindow.folderPane;
    if (fPane && !fPane.quickFilters_originalDrop) {
      fPane.quickFilters_originalDrop = fPane._onDrop;
      let newDrop = function (event) {
        if (quickFilters.Util.AssistantActive) {
          try {
            quickFilters.onFolderTreeViewDrop(event);
            quickFilters.Util.logDebug("Drop event detected!");
          } catch (e) {
            quickFilters.Util.logException("quickFilters.onFolderTreeViewDrop FAILED\n", e);
          }
        }
        fPane.quickFilters_originalDrop.apply(fPane, arguments); // call original drop function.
      };
      fPane._onDrop = newDrop;
    }
  },

  showOptions: function () {
    quickFilters.Util.notifyTools.notifyBackground({
      func: "quickFiltersSettings",
    });
  },

  checkFirstRun: async function () {
    let util = quickFilters.Util,
      prefs = quickFilters.Preferences;
    try {
      if (this.firstRunChecked) {
        return;
      }
      this.firstRunCount++;
      util.logDebug(
        "=================quickFilters==============\n" +
          "   checkFirstRun() - attempt " +
          this.firstRunCount
      );
      let currentVersion = util.Version;
      let installedVersion = prefs.getCharPref("installedVersion"),
        firstRun = prefs.getBoolPref("firstRun");
      util.logDebug(
          `firstRun = ${firstRun}  - currentVersion = ${currentVersion}  - installed = ${installedVersion}`
      );
      let toolbarId = "";
      if (firstRun) {
        toolbarId = "mail-bar3";
        util.installButton(toolbarId, "quickfilters-toolbar-button");
        util.installButton(
          toolbarId,
          "quickfilters-toolbar-listbutton",
          "quickfilters-toolbar-button"
        );
        await prefs.setBoolPref("firstRun", false);
        util.showHomePage();
      } else {
        // is this an update?
        let installedV = util.getVersionSimple(installedVersion),
          currentV = util.getVersionSimple(currentVersion);
        if (currentVersion.indexOf("hc") == -1) {
          if (util.versionLower(installedV, currentV)) {
            util.logDebug(
              "update case: showing version history\n" +
                `Current Version: ${installedV}\n` +
                `New Version: ${currentV}`
            );
            if (prefs.getBoolPref("notifications.changelog")) {
              util.showVersionHistory();
            }
          }
        } else {
          util.logDebug("currentVersion not determined: " + currentVersion);
        }
        util.logDebug("store installedVersion: " + util.getVersionSimple(currentVersion));
        await prefs.setCharPref("installedVersion", util.getVersionSimple(currentVersion));
      }
      this.firstRunChecked = true;
    } catch (ex) {
      util.logException("checkFirstRun failed", ex);
    }
  },

  onMenuItemCommand: async function (cmd, eventDetail = null) {
    const util = quickFilters.Util,
      Ci = Components.interfaces,
      prefs = quickFilters.Preferences;
    let isBlockLocal = false;
    
    switch (cmd) {
      case "toggle_Filters":
        // this one is now async
        quickFilters.Worker.toggle_FilterMode(!quickFilters.Util.AssistantActive);
        break;
      case "createFilterFromMsg":
        try {
          let theContext = "";
          // prevent multiple events
          if (quickFilters.blocks.tryBlock("createFilterFromMsg")) {
            util.logDebugOptional("assistant", "Prevented blocked createFilterFromMsg event");
            return;
          }
          util.logDebugOptional("assistant", "createFilterFromMsg menu item command triggered");
          isBlockLocal = true;
          let selectedMessageUris = [],
            selectedMessages = [],
            selectedApiMessages = [],
            messageList = [],
            isInbox = false;
          let sourceFolder;


          if (eventDetail) {
            // this is passing info from API: the tab id + message ids.
            // tabId: currentTab.id, windowId: currentTab.windowId, messages: selectedMessages
            theContext = eventDetail.context;
            let msg = eventDetail.messages;
            for (let i = 0; i < msg.messages.length; i++) {
              let m = msg.messages[i];
              // store API message metadata separately - for my new html window
              selectedApiMessages.push({
                messageId: m.id,
                folder: {
                  accountId: m.folder.accountId,
                  path: m.folder.path,
                },
              });

              // XPCOM - nsIMsgHdr
              let realMessage = await window.quickFilters.Util.messageManager.get(m.id);
              selectedMessages.push(realMessage || m);
              selectedMessageUris.push(null); // there is no URI!
            }
            sourceFolder = util.getCurrentFolder();
          } else {
            theContext = "fromSelectedMessages";
            // consider XPCOM=>API conversion for selectedApiMessages?
            selectedMessages = quickFilters.Util.getSelectedMessages(selectedMessageUris, true);
            if (selectedMessages.length) {
              sourceFolder = selectedMessages[0].folder;
            }
          }
          // && selectedMessages[0].folder.server.canHaveFilters
          if (selectedMessages.length > 0 && sourceFolder) {
            // check the tags
            let firstSelectedMsg = selectedMessages[0];
            let tags =
              firstSelectedMsg.tags ||
              (firstSelectedMsg.getStringProperty
                ? firstSelectedMsg.getStringProperty("keywords")
                : firstSelectedMsg.Keywords);
            isInbox = sourceFolder.flags & util.FolderFlags.Inbox;
            if (
              isInbox &&
              prefs.getBoolPref("warnInboxAssistant") &&
              (!tags ||
                tags.length == 0 ||
                tags.toLowerCase() == "nonjunk" ||
                tags.toLowerCase() == "junk")
            ) {
              // if email is still in inbox and also has no tags, warn about this
              let checkState = { value: false },
                promptTxt = util.getBundleString(
                  "quickfilters.createFromMail.inboxWarning",
                  "Create filter from message is much more useful if you have already moved " +
                    "the mail to a different folder or added a tag to it, as quickFilters " +
                    "will then select the appropriate Action for you.\n" +
                    "Still create a filter from this message?"
                ),
                ans = Services.prompt.confirmCheck(
                  null,
                  "quickFilters",
                  promptTxt,
                  util.getBundleString(
                    "quickfilters.promptDontRepeat",
                    "Do not show this message again."
                  ),
                  checkState
                );
              if (checkState.value == true) {
                await prefs.setBoolPref("warnInboxAssistant", false); // disable warning for the future
              }
              if (!ans) {
                return;
              } // early exit
            }

            // ### [Bug 25688] Creating Filter on IMAP fails after 7 attempts ###
            for (let m = 0; m < selectedMessages.length; m++) {
              // ### Bug 25727 Allow to create Group Filter with "Create Filter from Message" menu
              messageList.push(
                util.makeMessageListEntry(selectedMessages[m], selectedMessageUris[m])
              );
            }
            // the original command in the message menu calls the helper function MsgCreateFilter()
            // we do not know the primary action on this message (yet)
            let currentMessageFolder = util.getCurrentFolder();
            if (util.isVirtual(currentMessageFolder)) {
              if (firstSelectedMsg.folder) {
                // find the real folder!
                // this may be from the API
                if (eventDetail) {
                  try {
                    util.logDebug(
                      `calling extension.folderManager.get(${firstSelectedMsg.folder.accountId},${firstSelectedMsg.folder.path})`
                    );
                    let realFolder = window.quickFilters.Util.folderManager.get(
                      firstSelectedMsg.folder.accountId,
                      firstSelectedMsg.folder.path
                    );
                    currentMessageFolder = realFolder;
                  } catch (ex) {
                    util.logException(
                      "Cannot determine folder of selected message using folderManager API!",
                      ex
                    );
                    util.logHighlightDebug(
                      "Fallback to using the virtual folder\n- this may lead to problems determining where to create the filters",
                      util.debugStyleImportant,
                      { folder: firstSelectedMsg.folder }
                    );
                    currentMessageFolder = firstSelectedMsg.folder;
                  }
                } else {
                  currentMessageFolder = firstSelectedMsg.folder;
                }
              }
            }
            let fA = null;
            if (!isInbox) {
              fA = Ci.nsMsgFilterAction.MoveToFolder;
            }
            if (firstSelectedMsg.isFlagged) {
              // fA = Ci.nsMsgFilterAction.AddTag;
              fA = Ci.nsMsgFilterAction.MarkFlagged; // ??
            }
            
            const isAssistantModeHTML = quickFilters.Preferences.isAssistantModeHTML;
            const isFromMsgContext =
              eventDetail && (isAssistantModeHTML ? theContext === "fromMessageContext" : true);

            // now really an async function:
            quickFilters.Worker.startFilterAssistant({
              sourceFolder: null,
              targetFolder: currentMessageFolder,
              messageList,
              selectedApiMessages,
              filterAction: fA,
              filterActionExt: false,
              isMsgContext: isFromMsgContext,
              context: theContext,
            });
          } else {
            let wrn = util.getBundleString(
              "quickfilters.createFromMail.selectWarning",
              "To create a filter, please select exactly one email!"
            );
            await util.popupAlert(wrn);
          }
        } catch(ex) {
          util.logException("createFilterFromMsg", ex);
          if (quickFilters.Preferences.isDebug) {
            // eslint-disable-next-line no-debugger
            debugger;
          }
        } finally {
          util.logDebugOptional("assistant", `createFilterFromMsg- finally isBlockLocal:${isBlockLocal}`);
          if (isBlockLocal) {
            quickFilters.blocks.release("createFilterFromMsg");
            util.logDebugOptional("assistant", "released block on createFilterFromMsg");
          }
        }
    }
  },

  onToolbarButtonCommand: function (_e) {
    // just reuse the function above.  you can change this, obviously!
    quickFilters.onMenuItemCommand("toggle_Filters");
  },

  onToolbarListCommand: function (_e) {
    if (quickFilters.Util.versionSmaller(quickFilters.Util.AppverFull, "110")) {
      goDoCommand("cmd_displayMsgFilters");
    } else {
      MsgFilters();
    }
  },

  onApplyFilters: function (silent, forceFolder = null) {
    // does this work in non-inbox current folder?
    // Get the folder where filters should be defined, if that server
    // can accept filters.
    const util = quickFilters.Util,
      Ci = Components.interfaces,
      Cc = Components.classes;

    let folder = forceFolder || util.getCurrentFolder(),
      msgWindow = Cc["@mozilla.org/messenger/msgwindow;1"].createInstance(Ci.nsIMsgWindow);

    // from  MsgApplyFiltersToSelection()
    if (!silent && quickFilters.Preferences.getBoolPref("notifications.runFilter")) {
      let text = quickFilters.Util.getBundleString(
        "quickfilters.runningFiltersOnFolder.notify",
        "Running filters on folder {1}"
      );
      util.slideAlert(
        text.replace("{1}", folder.prettyName || folder.localizedName),
        "quickFilters"
      );
    }

    if (folder.flags & util.FolderFlags.Inbox) {
      // MsgApplyFilters();
      goDoCommand("cmd_applyFilters");
    } else {
      // is the account itself selected?
      if (folder.isServer) {
        console.log(
          `Attempt to run filters on account [${
            folder.prettyName || folder.localizedName
          }]: no folder selected - trying to find related Inbox instead`
        );
        // use inbox instead.
        folder = folder.subFolders.find((f) => f.flags & 4096);
        if (!folder) {
          console.log("Could not determine inbox - not running filters!");
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
        selectedFolders = isListArray
          ? []
          : Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
      if (isListArray) {
        selectedFolders.push(folder);
      } else {
        selectedFolders.appendElement(folder, false);
      }
      // make sure the temp filter list uses the same log stream
      tempFilterList.logStream = curFilterList.logStream;
      tempFilterList.loggingEnabled = curFilterList.loggingEnabled;
      let newFilterIndex = 0;
      try {
        for (let i = 0; i < numFilters; i++) {
          let curFilter = curFilterList.getFilterAt(i);
          // only add enabled, UI visibile filters that are in the manual context
          if (
            curFilter.enabled &&
            !curFilter.temporary &&
            curFilter.filterType & Components.interfaces.nsMsgFilterType.Manual
          ) {
            tempFilterList.insertFilterAt(newFilterIndex, curFilter);
            newFilterIndex++;
          }
        }
      } catch (ex) {
        util.logException(ex);
      }

      MailServices.filters.applyFiltersToFolders(tempFilterList, selectedFolders, msgWindow);
    }
  },

  onApplyFiltersToSelection: function (silent) {
    goDoCommand("cmd_applyFiltersToSelection"); // same in Postbox
    if (!silent && quickFilters.Preferences.getBoolPref("notifications.runFilter")) {
      let text = quickFilters.Util.getBundleString(
        "quickfilters.runFiltersOnMails.notify",
        "Applied filters to selected messages"
      );
      quickFilters.Util.slideAlert(text, "quickFilters");
    }
  },

  searchFiltersFromFolder: function (event) {
    const util = quickFilters.Util,
      Ci = Components.interfaces;
    let folders;
    if (event && event.folderURI) {
      folders = [util.getMsgFolderFromUri(event.folderURI)];
    } else {
      folders = GetSelectedMsgFolders(); // quickFilters.folderTreeView.getSelectedFolders();
    }

    if (!folders.length) {
      return false;
    }
    // 1. open filters list
    //quickFilters.onToolbarListCommand();
    // 2. iterate accounts, find matching filter using the folder as search attribute with "move to folder" search.
    let targetFolder = folders[0],
      matchedAccount,
      matchedFilter;

    try {
      const FA = Ci.nsMsgFilterAction,
        accountList = util.Accounts;
      for (let a = 0; a < accountList.length; a++) {
        let account = accountList[a];
        if (account.incomingServer && account.incomingServer.canHaveFilters) {
          let msg = "",
            ac = account.incomingServer.QueryInterface(Ci.nsIMsgIncomingServer),
            // 2. getFilterList
            filterList = ac.getFilterList(msgWindow).QueryInterface(Ci.nsIMsgFilterList);
          // 3. use  nsIMsgFilterList.matchOrChangeFilterTarget(oldUri, newUri, false)
          if (filterList) {
            // filterList.matchOrChangeFilterTarget(sourceURI, targetURI, false)
            let numFilters = filterList.filterCount;
            util.logDebugOptional(
              "filterSearch",
              `checking account [${ac.prettyName}] for target folder: ${targetFolder.URI}\n` +
                `iterating ${numFilters} filters...`
            );
            for (let i = 0; i < numFilters; i++) {
              let curFilter = filterList.getFilterAt(i),
                actionList = curFilter.sortedActionList,
                acLength = actionList.length;
              for (let index = 0; index < acLength; index++) {
                let action = actionList[index].QueryInterface(
                  Components.interfaces.nsIMsgRuleAction
                );
                if (action.type == FA.MoveToFolder || action.type == FA.CopyToFolder) {
                  if (action.targetFolderUri) {
                    let isTargetMatch = action.targetFolderUri === targetFolder.URI,
                      title = isTargetMatch ? "MATCHED TARGET: " : "Target URI:     ";

                    msg += "[" + i + "] " + title + action.targetFolderUri + "\n";
                    if (isTargetMatch) {
                      util.logDebugOptional(
                        "filterSearch",
                        `FOUND FILTER MATCH at index [${i}]:\n` +
                          `filter '${curFilter.filterName}'\n`
                      );
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
              if (matchedAccount) {
                break;
              }
            }
          }
          if (matchedAccount) {
            break;
          }
          util.logDebugOptional("filterSearch.detail", msg);
        }
      }
    } catch (ex) {
      util.logException("Exception in quickFilters.searchFiltersFromFolder ", ex);
    }
    let aFolder = matchedAccount ? matchedAccount.rootMsgFolder : null;

    // close old window
    // const win = util.getLastFilterListWindow();
    // if (win) win.close();

    quickFilters.Worker.openFilterList(true, aFolder, matchedFilter, targetFolder);

    if (!matchedAccount) {
      let wrn = util.getBundleString(
        "quickfilters.search.warning.noresults",
        "No matching filters found."
      );
      util.popupAlert(wrn, "quickFilters", "fugue-clipboard-exclamation.png");
    } else {
      util.popupProFeature("searchFolder", true);
    }
  },

  LocalErrorLogger: function (msg) {
    Services.console.logStringMessage("quickFilters:" + msg);
  },

  // Tb115 - new drop interface: passes the event now, and not (row, orientation) !
  onFolderTreeViewDrop: function (event) {
    // , aRow, aOrientation
    const Cc = Components.classes,
      Ci = Components.interfaces,
      util = quickFilters.Util,
      worker = quickFilters.Worker,
      dataTransfer = event.dataTransfer;

    let types = dataTransfer.mozTypesAt(0); // one flavor
    if (!types.contains("text/x-moz-message") || !quickFilters.Util.AssistantActive) {
      return;
    }
    util.logDebugOptional(
      "events,msgMove",
      `onFolderTreeViewDrop\ntarget = ${event.target.innerText}`
    );

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
    let isMove =
      Cc["@mozilla.org/widget/dragservice;1"].getService(Ci.nsIDragService).getCurrentSession()
        .dragAction == Ci.nsIDragService.DRAGDROP_ACTION_MOVE;
    if (!sourceFolder.canDeleteMessages) {
      isMove = false;
    }

    // handler for dropping messages
    try {
      util.logDebugOptional(
        "dnd",
        `onDrop: ${messageUris.length} messageUris to ${targetFolder.URI}`
      );
      if (messageUris.length > 0 && !sourceFolder) {
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

      window.setTimeout(async function () {
        worker.startFilterAssistant({
          sourceFolder,
          targetFolder,
          messageList: msgList,
          filterAction: isMove
            ? Ci.nsMsgFilterAction.MoveToFolder
            : Ci.nsMsgFilterAction.CopyToFolder,
          filterActionExt: null,
          isMsgContext: false,
          context: "onTreeviewDrop",
        });
      });
    } catch (e) {
      quickFilters.LocalErrorLogger("Exception in onFolderTreeViewDrop:" + e);
      return;
    }
  },

  onFolderTreeDrop: function (evt, dropData, dragSession) {
    const Ci = Components.interfaces,
      util = quickFilters.Util,
      worker = quickFilters.Worker;
    if (!dragSession) {
      dragSession = Components.classes["@mozilla.org/widget/dragservice;1"]
        .getService(Ci.nsIDragService)
        .getCurrentSession();
    }
    let isMove = dragSession.dragAction == Ci.nsIDragService.DRAGDROP_ACTION_MOVE,
      treeView = quickFilters.folderTreeView,
      dataTransfer = evt.dataTransfer ? evt.dataTransfer : treeView._currentTransfer,
      types = dataTransfer.mozTypesAt(0); // one flavor
    if (!types.contains("text/x-moz-message") || !quickFilters.Util.AssistantActive) {
      return false;
    }

    util.logDebugOptional("dnd", "buttonDragObserver.onDrop flavor[0]=" + types[0].toString());
    let prefBranch = Services.prefs.getBranch("mail."),
      theURI = prefBranch.getCharPref("last_msg_movecopy_target_uri"),
      targetFolder = util.getMsgFolderFromUri(theURI),
      trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(
        Components.interfaces.nsITransferable
      );
    //alert('trans.addDataFlavor: trans=' + trans + '\n numDropItems=' + dragSession.numDropItems);
    trans.addDataFlavor("text/x-moz-message");

    let messageUris = [],
      sourceFolder = null;

    for (let i = 0; i < dragSession.numDropItems; i++) {
      dragSession.getData(trans, i);
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
      } catch (e) {
        quickFilters.LocalErrorLogger(
          "Exception in onDrop item " + i + " of " + dragSession.numDropItems + "\nException: " + e
        );
      }
    }
    // handler for dropping messages
    try {
      util.logDebugOptional(
        "dnd",
        "onDrop: " + messageUris.length + " messageUris to " + targetFolder.URI
      );
      if (messageUris.length > 0) {
        if (quickFilters.Util.AssistantActive) {
          // note: getCurrentFolder fails when we are in a search results window!!
          if (!sourceFolder) {
            sourceFolder = util.getCurrentFolder();
          }
          if (util.isVirtual(sourceFolder)) {
            quickFilters.logDebug(
              "onFolderTreeDrop - Retrieved message from a virtal folder:",
              sourceFolder
            );
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

          window.setTimeout(async function () {
            worker.startFilterAssistant({
              sourceFolder,
              targetFolder,
              messageList: msgList,
              filterAction: isMove
                ? Ci.nsMsgFilterAction.MoveToFolder
                : Ci.nsMsgFilterAction.CopyToFolder,
              filterActionExt: null,
              isMsgContext: false,
              context: "onFolderTreeDrop",
            });
          });
        }
      }
    } catch (e) {
      quickFilters.LocalErrorLogger("Exception in onFolderTreeDrop:" + e);
    }
    return false;
  },

  // read QF options and hide buttons from current folder bar
  toggleCurrentFolderButtons: async function (retries = 0) {
    retries = typeof retries === "number" ? retries : 0;
    const util = quickFilters.Util;
    const prefs = quickFilters.Preferences;
    const MAX_TRIES = 4;

    // define all buttons once
    const buttons = [
      {
        id: "quickfilters-current-runbutton",
        insertAfter: "QuickFolders-currentFolderFilterActive",
        pref: "folderbutton",
        tooltipKey: "quickfilters.RunButton.tooltip",
      },
      {
        id: "quickfilters-current-msg-runbutton",
        insertAfter: "quickfilters-current-runbutton",
        pref: "messagesbutton",
        tooltipKey: "quickfilters.RunButtonMsg.tooltip",
      },
      {
        id: "quickfilters-current-listbutton",
        insertAfter: "quickfilters-current-msg-runbutton",
        pref: "listbutton",
        tooltipKey: "quickfilters.ListButton.tooltip",
      },
      {
        id: "quickfilters-current-searchfilterbutton",
        insertAfter: "quickfilters-current-listbutton",
        pref: "findfilterbutton",
        tooltipKey: "quickfilters.findFiltersForFolder.menu",
      },
    ];

    util.logDebug(`toggleCurrentFolderButtons(retries=${retries})`);

    try {
      // iterate all 3pane documents of mail tabs.
      // .filter((t) => t.mode.name == "mail3PaneTab")
      for (let tabInfo of window.gTabmail.tabInfo) {
        const modeName = tabInfo.mode.name;
        const isThreePane = modeName === "mail3PaneTab";
        const isSingleMessage = modeName === "mailMessageTab"; 
        if (isSingleMessage) {
          util.setAssistantButton(util.AssistantActive);
          continue;
        }
        if (!isThreePane) {continue;}
        let doc = tabInfo.chromeBrowser.contentDocument;
        const container = doc.getElementById("quickFilters-injected");
        const toolbar = doc.getElementById("QuickFolders-CurrentFolderTools");

        if (retries == MAX_TRIES && !toolbar) {
          // try recreating the container
          await window.quickFilters.Util.notifyTools.notifyBackground({
            func: "updateCurrentFolderBar",
            tabId: tabInfo.tabId,
          });
        }        

        if (retries > MAX_TRIES && !toolbar) {
          // no QF toolbar after 30 seconds. let's give up to avoid infinite processing
          console.log(
            `toggleCurrentFolderButtons() - giving up after ${retries} tries without any QF toolbar.`
          );
          continue; // no more retries
        }

        if (!container) {
          if (toolbar) {
            // QuickFolders toolbar exists but our container is gone (e.g. after a QF update).
            // Buttons are almost certainly still in the DOM but stranded — move them directly.
            const refNode = doc.getElementById("QuickFolders-Options");
            const prefsMap = new Map(
              buttons.map((btn) => [btn.pref, prefs.getBoolPref(`quickfolders.curFolderbar.${btn.pref}`)])
            );
            const foundButtons = buttons.filter((btn) => doc.getElementById(btn.id));
            if (foundButtons.length) {
              util.logDebug(`toggleCurrentFolderButtons: moving ${foundButtons.length} stranded buttons directly into toolbar`);
              foundButtons.forEach((btn) => {
                const element = doc.getElementById(btn.id);
                toolbar.insertBefore(element, refNode);
                element.collapsed = !prefsMap.get(btn.pref);
              });
              continue; // buttons restored — process next tab
            }
            // Buttons gone entirely — trigger re-injection and retry
            if (retries >= MAX_TRIES) {
              util.logDebug(`toggleCurrentFolderButtons: giving up re-injection after ${retries} retries — toolbar present but buttons never appeared`);
              continue;
            }
            util.logDebug(`toggleCurrentFolderButtons: toolbar present but no buttons found (retry ${retries}) — triggering bar update`);
            await window.quickFilters.Util.notifyTools.notifyBackground({
              func: "updateCurrentFolderBar",
              tabId: tabInfo?.tabId ?? null,
            });
            setTimeout(() => quickFilters.toggleCurrentFolderButtons(retries + 1), 2000);
          } else {
            // No toolbar yet — wait progressively longer for Tb / QF to finish loading
            setTimeout(
              () => quickFilters.toggleCurrentFolderButtons(retries + 1),
              10000 + retries * 10000
            );
          }
          return;
        }

        const prefsMap = new Map(
          buttons.map((btn) => [
            btn.pref,
            prefs.getBoolPref(`quickfolders.curFolderbar.${btn.pref}`),
          ])
        );

        buttons.forEach((btn) => {
          let element = doc.getElementById(btn.id);
          if (!element) {
            // recreate missing button, through our injection script
            const win = doc.defaultView;
            element = win.quickFilters_injectButton(container, btn.id, {
              insertAfter: btn.insertAfter,
              tooltip: quickFilters.Util.getBundleString(btn.tooltipKey),
            });
          }

          if (toolbar) {
            const refNode = doc.getElementById("QuickFolders-Options");
            toolbar.insertBefore(element, refNode);
          }

          // collapse according to current QuickFolders preference
          element.collapsed = !prefsMap.get(btn.pref);
        });
      }
    } catch (ex) {
      util.logException("toggleCurrentFolderButtons()", ex);
    }
  },

  /*
   * Deprecated: MsgMove_Wrapper and MsgCopy_Wrapper not used anymore.
   * Consider removing after verifying no external calls depend on them.
   */
  MsgMove_Wrapper: function (uri) {
    const util = quickFilters.Util;
    try {
      util.logDebugOptional(
        "msgMove",
        " quickFilters.executeMoveMessage == quickFilters.MsgMove_Wrapper :" +
          (quickFilters.executeMoveMessage == quickFilters.MsgMove_Wrapper)
      );
      quickFilters.MsgMoveCopy_Wrapper(uri, false);
    } catch (ex) {
      util.logException("MsgMove_Wrapper()", ex);
    }
  },

  MsgCopy_Wrapper: function (uri) {
    const util = quickFilters.Util;
    try {
      util.logDebugOptional(
        "msgMove",
        " quickFilters.executeCopyMessage == quickFilters.MsgMove_Wrapper :" +
          (quickFilters.executeCopyMessage == quickFilters.MsgCopy_Wrapper)
      );
      quickFilters.MsgMoveCopy_Wrapper(uri, true);
    } catch (ex) {
      util.logException("MsgMove_Wrapper()", ex);
    }
  },

  MsgMoveCopy_Wrapper: function (uri, isCopy, originalControllerCopyMove) {
    // TB115 deprecated:
    // gFolderDisplay
    // gFolderDisplay.selectedMessages
    // gFolderDisplay.selectedMessageUris
    const util = quickFilters.Util,
      worker = quickFilters.Worker,
      Ci = Components.interfaces;

    // MsgMoveMessage wrapper function
    let sourceFolder,
      destMsgFolder,
      messageList = [],
      isCreateFilter = false;

    try {
      util.logDebugOptional("msgMove", "Executing wrapped MsgMoveMessage");
      if (quickFilters.Util.AssistantActive) {
        sourceFolder = util.getCurrentFolder();

        let destResource = uri;

        destMsgFolder = destResource.QueryInterface(Ci.nsIMsgFolder);

        // get selected message uris - see case 'createFilterFromMsg'
        // gFolderDisplay.selectedMessageUris;
        let selectedMessageUris = [];
        let selectedMessages = quickFilters.Util.getSelectedMessages(selectedMessageUris);

        util.logDebugOptional(
          "msgMove",
          "MsgMoveCopy_Wrapper(): " + selectedMessages.length + " selected Messages counted."
        );

        if (
          util.checkAssistantTargetExclusion(destMsgFolder) ||
          util.checkAssistantSourceExclusion(sourceFolder)
        ) {
          isCreateFilter = false;
        } else {
          let i;
          for (i = 0; i < selectedMessages.length; i++) {
            messageList.push(
              util.makeMessageListEntry(selectedMessages[i], selectedMessageUris[i])
            );
            // the original command in the message menu calls the helper function MsgCreateFilter()
            // we do not know the primary action on this message (yet)
          }
          if (i) {
            // can we clone here - let's try as counter measure for IMAP users..
            worker.refreshHeaders(messageList, sourceFolder, null); // attempt an early message clone process
            worker.promiseCreateFilter = true;
            isCreateFilter = true;
            // move filter  creation until after copy / move!
          }
        }
      } // only do if Filter Assistant is active
    } catch (ex) {
      util.logException("MsgMoveCopy_Wrapper", ex);
    } finally {
      // this is very important as we need to restore the original MsgMoveMessage
      let promiseDone = function () {
        // we cannot quickmove until we are done evaluating the message headers for filter creation
        {
          if (isCopy) {
            util.logDebugOptional("msgMove", "Executing original CopyMessage [[");
            // calls original copy message function of Thunderbird
            originalControllerCopyMove(uri);
          } else {
            util.logDebugOptional("msgMove", "Executing original MoveMessage [[");
            // call original move message function of Thunderbird
            originalControllerCopyMove(uri);
          }
          util.logDebugOptional("msgMove", "After original Move/CopyMessage.]]");
          // MOVED FILTER CREATION AFTER MESSAGES ARE MOVED.
          let fA = isCopy
            ? Ci.nsMsgFilterAction.CopyToFolderMsgCopyMessage
            : Ci.nsMsgFilterAction.MoveToFolder; // [issue 77]
          if (isCreateFilter) {
            worker.createFilterAsync_New(sourceFolder, destMsgFolder, messageList, fA); // filterAction

            util.logDebugOptional("msgMove", "After calling createFilterAsync_New()");
          }
        }
      };

      util.logDebugOptional("msgMove", "calling promiseDone()...");
      promiseDone(); //was setTimeout(promiseDone, 20);
    }
  } ,

  MsgArchive_Wrapper: async function (callbackFunction) {
    const util = quickFilters.Util,
      Ci = Components.interfaces;

    let sourceFolder,
      destMsgFolder,
      messageList = [];
    try {
      if (
        quickFilters.Util.AssistantActive &&
        !quickFilters.Preferences.getBoolPref("assistant.exclude.archive")
      ) {
        sourceFolder = util.getCurrentFolder();

        let selectedMessageUris = [];
        let selectedMessages = quickFilters.Util.getSelectedMessages(selectedMessageUris);

        let i;
        for (i = 0; i < selectedMessages.length; i++) {
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
          const params = {
            sourceFolder,
            targetFolder: destMsgFolder,
            messageList,
            filterAction: fA, // Custom action for archive
            filterActionExt: "Archive",
            isMsgContext: false, // optional, if you want to be explicit
            context: "wrappedArchive",
          };      
          await quickFilters.Worker.startFilterAssistant(params);  
          util.logDebugOptional("msgMove", "After calling startFilterAssistant()");
        }
      }
    } catch (ex) {
      util.logException("MsgArchive_Wrapper()", ex);
    }
    callbackFunction(); // call original archive function
  },

  doCommandWrapper: function (cmd, aTab) {
    try {
      const isEnabled =
        (cmd == "cmd_delete" || cmd == "button_delete") && DefaultController.isCommandEnabled(cmd);
      if (isEnabled) {
        // determine which messages are currently selected
        // then call assistant first. Or alternatively call after original function returns true.
        // original call was gFolderDisplay.doCommand(Ci.nsMsgViewCommandType.deleteMsg);
        const Ci = Components.interfaces;
        quickFilters.Util.logDebugOptional(
          "assistant,msgMove",
          `doCommandWrapper(${cmd}, ${aTab}):`
        );

        (async () => {
          try {
            // assistant logic
            let isAssistant = quickFilters.Util.AssistantActive;
            if (!isAssistant) {
              return;
            }

            if (quickFilters.Preferences.getBoolPref("assistant.exclude.trash")) {
              quickFilters.Util.logDebugOptional(
                "assistant,msgMove",
                "Not invoking assistant on delete as it is excluded."
              );
              return;
            }
            let selectedMessages = quickFilters.Util.getSelectedMessages();
            if (!selectedMessages?.length) {
              return; //early exit. we still want to use finally to return the original command!!
            }

            let selectedMails = [];
            for (let i = 0; i < selectedMessages.length; i++) {
              let msgHdr = selectedMessages[i];
              selectedMails.push(quickFilters.Util.makeMessageListEntry(msgHdr));
            }
            let src = selectedMessages[0].folder;
            // determine the target (Trash for this account)
            if (!src.canDeleteMessages) {
              return;
            }
            let targetFolder = src.server.rootFolder.getFolderWithFlags(Ci.nsMsgFolderFlags.Trash);
            const params = {
              sourceFolder: src,
              targetFolder,
              messageList: selectedMails,
              filterAction: Components.interfaces.nsMsgFilterAction.Delete,
              filterActionExt: null,
              isMsgContext: false,
              context: "doCommandWrapper",
            };
            quickFilters.Worker.startFilterAssistant(params);
          } catch (ex) {
            quickFilters.Util.logException("quickFilters.doCommandWrapper()", ex);
          }
        })();
      }
    } catch (ex) {
      quickFilters.Util.logException("quickFilters.doCommandWrapper()", ex);
    }
    // make sure to bind "this" to DefaultController!
    let result = quickFilters.doCommandOriginal.call(DefaultController, cmd, aTab);
    // eslint-disable-next-line no-unsafe-finally
    return result;
  },

  windowKeyPress: function (e, dir) {
    const util = quickFilters.Util,
      prefs = quickFilters.Preferences,
      isRunFolderKey = prefs.isShortcut("folder"),
      isSelectedMailsKey = prefs.isShortcut("mails");

    util.logDebugOptional("events.keyboard", "key event:", e);
    if (!isRunFolderKey && !isSelectedMailsKey) {
      return;
    }

    let isAlt = e.altKey,
      isCtrl = e.ctrlKey,
      isShift = e.shiftKey,
      eventTarget = e.target;
    if (e.repeat) {
      return; // ignore auto-repeated key events
    }

    // shortcuts should only work in thread tree, folder tree and email preview (exclude conversations as it might be in edit mode)
    let tag = eventTarget.tagName ? eventTarget.tagName.toLowerCase() : "";
    if (
      eventTarget.id != "threadTree" &&
      eventTarget.id != "folderTree" &&
      eventTarget.id != "accountTree" &&
      ((tag &&
        [
          "textarea", // Postbox quick reply
          "textbox", // any textbox
          "input", // Thunderbird 68 textboxes.
          "html:input", // Thunderbird 78 textboxes.
          "search-textbox", // Thunderbird 78 search boxes
          "xul:search-textbox", // Thunderbird 115 search boxes  [issue ]
          "global-search-bar", // Thunderbird 115 global search [issue ]
          "findbar", // [Bug 26654] in-mail search
        ].includes(tag)) ||
        (eventTarget.baseURI &&
          eventTarget.baseURI.toString().lastIndexOf("chrome://conversations", 0) === 0))
    ) {
      return; // NOP
    }

    // [issue 275] 'AI Anywhere', QNote and other web extensions.
    if (eventTarget.classList && eventTarget.classList.contains("webextension-popup-browser")) {
      return;
    }

    if (window) {
      let tabmail = document.getElementById("tabmail");
      let selectedTab = tabmail.currentTabInfo,
        tabMode = null;
      if (selectedTab) {
        tabMode = quickFilters.Util.getTabMode(selectedTab);
        if (tabMode == "glodaSearch" && selectedTab.collection) {
          //distinguish gloda search result
          tabMode = "glodaSearch-result";
        }
        if (quickFilters.Util.isTabMode(selectedTab, "mail")) {
          let isShiftOnly = !isAlt && !isCtrl && isShift && dir != "up",
            theKeyPressed = String.fromCharCode(e.charCode).toLowerCase();
          if (isRunFolderKey) {
            if (isShiftOnly && theKeyPressed == prefs.getShortcut("folder").toLowerCase()) {
              util.logDebug("detected: Shortcut for Run filters on Folder");

              if (quickFilters.Preferences.getBoolPref("shortcuts.challenge")) {
                let folder = util.getCurrentFolder();
                if (!folder.getFlag(util.FolderFlags.Inbox)) {
                  let txt = util.getBundleString("runFilters.folder.confirm", "", [
                    folder.prettyName || folder.localizedName,
                  ]);
                  let result = Services.prompt.confirm(
                    util.getMail3PaneWindow(),
                    "quickFilters",
                    txt
                  );
                  if (!result) {
                    return;
                  }
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
              if (
                !folder.getFlag(util.FolderFlags.Inbox) &&
                quickFilters.Preferences.getBoolPref("shortcuts.challenge")
              ) {
                let txt = util.getBundleString("runFilters.selection.confirm");
                let result = Services.prompt.confirm(
                  util.getMail3PaneWindow(),
                  "quickFilters",
                  txt
                );
                if (!result) {
                  return;
                }
              }
              quickFilters.onApplyFiltersToSelection();
              return;
            }
          }
        }
      }
    }
  },

  // show news on update - called from qFi-messenger script following a background listener
  updatequickFiltersLabel: function () {
    const util = quickFilters.Util;
    let hasNews = quickFilters.Preferences.getBoolPref("hasNews"),
      btn = document.getElementById("quickfilters-toolbar-button"),
      isDropDownMarkerStyled = false;
    let newLabel = "",
      newTooltip = "";
    // for styling button parent background image
    //   in  Tb115 we need to add the class to the parent <div class="live-content">!
    function addClass(element, c) {
      element.classList.add(c);
      element.parentElement.classList.add(c);
    }
    function removeClass(element, c) {
      element.classList.remove(c);
      element.parentElement.classList.remove(c);
    }
    function wasLicenseViewedInSession() {
      if (typeof util.licenseInfo.isLicenseViewed == "undefined") {
        return false;
      }
      return util.licenseInfo.isLicenseViewed;
    }

    if (btn) {
      const mnuGoPro = document.getElementById("quickfilters-gopro");
      if (util.licenseInfo.isValid) {
        if (util.licenseInfo.licensedDaysLeft < 11 && !wasLicenseViewedInSession()) {
          addClass(btn, "renew");
          newLabel = util.getBundleString(
            "quickfiltersToolbarButton.renew",
            "License expires in $daysLeft$ days",
            [util.licenseInfo.licensedDaysLeft]
          );
          isDropDownMarkerStyled = true;
        } else {
          removeClass(btn, "renew");
        }
        mnuGoPro.classList.add("hasLicense");
      } else {
        mnuGoPro.classList.remove("hasLicense");
      }

      const isNewsMinimal = quickFilters.Preferences.getBoolPref("news.minimal");
      if (hasNews) {
        addClass(btn, "newsflash");
      } else {
        removeClass(btn, "newsflash");
      }
      if (hasNews && isNewsMinimal) {
        addClass(btn, "news-minimal");
        newLabel = "quickFilters"; // the default
      } else {
        removeClass(btn, "news-minimal");
      }
      if (util.licenseInfo.isExpired && !wasLicenseViewedInSession()) {
        addClass(btn, "expired");
        removeClass(btn, "renew");
        newLabel = util.getBundleString("quickfiltersToolbarButton.expired");
        newTooltip = util.getBundleString("quickfiltersToolbarButton.expired.tip");
        isDropDownMarkerStyled = true;
      } else {
        removeClass(btn, "expired");
        if (hasNews) {
          const newsMenuLabel = util.getBundleString("quickfilters.menu.news");
          newLabel = util.getBundleString("quickfiltersToolbarButton.updated");
          newTooltip = util
            .getBundleString("quickfiltersToolbarButton.updated.tip")
            .replace("{menulabel}", newsMenuLabel);
          
          isDropDownMarkerStyled = true;
        } else {
          newLabel = "quickFilters"; // let's use the standard label
          newTooltip = util.getBundleString("quickfiltersToolbarButton.tooltip");
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
      if (util.AssistantActive) {
        util.setAssistantButton(quickFilters.Util.AssistantActive);
      }
    }
  },

  // unfortunately, this is also triggered when a FILTER changes a tag of a message.
  // this might make it useless for our purposes
  // This will eventually have to replace ToggleMessageTagWrapped()
  // and get rid of the monkey patch
  listenerFlagChanged: function (item, oldFlag, newFlag) {
    // check old flags
    let tags = item.getStringProperty("keywords");
    tags = tags ? tags.split(" ") : [];
    let newTags = tags.filter(MailServices.tags.isValidKey); // filter out nonsense tags
    const isDbg = quickFilters.Preferences.isDebugOption("listeners");
    if (isDbg) {
      console.log("listenerFlagChanged - old tags:", item, oldFlag, newFlag, newTags);
    }
    if (!quickFilters.Preferences.getBoolPref("listener.tags")) {
      return false; // ignore tag changes categorically.
    }
    if (newTags.length) {
      // tags have been added.
      if (!quickFilters.Util.AssistantActive) {
        return false;
      }
      let messages = quickFilters.Util.getSelectedMessages();
      if (!messages.length) {
        return false;
      }
      let msgHdr = messages[0];
      let selectedMails = [];
      selectedMails.push(quickFilters.Util.makeMessageListEntry(msgHdr)); // Array of message entries  ### [Bug 25688] Creating Filter on IMAP fails after 7 attempts ###

      // THIS SHOULD ONLY BE DONE IF THE TAG CHANGE WAS INTERACTIVE!!
      // SO WE CANNOT DO THIS HERE TO REMOVE THE TAG CHANGE MONKEY PATH AT THE MOMENT.
      /*
      quickFilters.Worker.createFilterAsync_New(null, msgHdr.folder, selectedMails, 
                                            Components.interfaces.nsMsgFilterAction.AddTag, 
                                            tag);
                                            */
    }
    return true;
  },

  TabEventListeners: {}, // make a map of tab event listeners
  addTabEventListener: function () {
    try {
      let tabContainer = quickFilters.Util.tabContainer;
      this.TabEventListeners["TabSelect"] = function (event) {
        quickFilters.TabListener.selectTab(event);
      };
      this.TabEventListeners["TabOpen"] = function (event) {
        quickFilters.TabListener.openTab(event);
      };
      // this.TabEventListeners["TabClose"] = function(event) { quickFilters.TabListener.closeTab(event); }
      // this.TabEventListeners["TabMove"] = function(event) { quickFilters.TabListener.moveTab(event); }
      for (let key in this.TabEventListeners) {
        tabContainer.addEventListener(key, this.TabEventListeners[key], false);
      }
    } catch (e) {
      quickFilters.LocalErrorLogger("No tabContainer available! " + e);
      quickFilters._tabContainer = null;
    }
  },
  removeTabEventListener: function () {
    // this might not be necessary, as we iterate ALL event listeners when add-on shuts down
    // (see "undo monkey patch" in qFi-messenger.js)
    let tabContainer = quickFilters.Util.tabContainer;
    for (let key in this.TabEventListeners) {
      tabContainer.removeEventListener(key, this.TabEventListeners[key]);
    }
  },
}; // quickFilters MAIN OBJECT


/*
quickFilters.MsgFolderListener = {
  qfInstance: quickFilters,
  //  * Event fired after message was moved or copied
  //  * @param {boolean} isMoved  
  //  * @param {nsIArray} aSrcMsgs    Array of Messages
  //  * @param {nsIMsgFolder} targetFolder   
  //  * @param {nsIArray} aDestMsgs    Array of Messages
  msgsMoveCopyCompleted: function(isMoved, aSrcMsgs, targetFolder, aDestMsgs) {
    const Ci = Components.interfaces;
    let qF = quickFilters ? quickFilters : this.qfInstance;
    let isMoveDebug = qF.Preferences.isDebugOption("msgMove"), 
        isDebugDetail = false;
    qF.Util.logDebugOptional(
      "listeners",
      `MsgFolderListener.msgsMoveCopyCompleted()\n ${
        aSrcMsgs[0].folder.prettyName || aSrcMsgs[0].folder.localizedName
      } ${targetFolder.prettyName}  ${
        aDestMsgs && aDestMsgs.length
          ? aDestMsgs[0].folder.prettyName || aDestMsgs[0].folder.localizedName
          : "no destmsg!"
      }`
    );

    if (isMoveDebug) {
      console.log ("msgsMoveCopyCompleted()\n", {isMoved, aSrcMsgs, targetFolder, aDestMsgs});
      isDebugDetail = qF.Preferences.isDebugOption("msgMove.detail");
    }    

    if (!aDestMsgs || !aDestMsgs.length) {
      return; // early exit - could be a filter execution (empty array) or IMAP synchronisation (null == aDestMsgs).
    }

    if (qF.Util.AssistantActive) {
      if (isMoveDebug) {
        qF.Util.logDebug("Legacy msgsMoveCopyCompleted assistant path is optimized out.");
      }
      return; // early exit (kept for current ESR140 behavior)

      if (qF.Util.checkAssistantTargetExclusion(targetFolder)) {
        // Avoid triggering assistant for certain folders
        return;
      }

      let sourceFolder = aSrcMsgs[0].folder;
      let msgList = [];

      if (isMoveDebug) {
        console.log(
          `Assistant triggered for folder ${
            targetFolder.prettyName || targetFolder.localizedName
          } `,
          targetFolder,
          `\nflags: 0x${targetFolder.flags.toString(16)}\nURI: ${targetFolder.URI}`
        );
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
        qF.Worker.createFilterAsync_New(
          sourceFolder, 
          targetFolder, 
          msgList,
          isMoved ? Ci.nsMsgFilterAction.MoveToFolder : Ci.nsMsgFilterAction.CopyToFolder,
          null);
      }

    }

  },
  msgAdded: function msgAdded(_aMsg){ 
    quickFilters.Util.logDebugOptional("listeners", "MsgFolderListener.msgAdded()"); 
  },
  msgsClassified: function msgsClassified(_aMsgs, _aJunkProcessed, _aTraitProcessed){;},
  msgsDeleted: function msgsDeleted(aMsgs) { 
    let qF = quickFilters ? quickFilters : this.qfInstance;
    let isMoveDebug = qF.Preferences.isDebugOption("msgMove");
    if (isMoveDebug) {
      console.log (`msgsDeleted()\nImmediately deleted messages from ${
        aMsgs[0].folder.prettyName || aMsgs[0].folder.localizedName
      }`, aMsgs);
    }
  },
  folderAdded: function folderAdded(_aFolder){ ; },
  folderDeleted: function folderDeleted(_aFolder){ ; },
  folderMoveCopyCompleted: function folderMoveCopyCompleted(_aMove, _aSrcFolder,_aDestFolder){ ; },
  folderRenamed: function folderRenamed(_aOrigFolder, _aNewFolder){ ; } ,
  itemEvent: function itemEvent(_aItem, _aEvent, _aData){ ; }
}; // MsgFolderListener
quickFilters.MsgFolderListener.qfInstance = quickFilters;
*/

/**
 * FolderListener: manages message and folder events for local folders,
 * especially to support automatic filtering on POP3/non-inbox folders.
 * Active only if preference "localFoldersRun" is true.
 */
quickFilters.FolderListener = {
  localMoved: [],
  qfInstance: quickFilters,
  ELog: function (msg) {
    try {
      try {
        Components.utils.reportError(msg);
      } catch {
        Services.console.logStringMessage("quickFilters:" + msg);
      }
    } catch {
      // write to TB status bar??
      try {
        quickFilters.Util.logToConsole("Error: " + msg);
      } catch {;}
    }
  },

  onMessageAdded: async function (parent, item) {
    const Ci = Components.interfaces;
    try {
      let qfEvent = this.qfInstance || quickFilters;
      if (!qfEvent) {return;}

      const win = qfEvent.Util
          ? qfEvent.Util.getMail3PaneWindow()
          : quickFilters.Util.getMail3PaneWindow(),
        util = win.quickFilters.Util,
        prefs = win.quickFilters.Preferences,
        logDebug = util.logDebugOptional.bind(util),
        isLocalFolders = prefs.getBoolPref("localFoldersRun");

      logDebug("events,msgMove", "FolderListener.onMessageAdded() " + item.toString());
      if (prefs.isDebugOption("events")) {
        console.log(parent, item);
      }
      if (!isLocalFolders) {
        return;
      }
      if (!util.isLocalInbox(parent)) {
        return;
      }
      // referencing parent may re-invoke OnItemAdded! [issue 80]
      // make a stack of moved messages to work through
      let h = item.QueryInterface(Ci.nsIMsgDBHdr);
      // avoid duplicates
      if (!quickFilters.FolderListener.localMoved.find((o) => o.messageKey == h.messageKey)) {
        util.logDebugOptional("msgMove", "Adding 1 message to list of localMoved");
        quickFilters.FolderListener.localMoved.push({ hdr: h, key: h.messageKey });
      }
    } catch (e) {
      this.ELog("Exception in FolderListener.onMessageAdded {}:\n" + e);
    }
  },

  onFolderEvent: function (item, event) {
    // was: OnItemEvent
    if (!event) {return;} // early exit for 'bad' events happening during MsgMoveMessage
    let eString = event.toString();
    try {
      let qfEvent = this.qfInstance || quickFilters;
      if (!qfEvent) {return;}
      const win = qfEvent.Util
          ? qfEvent.Util.getMail3PaneWindow()
          : quickFilters.Util.getMail3PaneWindow(),
        util = win.quickFilters.Util;
      util.logDebugOptional("events", "OnItemEvent( " + item + ", " + eString + ")");
      switch (eString) {
        case "FolderLoaded":
          break;
        case "RenameCompleted":
          // find filters with this target and correct them?
          break;
        case "DeleteOrMoveMsgCompleted": {
          let isAssistant = quickFilters.Util.AssistantActive,
            srcName = item ? (item.prettyName || item.localizedName) : "<no folder>";

          util.logDebugOptional(
            "events,msgMove",
            "DeleteOrMoveMsgCompleted(" +
              srcName +
              ")\n" +
              "Assistant is " +
              (isAssistant ? "active" : "off")
          );
          let isLocal = util.isLocalInbox(item);
          util.logDebugOptional(
            "msgMove",
            "Source folder (" + srcName + ") is local inbox = " + isLocal
          );
          if (!isAssistant && !util.isLocalInbox(item)) {
            // item is the source folder (usually another inbox, not local folders)
            let LM = quickFilters.FolderListener.localMoved;
            util.logDebugOptional(
              "msgMove",
              "List of LocalMoved = " + (LM ? LM.length + " items." : "NULL!")
            );
            if (LM.length) {
              const target = LM[0].hdr.folder,
                tName = target.prettyName || target.localizedName;
              util.logDebugOptional(
                "msgMove",
                `Running filters on ${LM.length} messages in ${tName}...`
              );
              while (LM.pop()){;} // empty array
              setTimeout(function () {
                util.applyFiltersToFolder(target);
                util.popupProFeature("localFolderFilters", true);
              }, 25);
            }
          }
        } break;
      }
    } catch (e) {
      this.ELog("Exception in FolderListener.OnItemEvent {" + eString + "}:\n" + e);
    }
  },

  // Tb 102+
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
  },
};  // FolderListener
quickFilters.FolderListener.qfInstance = quickFilters;

// Custom Search Terms...
quickFilters.CustomTermReplyTo = {
  id: "quickFilters@axelg.com#replyTo",
  name: "Reply-To",
  getEnabled: function customTermReplyTo_getEnabled(scope, _op) {
    return this._isLocalSearch(scope);
  },
  needsBody: false,
  getAvailable: function customTermReplyTo_getAvailable(scope, _op) {
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
        if (replyTo.endsWith(searchVal)) { matches = true; }
        break;

      default:
        Components.utils.reportError("invalid search operator in replyTo custom search term");
    }
    if (aSearchOp == nsMsgSearchOp.DoesntContain || aSearchOp == nsMsgSearchOp.Isnt) {
      return !matches;
    }
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
  },
  
}; // CustomTermReplyTo


// [issue 12] shortcuts for run filter buttons.
quickFilters.addKeyListener = function(win) {
  const prefs = quickFilters.Preferences;
  let isRunFolderKey = prefs.isShortcut("folder"),
      isSelectedMailsKey = prefs.isShortcut("mails");

  quickFilters.Util.logDebugOptional("functions","addKeyListener()...");

  if (isRunFolderKey || isSelectedMailsKey) {
    // check main instance 
    quickFilters.Util.logDebugOptional("events,events.keyboard","Adding keyboard event listener for shortcuts. ");
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
    quickFilters.Util.logDebugOptional("functions","removeKeyListener()...");
    win.removeEventListener("keypress", win.quickFilters_keyListener, {capture:true, passive: true});
    delete win.quickFilters_keyListener;
  }
}

quickFilters.addFolderListeners = function() {
  const Ci = Components.interfaces;
  MailServices.mailSession.AddFolderListener(quickFilters.FolderListener, 
    Ci.nsIFolderListener.event | 
    Ci.nsIFolderListener.added | 
    Ci.nsIFolderListener.propertyFlagChanged );

  // nsIMsgFolderListener
  /*
  MailServices.mfn.addListener(quickFilters.MsgFolderListener,
      MailServices.mfn.msgsMoveCopyCompleted |
      MailServices.mfn.msgsDeleted |
      MailServices.mfn.msgKeyChanged
  );
  */
}

quickFilters.removeFolderListeners = function() {
  // MailServices.mfn.removeListener(quickFilters.MsgFolderListener);
  MailServices.mailSession.RemoveFolderListener(quickFilters.FolderListener);
}


// jcranmer suggest using this
// quickFilters.notificationService.addListener(quickFilters.MsgFolderListener, Ci.nsIFolderListener.all);
// Problem: any folder listener cannot distinguish between user interaction and filter caused changes
//          =>  we must never trigger the assistant if a filter changes mail metadata / headers !!!!
//          therefore we are forced to monkey patch the command controller 
quickFilters.addTagListener = function(win) {
  const util = quickFilters.Util,
    prefs = quickFilters.Preferences;
  if (!util) {
    setTimeout(function () {
      quickFilters.addTagListener();
    }, 1000); // retry
    return false;
  }
  util.logDebugOptional("listeners", "addTagListener()");
  // [issue 346] - _toggleMessageTag was moved in Tb145, see [bug 1990790]
  const owningObject = win.mailContextMenu?._toggleMessageTag
    ? win.mailContextMenu
    : win.commandController;

  // wrap the original method
  if (!owningObject || !owningObject?._toggleMessageTag) {
    return false;
  }

  util.logDebugOptional("listeners", "Wrapping ToggleMessageTag...");
  let currentTogglerFunction = owningObject._toggleMessageTag;
  if (!currentTogglerFunction) {
    util.logToConsole(
      "getMail3PaneWindow - Could not retrieve the original ToggleMessageTage function from main window:\n" +
        util.getMail3PaneWindow()
    );
    return false; // let's short ciruit here
  }
  if (typeof currentTogglerFunction.fromQuickFilters !== "undefined") {
    util.logDebug(
      "quickFilters.addTagListener: ToggleMessageTag.fromQuickFilters already is set\n"
    );
    return false;
  }
  win.quickFilters_ToggleMessageTag = currentTogglerFunction; // store namespaced original in window

  // closure the window
  owningObject._toggleMessageTag = function (tag, checked) {
    // call the original function (tag setter) first
    let tmt = win.quickFilters_ToggleMessageTag;
    util.logDebugOptional(
      "listeners",
      "ToggleMessageTagWrapped()" +
        `\nwin.quickFilters == quickFilters: ${win.quickFilters == quickFilters}` +
        `\noriginalTagToggler == contextWin.quickFilters.ToggleMessageTag: ${currentTogglerFunction == tmt}`
    );

    win.quickFilters_ToggleMessageTag(tag, checked);

    // no Assistant active - if current folder is the inbox: apply the filters.
    // Bug 26457 - disable this behavior by default
    if (!quickFilters.Util.AssistantActive && prefs.getBoolPref("listener.tags.autofilter")) {
      quickFilters.onApplyFiltersToSelection(true); // suppress the message
      return false;
    }

    if (!checked) {
      return true;
    }
    // only if tag  gets toggle ON
    // Assistant is active?
    if (!quickFilters.Util.AssistantActive) {
      return false;
    }
    // make it possible to ignore tag changes.
    if (!prefs.getBoolPref("listener.tags")) {
      return false;
    }

    let selectedMessages = quickFilters.Util.getSelectedMessages();
    if (!selectedMessages.length) {
      return false;
    }
    let msgHdr = selectedMessages[0];

    let selectedMails = [];
    selectedMails.push(util.makeMessageListEntry(msgHdr)); // Array of message entries  ### [Bug 25688] Creating Filter on IMAP fails after 7 attempts ###

    window.setTimeout(async function () {
      const params = {
        sourceFolder: null,
        targetFolder: msgHdr.folder,
        messageList: selectedMails,
        filterAction: Components.interfaces.nsMsgFilterAction.AddTag,
        filterActionExt: tag,
        isMsgContext: false,
        context: "addTagListener",
      };
      quickFilters.Worker.startFilterAssistant(params);
    });

    return true;
  }; //  wrapper function for ToggleMessageTag

  util.logDebugOptional(
    "listeners",
    "typeof ToggleMessageTag =" + typeof win.ToggleMessageTag + "\n adding flag..."
  );
  owningObject._toggleMessageTag.fromQuickFilters = true; // add a property flag to avoid recursion!
  util.logDebugOptional("listeners", "typeof ToggleMessageTag =" + typeof win.ToggleMessageTag);
  return true;
}

quickFilters.restoreTagListener = function(win) {
  const owningObject = win.mailContextMenu?._toggleMessageTag
    ? win.mailContextMenu
    : win.commandController;
  if (owningObject._toggleMessageTag?.fromQuickFilters && win.quickFilters_ToggleMessageTag) {
    owningObject._toggleMessageTag = win.quickFilters_ToggleMessageTag; // restore original function
    delete owningObject.quickFilters_ToggleMessageTag; // scrap backup
  }
}

quickFilters.patchMailPane = () => {
  // THUNDERBIRD 115
  // fix selectors
  quickFilters.Util.logHighlightDebug("patchMailPane()...");
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
          <menuitem id="quickfilters-news" label="__MSG_quickfilters.menu.news__" class="menuitem-iconic marching-ants" oncommand="window.quickFilters.doCommand(this);"  onclick="event.stopPropagation();"/>
          <menuitem id="quickfilters-checkLicense"    label="__MSG_quickfilters.menu.license__" class="menuitem-iconic marching-ants" oncommand="window.quickFilters.doCommand(this);"  onclick="event.stopPropagation();"/>
          <menuitem id="quickfilters-toggleAssistant" label="__MSG_quickfilters.FilterAssistant.start__" class="menuitem-iconic" oncommand="window.quickFilters.doCommand(this);"  onclick="event.stopPropagation();" />
          <menuitem id="quickfilters-runFilters"      label="__MSG_quickfilters.RunButton.label__" class="menuitem-iconic" oncommand="window.quickFilters.doCommand(this);" onclick="event.stopPropagation();"/>
          <menuitem id="quickfilters-runFiltersMsg"   label="__MSG_quickfilters.RunButtonMsg.label__" class="menuitem-iconic" oncommand="window.quickFilters.doCommand(this);" onclick="event.stopPropagation();"/>
          <menuitem id="quickfilters-menu-filterlist" label="__MSG_quickfilters.ListButton.label__" class="menuitem-iconic" oncommand="window.quickFilters.doCommand(this);" onclick="event.stopPropagation();"/>
          <menuseparator />
          <menuitem id="quickfilters-settings" label="__MSG_quickfilters.button.settings__" class="menuitem-iconic" oncommand="window.quickFilters.doCommand(this);" onclick="event.stopPropagation();"/>
          <menu id="quickfilters-menu-tools" label="__MSG_quickfilters.menu.tools__" class="menu-iconic">
            <menupopup>
              <menuitem id="quickFilters-menu-filterFromMsg" label="__MSG_quickfilters.FromMessage.label__" class="menuitem-iconic" oncommand="window.quickFilters.doCommand(this);"  onclick="event.stopPropagation();"/>                    
              <menuitem id="quickfilters-menu-searchfilters" label="__MSG_quickfilters.findFiltersForFolder.menu__"  class="menuitem-iconic" oncommand="window.quickFilters.doCommand(this);" onclick="event.stopPropagation();"/>
              <menuseparator />
              <menuitem id="quickfilters-menu-registration" label="__MSG_quickfilters.registration.menu__"  class="menuitem-iconic" oncommand="window.quickFilters.doCommand(this);" onclick="event.stopPropagation();"/>
              <menu label="Test" id="qFilters-menu-test" class="menu-iconic">
                <menupopup>
                  <menuitem id="quickfilters-menu-test-storage-editor" label="Browser Storage editor" oncommand="window.quickFilters.doCommand(this);" onclick="event.stopPropagation();"/>
                  <menuitem id="quickfilters-menu-test-htmlAssistant" label="quickFilters Assistant - HTML version!" oncommand="window.quickFilters.doCommand(this);" onclick="event.stopPropagation();"/>
                  <menuitem id="quickfilters-menu-test-midnight" label="Test - Label update (midnight)" oncommand="window.quickFilters.doCommand(this);" onclick="event.stopPropagation();"/>
                  <menuitem id="quickfilters-menu-test-news" label="Test - set has news flag!" oncommand="window.quickFilters.doCommand(this);" onclick="event.stopPropagation();"/>
                  <menuitem id="quickfilters-menu-test-qurrentFolderBar" label="Update QuickFolders Current Folder Bar" oncommand="window.quickFilters.doCommand(this);" onclick="event.stopPropagation();"/>
                  <menuitem id="quickfilters-menu-test-api-util" label="API: Utilities" oncommand="window.quickFilters.doCommand(this);" onclick="event.stopPropagation();"/>
                  <menuitem id="quickfilters-menu-test-api-FilterAPI" label="API: FilterAPI" oncommand="window.quickFilters.doCommand(this);" onclick="event.stopPropagation();"/>
                </menupopup>
              </menu>
            </menupopup>
          </menu>
          <menuitem id="quickfilters-changelog"    label="__MSG_quickfilters.menu.changelog__" class="menuitem-iconic" oncommand="window.quickFilters.doCommand(this);" onclick="event.stopPropagation();" />
          <menuitem id="quickfilters-gopro"   label="__MSG_getquickFilters__" class="menuitem-iconic" oncommand="window.quickFilters.doCommand(this);" onclick="event.stopPropagation();"/>
        </menupopup>
      </button>
    `);

    let mnuToolsCreateFromMsg = document.getElementById("quickFilters-menu-filterFromMsg");
    if (mnuToolsCreateFromMsg) {
      mnuToolsCreateFromMsg.label = mnuToolsCreateFromMsg.label.replace("quickFilters: ", "");
    }
  } else {
    const selectedTab = quickFilters.Util?.tabContainer?.selectedItem;
    console.log(
      "quickFilters - mainButton not found!\n" +
        `The selected tab "${selectedTab?.label}" appears to be a mail tab, but the toolbar button is not available yet.`,
      selectedTab
    );
  }

  /*
  // popup is closured
  const popup = document.getElementById("quickFiltersMainPopup");
  if (!popup) {
    return;
  }
  const tbVer = quickFilters.Util.Appver;
  if (quickFilters.Util.versionLower("143", tbVer)) {
    return; // no patch necessary
  }

  // inject list-style-image as image attribute to fix borked XUL:
  const patchMenuIcons = (el) => {
    const applyImage = (item) => {
      const listImg = window.getComputedStyle(item).getPropertyValue("list-style-image");
      if (listImg && listImg !== "none") {
        const match = listImg.match(/^url\(["']?(.*?)["']?\)$/);
        if (match && match.length > 1) {
          item.setAttribute("image", match[1]);
        }
      } else {
        const emptyIcon = `data:image/svg+xml;base64,${btoa(
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>'
        )}`;
        item.setAttribute("image", emptyIcon);
      }
    };
    el.querySelectorAll("menuitem[id]").forEach(applyImage);
    el.querySelectorAll("menu[id]").forEach(applyImage);
  };

  // Attach a popupshowing listener to a menupopup and recursively to nested ones
  function attachPopupListener(menupopup) {
    if (!menupopup) { return; }

    menupopup.addEventListener("popupshowing", (_e) => {
      patchMenuIcons(menupopup);

      // Recursively attach to any nested menupopups in this popup
      menupopup.querySelectorAll("menupopup").forEach(attachPopupListener);
    });
  }

  // Kickoff: attach to the root popup
  attachPopupListener(popup);
  */
}

quickFilters.TabListener = {
  selectTab: function(evt) {
    const isMailPane = quickFilters.Util.isTabMode (evt.detail.tabInfo, "mail");
    if (isMailPane) {
      quickFilters.patchMailPane();
      quickFilters.Util.notifyTools.notifyBackground({ func: "updatequickFiltersLabel"});
      quickFilters.Util.setAssistantButton(quickFilters.Util.AssistantActive);
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
  }, 
}


