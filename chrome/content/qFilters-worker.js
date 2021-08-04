"use strict";
/* 
BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK 
*/

// note: in QuickFolder_s, this object is simply called "Filter"!
quickFilters.Worker = {
  bundle: null,
  FilterMode: false,  // replace with Util.AssistantActive
  lastAssistedMsgList: [],
  reRunCount: 0,  // avoid endless loop
  promiseCreateFilter: false, // quickmove semaphor
  TemplateSelected: null,
  SelectedValue: '',

  // FILTER WIZARD FUNCTIONS ...
  showMessage: function showMessage(show) {
    quickFilters.Preferences.setBoolPref("filters.showMessage", show);
  } ,
  
  onCloseNotification: function onCloseNotification(eventType, notifyBox, notificationKey) {
    quickFilters.Util.logDebug ("onCloseNotification(" + notificationKey + ")");
    window.setTimeout(function() {
        // Postbox doesn't tidy up after itself?
        let item = notifyBox.getNotificationWithValue(notificationKey);
        if(item) {
          // http://mxr.mozilla.org/mozilla-central/source/toolkit/content/widgets/notification.xml#164
          notifyBox.removeNotification(item, false);  // skipAnimation  (quickFilters.Util.Application == 'Postbox')->false
        }
      }, 200);
  } ,
  
  // this function is currently called by QuickFolders to overwrite that filter worker process with this one!
  // Problem: it reads the old flag quickFilters.Worker.FilterMode! 
  toggleFilterMode: function toggleFilterMode(active, silent) {
    this.toggle_FilterMode(active, silent);
  } ,
  

  /**
  * toggles the filter mode so that dragging emails will
  * open the filter assistant
  *
  * @param {bool} start or stop filter mode
  */
  toggle_FilterMode: function toggle_FilterMode(active, silent) {
    const util = quickFilters.Util,
          worker = quickFilters.Worker;
    function removeOldNotification(box, active, id) {
      if (!active && box) {
        let item = box.getNotificationWithValue(id);
        if(item)
          box.removeNotification(item, false); // (quickFilters.Util.Application == 'Postbox')->false
      }   
    }
    
    util.logDebugOptional ("filters", "toggle_FilterMode(" + active + ")");
    let notifyBox;

    if (!silent) {
      
      if (typeof specialTabs == 'object' && specialTabs.msgNotificationBar) { // Tb 68
        notifyBox = specialTabs.msgNotificationBar;
      }
      else if( typeof gNotification == 'object' && gNotification.notificationbox) { // Tb 68
        notifyBox = gNotification.notificationbox;
      }
      
      let notificationKey = "quickfilters-filter";
      // do a tidy up in case this is already open!
      if (notifyBox) {
        try {
          if (window.QuickFolders) 
            removeOldNotification(notifyBox, false, 'quickfolders-filter');
        } catch(ex) {;}       
        
        let item = notifyBox.getNotificationWithValue(notificationKey);
        if (item)
          notifyBox.removeNotification(item, false); // second parameter in Postbox(not documented): skipAnimation
      }
      else {
        util.logToConsole("Sorry - I cannot show notifyBox, cannot find element \n" +
          "toggle_FilterMode(active=" + active + ", silent=false);");
      }

      if (active
        &&
        !quickFilters.Util.AssistantActive  // was this.FilterMode
        &&
        quickFilters.Preferences.getBoolPref("filters.showMessage"))
      {
        let title = util.getBundleString("quickfilters.filters.toggleMessage.title",
                    "Creating Filters"),
            theText = util.getBundleString("quickfilters.filters.toggleMessage.notificationText",
                    "Assisted filter mode started. Whenever you move an email into another mail folder a 'Create Filter Rule' assistant will start."
                    + " #1 uses message filters for automatically moving emails based on rules such as 'who is the sender?', 'is a certain keyword in the subject line?'."
                    + " To stop filter assisted mode, press the quickFilters Assistant button again." );
        theText = theText.replace("#1", util.Application);
        let dontShow = util.getBundleString("quickfilters.filters.toggleMessage.dontShow",
                       "Do not show this message again.");

        if (notifyBox) {
          // button for disabling this notification in the future
          let nbox_buttons = [
              {
                label: dontShow,
                accessKey: null,
                callback: function() { worker.showMessage(false); },
                popup: null
              }
            ];
          
          
          notifyBox.appendNotification( theText,
              notificationKey ,
              "chrome://quickfilters/content/skin/filterTemplate.png" ,
              notifyBox.PRIORITY_WARNING_MEDIUM,
              nbox_buttons,
              function(eventType) { worker.onCloseNotification(eventType, notifyBox, notificationKey); } // eventCallback
              ); 
              
        }
        else {
          // fallback for systems that do not support notification (currently: SeaMonkey)
          let prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService),
              check = {value: false},   // default the checkbox to true
              result = prompts.alertCheck(null, title, theText, dontShow, check);
          if (check.value === true)
            worker.showMessage(false);
        }
      }
    }

    worker.FilterMode = active; // keep this for backwards compatibility with QuickFolders 
                                // (it's read there at the moment when the "Create Filters..." menu item on the tool menu is clicked.)
                                // it then calls window.quickFilters.Worker.toggleFilterMode directly 
                                // (to be replaced with the correct event in future)
                                // internally, we will now use Util.AssistantActive
    
    // remove use of getMail3PaneWindow via background notifications!
    // replace setting FilterMode = active
    quickFilters.Util.notifyTools.notifyBackground({ func: "setAssistantMode", active });   // set Util.AssistantActive - stores assistant mode for all windows - only main windows need to listen to this one!
    quickFilters.Util.notifyTools.notifyBackground({ func: "setAssistantButton", active }); // reflect in UI of all Assistant buttons

    
    if (!silent)
      removeOldNotification(notifyBox, active, 'quickfilters-filter');

    // If QuickFolders is installed, we should also invoke its filter mode
    if (window.QuickFolders) {
      let QF = window.QuickFolders,
          QFwork = QF.FilterWorker ? QF.FilterWorker : QF.Filter;
      // we cannot supress the notification from QuickFolders
      // without adding code in it!
      if (QFwork.FilterMode != active) {// prevent recursion!
        QFwork.toggle_FilterMode ?
          QFwork.toggle_FilterMode(active) :
          QFwork.toggleFilterMode(active);  // (active, silent) !!!
      }

      if (!silent)
        removeOldNotification(notifyBox, active, 'quickfolders-filter');
    }
  },
  
  // targetFilter is passed in when a filter was merged and thus not created at the top of list
  openFilterList: function openFilterList(isRefresh, sourceFolder, targetFilter, targetFolder, isAlphabetic) {
    let util = quickFilters.Util,
        win;
    try {
      util.logDebug('openFilterList(' + isRefresh + ', '
        + sourceFolder ? sourceFolder.prettyName : 'no sourceFolder' + ', '
        + targetFilter ? targetFilter.name : 'no targetFilter'  + ', '
        + targetFolder ? targetFolder.prettyName : 'no targetFolder' + ')'
        );
      win = util.getLastFilterListWindow();
      // [Bug 25203] "Error when adding a filter if Message Filters window is already open"
      // Thunderbird bug - if the filter list is already open and refresh is true
      // it throws "desiredWindow.refresh is not a function"
      if (!win) {
        let args = { refresh: isRefresh, folder: sourceFolder};
        if (targetFilter) {
          // qF special method
          args.targetFilter = targetFilter;
          args.alphabetic = isAlphabetic || false;
          // after patch: args.filter = targetFilter;
        }
        if (targetFolder) args.targetFolder = targetFolder;
        MsgFilterList(args);
      }
      else {
        // we must make sure server and sourceFolder are selected (?) should already be correct
        // avoid quickFilters.List being closured!
        win.focus();
        win.quickFilters.List.rebuildFilterList();
        if (targetFilter) {
          setTimeout(function() { 
            let quickFiltersList = win.quickFilters.List;
            quickFiltersList.selectFilter(targetFilter); 
            if (isAlphabetic)
              quickFiltersList.moveAlphabetic(targetFilter); 
          });
        }
      }
    }
    catch (ex) {
      ;
    }
    if (!win) 
      win = util.getLastFilterListWindow();
    return win;
  } ,

  parseHeader : function parseHeader(parser, msgHeader) {
      return parser.extractHeaderAddressMailboxes(msgHeader);
  } ,
  
  // add a "cloned" version of messageHeader to the messageList array.
  // checks both folders for the message header, but folder2 is optional
  refreshHeaders : function refreshHeaders(messageList, folder, folder2) {
    function pad(str, len) {
        if (len + 1 >= str.length) {
            str = str + Array(len + 1 - str.length).join(' ');
        }
        return str;
    } 
    function appendProperty(str, msgHdr, propertyName) {
      return str + '  ' + pad('property ' + propertyName, 35)
                 + ': ' + (typeof msgHdr[propertyName] == "function" ? 'Function()' : msgHdr[propertyName]) 
                 + ' - ' + (typeof msgHdr[propertyName]) + '\n';
    }
    let util = quickFilters.Util,
        fails = 0;
    try {
      if (!folder) return false;
      util.logDebugOptional('createFilter.refreshHeaders', 'folders: ' + folder.name + ', ' + 
                            (folder2 ? folder2.name : '<none>'));
      if (!messageList || !messageList.length) return false;
      if (messageList[0].msgClone && messageList[0].msgClone.initialized)
        return true;
      let messageDb1 = folder.msgDatabase ? folder.msgDatabase : folder.getMsgDatabase(null),
          messageDb2 = folder2 ? (folder2.msgDatabase ? folder2.msgDatabase : folder2.getMsgDatabase(null)) : null;
          
      for (let i=0; i<messageList.length; i++) {
        let theMsg = messageList[i];
        if (theMsg.msgClone && theMsg.msgClone.initialized) {
          util.logDebugOptional('createFilter.refreshHeaders', 'Clone['+i+'] already initialized - skip.');
          continue;
        }
        util.logDebugOptional('createFilter.refreshHeaders', 'cloning header['+ i + '] ...');
        let msgHdr = messageDb1.getMsgHdrForMessageID(theMsg.messageId) || 
                     (messageDb2 ? messageDb2.getMsgHdrForMessageID(theMsg.messageId) : null);
        if (!msgHdr) {
          util.logDebugOptional('createFilter.refreshHeaders', 'No Message Header in folder [' + folder.prettyName + ']'
            +' for id: ' + theMsg.messageId);
          fails++;
          continue;
        }
        theMsg.msgHeader = msgHdr;
        if (!msgHdr.accountKey && !msgHdr.author) {
          util.logDebugOptional('createFilter.refreshHeaders', 'Message Header for id: ' + theMsg.messageId + ' doesn\'t have account Key and Author');
          fails++;
          continue;
        }
        
        /**** CLONE MESSAGE HEADERS ****/
        let messageClone = { "initialized": false },
            dbg = {
              test: '',
              test2: '',
              countInit: 0  
            };
        quickFilters.Shim.cloneHeaders(msgHdr, messageClone, dbg, appendProperty)
        
        if (dbg.countInit>1) {
          messageClone.initialized = true;
          dbg.test += 'STRING PROPERTIES  **********\n';
          messageClone.PreviewText = msgHdr.getStringProperty('preview'); 
          dbg.test = appendProperty(dbg.test, messageClone, 'PreviewText');
          messageClone.Keywords = msgHdr.getStringProperty("keywords")
          dbg.test = appendProperty(dbg.test, messageClone, 'Keywords');
        }
        util.logDebugOptional('createFilter.refreshHeaders', 
            'COPIED     ***********************\n' + dbg.test
          + 'NOT COPIED     *******************\n' + dbg.test2);
        theMsg.msgClone = messageClone;
        util.debugMsgAndFolders('[' + folder.prettyName + '] restore messageList[' + i + '] Id ', messageList[i].messageId, folder, messageList[i].msgHeader);
        util.logDebugOptional('createFilter.refreshHeaders', 'cloned header['+ i + ']');
      }
    }
    catch(ex) {
      util.logException("refreshHeaders failed", ex);
      return false;
    }
    return (fails==0);
  } ,
  
  getSourceFolder: function getSourceFolder(msg) {
    const Cc = Components.classes,
          Ci = Components.interfaces,
          util = quickFilters.Util;
    let accountCount = 0,
        sourceFolder = null,
        aAccounts = util.Accounts; // Array code moved to shim
    try {
      // count all default identities on system
      for (let a=0; a<aAccounts.length; a++) {
        if (aAccounts[a].defaultIdentity)
          accountCount++; 
      }
      
      // Get inbox from original account key - or use the only account if a SINGLE one exists
      // (Should we count LocalFolders? typically no filtering on that inbox occurs?)
      //    we could also add an account picker GUI here for Postbox,
      //    or parse From/To/Bcc for account email addresses
      if (msg.accountKey || accountCount==1) {
        util.logDebugOptional('getSourceFolder,createFilter', "sourceFolder: get Inbox from account of first message, key:" + msg.accountKey);
        for (let a=0; a<aAccounts.length; a++) {
          let ac = aAccounts[a];
          // Postbox quickFix: we do not need a match if only 1 account exists :-p
          if ((ac.key == msg.accountKey) || (accountCount==1 && ac.defaultIdentity)) {
            // account.identities is an nsISupportsArray of nsIMsgIdentity objects
            // account.defaultIdentity is an nsIMsgIdentity
            if (msg.accountKey)
              util.logDebugOptional('getSourceFolder', "Found account with matching key: " + ac.key);
            // account.incomingServer is an nsIMsgIncomingServer
            if (ac.incomingServer && ac.incomingServer.canHaveFilters) {
              // ac.defaultIdentity
              sourceFolder = ac.incomingServer.rootFolder;
              util.logDebugOptional('createFilter', "rootfolder: " + sourceFolder.prettyName || '(empty)');
            }
            else {
              util.logDebugOptional('createFilter', "Account - No incoming Server or cannot have filters!");
              let wrn = util.getBundleString('quickfilters.createFilter.warning.noFilterFallback',
                'Account [{1}] of mail origin cannot have filters!\nUsing current Inbox instead.');
              util.popupAlert(wrn.replace('{1}', ac.key));
            }
            break;
          }
        }                       
      }
      return sourceFolder; 
    }
    catch(ex) {
      util.logException("getSourceFolder() failed", ex);
    }
    return null;
  } ,
  
  // folder is the target folder - we might also need the source folder
  createFilter: function createFilter(sourceFolder, targetFolder, messageList, filterAction, filterActionExt) {
    const util = quickFilters.Util,
          Cc = Components.classes,
          Ci = Components.interfaces,
          prefs = quickFilters.Preferences;
    function warningUpdate() {
      let wrn = util.getBundleString('quickfilters.createFilter.warning.noHeaderParser',
                  'Sorry, but in this version of {1}, we cannot create filters as it does not support extracting addresses from the message header.'
                ),
          suggest = util.getBundleString('quickfilters.createFilter.warning.suggestUpdate',
                      'Consider updating to a newer version to get this feature.'
                    ),
          theAlert = wrn.replace('{1}', util.Application) + '\n' + suggest;
      util.popupAlert(theAlert);
    }

    // do an async repeat if it fails for the first time
    function rerun(reason) {
      quickFilters.Worker.reRunCount++;
      util.logDebugOptional('createFilter', 'rerun(' + quickFilters.Worker.reRunCount + ') : ' + reason);
      if (quickFilters.Worker.reRunCount > 5) {
        // NOTE FOR REVIEWERS - eventually I hope to fix this problem so there is no need to bother localizers with translating this message:
        let wrn = "Tried to create a filter " + (quickFilters.Worker.reRunCount+1) + " times, but it didn't work out.\n"
          + "Try to move a different message. Otherwise, updating " + util.Application + " to a newer version might help.\n\n"
          + "There seems to be an issue with message Databases not being ready when emails are moved across to a different IMAP account. "
          + "We currently have a support request with the mail application teams to help us resolve this problem. "
          + "Alternatively you can use 'Create Filter From Message' on the message after you moved it, "
          + "or move the mail to a local folder.";
        util.popupAlert(wrn);
        /* Exception, we do want to log this */
        util.logToConsole(wrn + '\nFor more detail, activate quickFilters debug mode and check Error Console');
        util.logDebug('sourceFolder: ' + (sourceFolder || '(empty)') + '\n'
           + 'targetFolder: ' + targetFolder +'\n'
           + 'messageList: ' + messageList.length + ' items\n'
           + 'filterAction: ' + filterAction + '\n'
           + 'filterActionExt: ' + filterActionExt);
        quickFilters.Worker.reRunCount=0;
        // util.closeTempFolderTab();
        return 0;
      }
      //targetFolder.updateFolder(msgWindow);
      window.setTimeout(function() {
            let filtered = quickFilters.Worker.createFilter(sourceFolder, targetFolder, messageList, filterAction, filterActionExt);
            quickFilters.Util.logDebug('createFilter returned: ' + filtered);
          }, 400);
      return 0;
    }

    if (!messageList || !targetFolder) {
      this.promiseCreateFilter = false;
      return null;
    }
      
    // new: if no source folder is given, we have to add a step for selecting an inbox / account!

    let filtersList,
        isFromMessageContext = false, // new method from message popup (create filter from msg)
                                      // this means messageList is an array of messages, not ids 
                                      // as in drag+drop case!
        emailAddress, ccAddress, bccAddress,
        fflags = util.FolderFlags,
        firstMessage = messageList[0];
    
    /************* VALIDATE MSGHEADER  ********/
    util.debugMsgAndFolders('sourceFolder', (sourceFolder ? sourceFolder.prettyName || '' : 'none'), targetFolder, firstMessage.msgHeader, filterAction);
    // Force always refresh Headers - we need to clone all messages for reliable filter building (parse group of emails)
    // refresh message headers
    if (!this.refreshHeaders(messageList, targetFolder, sourceFolder)) {
      return rerun('targetFolder Database not ready');
    }
    if (!firstMessage.msgHeader 
        || firstMessage.msgHeader.messageId != firstMessage.messageId 
        || !firstMessage.msgHeader.accountKey
        || !firstMessage.msgClone) {
      // if (quickFilters.Worker.reRunCount==3) { 
        // // open folder temporarily in a tab to force refreshing headers.
        // let background = (util.Application=='Postbox') ? false : true;
        // util.openTempFolderInNewTab(targetFolder, background);
      // }
    }
    // util.closeTempFolderTab(); // tidy up if it was necessary
    let messageDb = targetFolder.msgDatabase ? targetFolder.msgDatabase : targetFolder.getMsgDatabase(null);
    
    /************* SOURCE FOLDER VALIDATION  ********/
    if (sourceFolder) {
      util.logDebugOptional('createFilter',' Starting source folder validation for ' + sourceFolder);
      
      if (sourceFolder.server) {
        if (!sourceFolder.server.canHaveFilters) {
          util.logDebug ("sourceFolder.server cannot have filters!");
          util.logDebug ("sourceFolder=" + sourceFolder);
          util.logDebug ("sourceFolder.server=" + sourceFolder.server);
          let serverName = sourceFolder.server.name ? sourceFolder.server.name : "unknown";
          util.logDebug ("sourceFolder.server.name=" + serverName);
          let wrn = util.getBundleString('quickfilters.createFilter.warning.canNotHaveFilters','The account ({1}) cannot have filters.');
          util.popupAlert(wrn.replace('{1}', serverName));
          this.promiseCreateFilter = false;
          return false;
        }
      }
      else {
        util.logDebug ("sourceFolder has no server!");
        util.logDebug ("sourceFolder=" + sourceFolder);
        util.logDebug ("sourceFolder.prettyName=" + sourceFolder.prettyName);
        if (sourceFolder.prettyName) {
          let wrn = util.getBundleString('quickfilters.createFilter.warning.noServer','Folder ({1}) does not have a server.');
          util.popupAlert(wrn.replace('{1}', sourceFolder.prettyName));
        }
        this.promiseCreateFilter = false;
        return false;
      }
      
      util.logDebugOptional('createFilter', "Validation passed: server of sourceFolder " + sourceFolder.prettyName + " can have filters");
      if (!quickFilters.Util.AssistantActive ) {  
        this.promiseCreateFilter = false; 
        return -2; 
      }
    }
    else {
      util.logDebugOptional('createFilter', "no sourceFolder: checking server...");
      // we need an (synchronous?) way of determining the source folder (current inbox?)
      // a dialog with an account dropdown would probably be the best thing.
      let server = targetFolder.server;
      if (!server) { this.promiseCreateFilter = false; return -3; }
      util.logDebugOptional('createFilter', "no sourceFolder: checking server.rootFolder...");
      let root = server.rootFolder;
      if (!root) { this.promiseCreateFilter = false; return -4; }
      
      isFromMessageContext = true;
      // sourceFolder - determine from message has priority
      let sF = this.getSourceFolder(firstMessage.msgHeader);
      if (sF) 
        sourceFolder = sF;
      
      // fallback: determine the inbox for target folder
      /******** v v v OBSOLETE code???  v v v  [[[ ********/
      // Note: the following code works for old versions of Thunderbird (38.8), so we are leaving it in
      if (!sourceFolder && root.hasSubFolders) {
        util.logDebugOptional('createFilter', "no sourceFolder: root.hasSubFolders ");
        // unfortunately, Postbox doesn't define subFolders of nsIMsgFolder
        if (typeof root.subFolders !== 'undefined') {
          let sF = quickFilters.Shim.findInboxFromRoot(root, fflags);
          if (sF) sourceFolder = sF;      
        }
        else if (root.GetSubFolders) { // Postbox - mailCommands.js:879
          let iter = root.GetSubFolders();
          while(true) {
            try {
              let folder = iter.currentItem();
              if (folder.getFlag && folder.getFlag(fflags.Inbox)) {
                util.logDebugOptional('createFilter', "sourceFolder: determined Inbox " + folder.prettyName);
                sourceFolder = folder;
                break;
              }     
              iter.next();
            } 
            catch(ex) {
              break;
            }
          }
        }
        else {
          util.logDebugOptional('createFilter', "no sourceFolder: root has no subFolders or method for getting them");
        }
      }
      /******** ^ ^ ^ OBSOLETE code???  ^ ^ ^ ]]] ********/
    }
    
    if (!sourceFolder) {
      let txtMessage = 'Sorry but I cannot determine the original folder (SourceFolder) for this Message.\n'
        + 'Filter creation had to be abandoned.';
      util.popupAlert(txtMessage);
      util.logDebug(txtMessage);
      this.promiseCreateFilter = false;
      return -5;
    }
    // mail has not been moved here - likely this filter will be about tagging or other actions, not moving mail!
    if ( filterAction && 
         (filterAction != Ci.nsMsgFilterAction.CopyToFolder 
          &&
          filterAction != Ci.nsMsgFilterAction.MoveToFolder )
        || sourceFolder.URI == targetFolder.URI
        || targetFolder.getFlag(fflags.Inbox)
        || targetFolder.getFlag(fflags.Drafts)
        || targetFolder.getFlag(fflags.SentMail)
        || targetFolder.getFlag(fflags.Newsgroup)
        || targetFolder.getFlag(fflags.Queue)
        || targetFolder.getFlag(fflags.Templates)) {
      // should at least apply to Inbox, Sent, Drafts. we can do some special checking if this is not the case...
      prefs.isMoveFolderAction = false;
    }
    else {
      prefs.isMoveFolderAction = true
      filterAction = Ci.nsMsgFilterAction.MoveToFolder; // we need to assume this in order to merge!
    }
    let msg;

    /************* MESSAGE PROCESSING  ********/
    try {
      let messageHeader;
      // for the moment, let's only process the first element of the message Id List;
      if (messageList.length) {
        let messageId;
        util.logDebugOptional ("createFilter", "messageList.length = " + messageList.length);
        messageHeader = firstMessage.msgClone;
        messageId = firstMessage.messageId;
        if (!isFromMessageContext) {
          if (!messageId) {
            let wrn = util.getBundleString('quickfilters.createFilter.warning.noMessageId',
                "Failed to create Filter - could not retrieve message id for the first element of the messages list!\n"
                  + "Consider running the Repair Folder command.");
            util.popupAlert(wrn);
            this.promiseCreateFilter = false;
            return -1;
          }
          if (messageDb) {
            // important fix for new Postbox:
            if (!messageHeader || !firstMessage.msgClone.initialized)
              messageHeader = messageDb.getMsgHdrForMessageID(messageId);
          }
          else { // Postbox ??
            try {
              util.logDebugOptional ("createFilter", "no messageDb for folder, using original message header...");
              messageHeader = firstMessage.msgClone;
            }
            catch(e) {
              let wrn = util.getBundleString('quickfilters.createFilter.warning.noMessageDb', "Cannot access message database for folder {1}");
              util.popupAlert(wrn.replace('{1}', targetFolder.prettyName) + "\n" + e);
              this.promiseCreateFilter = false;
              return null;
            }
          }
        }

        if (!messageHeader) {
          util.logDebug ("Cannot get messageHeader for messageId [" + messageId + "]- attempting rerun()...");
          return rerun('no message header');
        }
        msg = messageHeader; //.QueryInterface(Ci.nsIMsgDBHdr);
        if (!msg) {
          util.logDebug ("No msg from messageHeader - attempting rerun()...");
          return rerun('no nsIMsgDBHdr from messageHeader');
        }
        if (msg.messageId != firstMessage.messageId) {
          util.logDebug ("MessageId mismatch! Email was moved, invalidating msgHeader.messageId."
            + "\n  Before moving: messageId = " + firstMessage.messageId
            + "\n  After moving: messageId = " + msg.messageId);
        }
      }

      // -----------------------------------------------------------------------
      // -----------------------------------------------------------------------
      //   DA  GEHT'S WEITER! 
      if (msg) {
        let key = msg.messageKey;
        util.logDebugOptional ("createFilter","got msg; messageKey=" + key);
        
        // some of the fields are not filled, so we need to go to the db to get them
        // let msgHdr = targetFolder.msgDatabase.GetMsgHdrForKey(key); // .QueryInterface(Ci.nsIMsgDBHdr);
        // default filter name = name of target folder
        util.debugMsgAndFolders('messageKey', key, targetFolder, msg, filterAction);
        let hdrParser = Cc["@mozilla.org/messenger/headerparser;1"].getService(Ci.nsIMsgHeaderParser);
        if (hdrParser) {
          if (hdrParser.extractHeaderAddressMailboxes) { 
            util.logDebugOptional ("createFilter","parsing msg header...");
            emailAddress = this.parseHeader(hdrParser, msg.author);
            ccAddress = this.parseHeader(hdrParser, msg.ccList);
            bccAddress = this.parseHeader(hdrParser, msg.bccList);
            util.logDebugOptional ("createFilter","emailAddress = " + emailAddress + ", ccAddress = " + ccAddress + ", bccAddress=" + bccAddress);
          }
          else { // Tb 2 can't ?
            warningUpdate();
            util.logDebugOptional ("createFilter","no header parser :(\nAborting Filter Operation");
            this.promiseCreateFilter = false;
            return 0;
          }
          util.logDebugOptional ("createFilter","message header parsed.");
        }
        else { // exception
          warningUpdate();
          this.promiseCreateFilter = false;
          return 0;
        }

        let previewText = msg.PreviewText; //  msg.getStringProperty('preview');
        util.logDebugOptional ("createFilter", "previewText="+ previewText || '(empty)');

        /***************  USER INTERFACE  **************/
        if (emailAddress)
        {
          let theDate = "none";
          if (msg.date) {
            let dt = new Date(msg.dateInSeconds * 1000);
            theDate = dt.getDate().toString() + '/' + (dt.getMonth()+1) + ' ' + dt.getFullYear() + ' ' + dt.getHours() + ':' + dt.getMinutes() + ':' + dt.getSeconds();
          }

          let preview = {
            author: emailAddress,
            lines: msg.lineCount,
            recipients: msg.mime2DecodedRecipients || msg.recipients,
            subject: msg.mime2DecodedSubject || msg.subject,
            date: theDate,
            lines: msg.lineCount,
            msgCount: messageList.length
          }
          let params = { 
            answer: null, 
            selectedMergedFilterIndex: -1, 
            cmd: 'new' ,
            preview: preview
          };
          /** we have retrieved the message and got the necessary information that it is a 
              suitable candidate to create a filter from, now select a template
              => quickFilters.Assistant.loadAssistant() is called
              **/
          // We have to do prefill filter so we are going to launch the
          // filterEditor dialog and prefill that with the emailAddress.
          
          if (sourceFolder) {
            // mailWindowOverlay.js:1790
            filtersList =
              sourceFolder.getEditableFilterList(msgWindow);
          }
          // we can clone a new nsIMsgFilterList that has matching target folders.
          let matchingFilters = [];
          for (let f = 0; f < filtersList.filterCount; f++) {
            let aFilter = filtersList.getFilterAt(f),  // nsIMsgFilter 
                primaryAction; // if primary action is moving to folder
            try {
              primaryAction = aFilter.getActionAt(0);
            }
            catch(ex) {
              util.logDebug("Check for merging - omitting Filter because action cannot be retrieved: " + aFilter.filterName);
              primaryAction = null;
            }
            
            
            // make a list of filters with matching primary action
            // see https://developer.mozilla.org/en-US/docs/XPCOM_Interface_Reference/nsMsgRuleActionType
            if (primaryAction && filterAction == primaryAction.type) {
              switch(primaryAction.type) {
                case Ci.nsMsgFilterAction.MoveToFolder:
                case Ci.nsMsgFilterAction.CopyToFolder:
                  if (primaryAction.targetFolderUri) {
                    util.logDebugOptional("merge.detail", "Checking Filter " + aFilter.filterName + " - target folder = " + primaryAction.targetFolderUri)
                    if (primaryAction.targetFolderUri == targetFolder.URI)  {
                      matchingFilters.push(aFilter);
                      util.logDebugOptional("merge, merge.detail", 
                        "======================= MERGE MATCH  ===================\n" +
                        "  Found filter [" + aFilter.filterName + "] merging match target folder. ADDING TO matchingFilters.");
                    }
                  }
                  break;
                case Ci.nsMsgFilterAction.AddTag:
                  // filterActionExt = newFlag parameter of  OnItemPropertyFlagChanged: count of tags added.
                  // this is unspecific so we need to guess
                  // [Bug 26545] Filter Merge not working
                  if (filterActionExt) {
                    let kw = msg.getStringProperty ? msg.getStringProperty("keywords") : msg.Keywords;
                    if (kw.indexOf(primaryAction.strValue)>=0)  {
                      matchingFilters.push(aFilter);
                      util.logDebugOptional("merge, merge.detail", 
                        "======================= MERGE MATCH  ===================\n" +
                        "Found filter [" + aFilter.filterName + "] merging match tag: " + primaryAction.strValue);
                    }
                  }
                  break;
              }
            }
          }
          // **************************************************************
          // *******   SYNCHRONOUS PART: Shows Filter Assistant!    *******
          // **************************************************************
          let win = window.openDialog('chrome://quickfilters/content/filterTemplate.xhtml',
            'quickfilters-filterTemplate',
            'chrome,titlebar,alwaysRaised,modal,resizable,cancel,extra1,extra2', // ,accept,cancel,moveable
            params,
            matchingFilters).focus(); // pass array of matching filters as additional arg

          // user cancels:
          if (!params.answer) {
            while (matchingFilters.length) matchingFilters.pop();
            this.promiseCreateFilter = false;
            return 0;
          }
          
          // is there an existing filter selected for merging?
          let mergeFilterIndex = params.selectedMergedFilterIndex; // -1 for none
          // let's make this asynchronous also (so we can rerun it) - make sure to reset promiseCreateFilter when it finishes!
          quickFilters.Worker.reRunCount = 0;
          this.buildFilter(sourceFolder, targetFolder, messageList, messageDb, filterAction, matchingFilters, 
                           filtersList, mergeFilterIndex, emailAddress, ccAddress, bccAddress, filterActionExt);
        }
        else  // just launch filterList dialog
        {
          quickFilters.Worker.openFilterList(false, sourceFolder);
        }
      }
      else {
        util.logDebugOptional ("createFilter","no message found to set up filter");
      }
      this.promiseCreateFilter = false;
      return 1; // success
    }
    catch(e) {
      alert("Exception in quickFilters.Worker.createFilter: " + e.message);
      this.promiseCreateFilter = false;
      return -1;
    }
    this.promiseCreateFilter = false;
    return null;

  } ,
  
  buildFilter: function buildFilter(sourceFolder, targetFolder, messageList, messageDb, filterAction, 
                        matchingFilters, filtersList, mergeFilterIndex, emailAddress, ccAddress, bccAddress, filterActionExt) { 
    const Cc = Components.classes,
          Ci = Components.interfaces,
          util = quickFilters.Util,
          prefs = quickFilters.Preferences;
    function addTerm(target, term) {
      // avoid duplicate:
      if (util.checkExistsTerm(target.searchTerms, term)) {
        util.logToConsole("Not adding already existing term to avoid duplicate: " + term.termAsString);
        return false;
      }
      
      if (isMerge && prefs.getBoolPref('searchterm.insertOnTop')) {
        try {
          // [Bug 26664] add condition on top instead of appending at bottom
          let ts = target.searchTerms; // returns  nsIMutableArray
          ts.insertElementAt(term, 0);
        }
        catch (ex) {
          util.logException("Could not insert term at top - appending to end instead.", ex);
          target.appendTerm(term);
        }
      }
      else {
        target.appendTerm(term);
      }     
      return true;
    }
          
    function createTerm(filter, attrib, op, val, customId) {
      // if attrib = custom?
      // https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIMsgSearchTerm
      let searchTerm = filter.createTerm(),
          value = searchTerm.value; // Ci.nsIMsgSearchValue
      searchTerm.attrib = attrib;
      searchTerm.op = op;
      searchTerm.booleanAnd = false;
      value.attrib = searchTerm.attrib;
      value.str = val;
      searchTerm.value = value;
      if (customId)
        searchTerm.customId = customId;
      return searchTerm;
    }

    function createTermList(array, targetFilter, attrib, operator, excludeAddressList, excludedAddresses, domainSwitch, customId) {
      let TA = Ci.nsMsgSearchAttrib;
      for (let counter=0; counter<array.length; counter++) {
        try {
          let trmValue = array[counter];
          trmValue = trmValue.trim().toLowerCase(); // make sure we also cover manually added addresses which might be cased wrongly
          let isAddress = (attrib == TA.To  
                          || attrib == TA.CC
                          || attrib == TA.Sender
                          || attrib == TA.Custom);
       
          if (isAddress) {
            trmValue = util.extractEmail(trmValue, domainSwitch);
          }          
        
          if (isAddress && excludeAddressList.indexOf(trmValue)>=0) {
            if (excludedAddresses.indexOf(trmValue)<0) { // avoid duplicates in exclusion list!
              excludedAddresses.push(trmValue);
              util.logDebugOptional ('template.multifrom', 'Excluded from multiple(from) filter: ' + trmValue);
            }
          }
          else {
            let term = createTerm(targetFilter, attrib, operator, trmValue, customId);
            addTerm(targetFilter, term);
          }
        }
        catch(ex) {
          util.logException("buildFilter().createTermList() appending term failed: ", ex);
        }
      }
    }
  
    function getAllTags() {
      let tagService = Cc["@mozilla.org/messenger/tagservice;1"]
              .getService(Ci.nsIMsgTagService);
      return tagService.getAllTags({});
    }
    
    function getTagsFromMsg(tagArray, msg) {
      let tagKeys = {};
      for (let ta=0; ta<tagArray.length; ta++) {
        let tagInfo = tagArray[ta];
        if (tagInfo.tag)
          tagKeys[tagInfo.key] = true;
      }
          
      let kw = msg.getStringProperty ? msg.getStringProperty("keywords") : msg.Keywords,
          tagKeyArray = kw.split(" "),
          // attach legacy label to the front if not already there
          label = msg.label;
      if (label)
      {
        let labelKey = "$label" + label;
        if (tagKeyArray.indexOf(labelKey) < 0)
        tagKeyArray.unshift(labelKey);
      }

      // Rebuild the keywords string with just the keys that are actual tags or
      // legacy labels and not other keywords like Junk and NonJunk.
      // Retain their order, though, with the label as oldest element.
      for (let i = tagKeyArray.length - 1; i >= 0; --i)
        if (!(tagKeyArray[i] in tagKeys))
          tagKeyArray.splice(i, 1); // remove non-tag key
      
      return tagKeyArray;
    }
    
    function getMailKeyword(subject) {
      let topicFilter = subject,
          left,right;
      if ( (left=subject.indexOf('[')) < (right=subject.indexOf(']')) ) {
        topicFilter = subject.substr(left, right-left+1);
      }
      else if ( (left=subject.indexOf('{')) < (right=subject.indexOf('}')) ) {
        topicFilter = subject.substr(left, right-left+1);
      }
      if (!topicFilter)
        topicFilter = subject;
      util.logDebugOptional('createFilter','subject parsed:' + topicFilter);
      return topicFilter;
    }

    /** buildFilter: declarations **/
    const nsMsgFilterType = Ci.nsMsgFilterType,    
          nsMsgFilterAction = Ci.nsMsgFilterAction;
    let isMerge = false,
        folderName = targetFolder.prettyName,
        filterName = '{1}',
        tagArray = getAllTags(),
        targetFilter,
        msgKeyArray,
        addressArray = [],
        typeAttrib = Ci.nsMsgSearchAttrib,
        typeOperator = Ci.nsMsgSearchOp;
    
    // user has selected a template which is stored in a pref string.
    // this can be one of the following values:
    // 
    // quickFilterCustomTemplate:XXX  (unique filter name)
    let template = prefs.getCurrentFilterTemplate(),    
        customTemplate = null,
        customFilter = null,
        searchTerm, searchTerm2, searchTerm3; // helper variables for creating filter terms
    if (template.indexOf('quickFilterCustomTemplate')==0) {
      customTemplate = template;
      template = 'custom';
      
      let localFolder = util.getMsgFolderFromUri('mailbox://nobody@Local%20Folders'),
          localFolderList = 
            localFolder.getEditableFilterList(null),
          filterCount = localFolderList.filterCount;
      for (let i = 0; i < filterCount; i++) {
        let filter = localFolderList.getFilterAt(i);
        if (customTemplate == filter.filterName) {
          customFilter = filter;
          break;
        }
      }
    }
    
    if (prefs.isDebugOption('buildFilter')) debugger;
    // create new filter or load existing filter?
    if (mergeFilterIndex>=0) {
      targetFilter = matchingFilters[mergeFilterIndex];
      isMerge = true;
    }
    else {
      targetFilter = filtersList.createFilter(folderName);
    }
    while (matchingFilters.length) matchingFilters.pop();
  
    // for safety let's refresh the headers now that the target folder has "settled".
    if (!messageList[0].msgClone || messageList[0].msgClone.messageId != messageList[0].messageId) {
      if (quickFilters.Worker.reRunCount < 5 &&
          !this.refreshHeaders(messageList, targetFolder, sourceFolder)) 
      {
        let delay = prefs.getIntPref('refreshHeaders.wait');
        util.logDebugOptional('buildFilter','buildFilter(' + sourceFolder.name + ') - failed refreshHeader, retrying..[' + quickFilters.Worker.reRunCount + ']');
        
        window.setTimeout(function() {   
          quickFilters.Worker.buildFilter(sourceFolder, targetFolder, messageList, messageDb, filterAction, 
                                          matchingFilters, filtersList, mergeFilterIndex, emailAddress, ccAddress, bccAddress, filterActionExt);
          }, delay);
        quickFilters.Worker.reRunCount++
        return;
      }
    }
    let msg = messageList[0].msgClone,
        // prepare stop list: my own email addresses shall not be added to the filter conditions (e.g. I am in cc list etc.)
        myMailAddresses = util.getIdentityMailAddresses(),
        excludedAddresses = [];

    switch (filterAction) {
      case nsMsgFilterAction.MoveToFolder:
      case nsMsgFilterAction.CopyToFolder:
        filterName = filterName.replace("{1}", folderName);
        break;
      case nsMsgFilterAction.AddTag:
        msgKeyArray = getTagsFromMsg(tagArray, msg);
        // -- Now try to match the search term
        //createTerm(filter, attrib, op, val)

        let sTags = '';
        if (filterActionExt) {
          sTags = filterActionExt;
        }        
        else
          for (let i = msgKeyArray.length - 1; i >= 0; --i) {
            for (let ti=0; ti<tagArray.length; ti++) {
              let tagInfo = tagArray[ti];
              if (tagInfo.key === msgKeyArray[i])
                sTags += tagInfo.tag + ' ';
            }
          }
        filterName = filterName.replace("{1}", sTags);
        break;
      default:
        filterName = filterName.replace("{1}", folderName);
        break;
    }       
    
    // TEMPLATES: filters
    switch (template) {
      // Based on Recipient (to) Conversation based on a Person 
      case 'to': case 'replyto':
        if (template === 'to') {
          emailAddress = msg.mime2DecodedRecipients;
        }
        else {
          // 
          let msgHdr = messageDb.getMsgHdrForMessageID(msg.messageId);
          emailAddress = msgHdr.getStringProperty('replyTo');
        }
        // fallthrough is intended!
      
      
      // Based on Sender (from) Conversation based on a Person 
      case 'from': // was 'person' but that was badly labelled, so we are going to retire this string
      case 'domain':
        // sender ...

        // ... recipient, to get whole conversation based on him / her
        // ... we exclude "reply all", just in case; hence Is not Contains
        // [Bug 25714] Fixed two-way Addressing
        // [Bug 25876] Fixed ONE-way addressing
        let twoWayAddressing = !prefs.getBoolPref("searchterm.addressesOneWay");
        if ((twoWayAddressing && template!='replyto') || template=='from' || template=='domain') {
          // from
          addressArray = emailAddress.split(",");
          let op =  (template === 'domain') ? typeOperator.EndsWith : typeOperator.Contains;
          createTermList(addressArray, targetFilter, typeAttrib.Sender, op, myMailAddresses, excludedAddresses, (template === 'domain'));
        }
        if (template!='domain' && (twoWayAddressing || template=='to' || template=='replyto') ) {
          // to
          addressArray = emailAddress.split(",");
          let theTypeAttrib = typeAttrib.To,  
              customId = null;
          if (template=='replyto') {
            theTypeAttrib = typeAttrib.Custom; // nsIMsgSearchCustomTerm 
            customId = quickFilters.CustomTermReplyTo.id;
            let filterService = Cc["@mozilla.org/messenger/services/filters;1"]
                                .getService(Ci.nsIMsgFilterService);
            if (!filterService.getCustomTerm(customId))
               filterService.addCustomTerm(quickFilters.CustomTermReplyTo);
          }
          createTermList(addressArray, targetFilter, theTypeAttrib, typeOperator.Contains, myMailAddresses, excludedAddresses, false, customId);
        }

        if (prefs.getBoolPref("naming.keyWord"))
          filterName += " - " + emailAddress.substr(0, 25); // truncate it for long cases
        break;
        
      // Group (collects senders of multiple mails)
      case 'multifrom':
        if (messageList.length <= 1) {
          let txtAlert = util.getBundleString('quickfilters.createFilter.warning.minimum2Mails', 'This template requires at least 2 mails');
          util.popupAlert(txtAlert);
          this.promiseCreateFilter = false;
          return false;               
        }
        
        let hdrParser = Cc["@mozilla.org/messenger/headerparser;1"].getService(Ci.nsIMsgHeaderParser),
            mailAddresses = []; // gather all to avoid duplicates!
        for (let i=0; i<messageList.length; i++) {
          // sender ...
          //let hdr = messageDb.getMsgHdrForMessageID(messageList[i].messageId);
          //msg = hdr.QueryInterface(Ci.nsIMsgDBHdr);
          msg = messageList[i].msgClone;
          if (msg) {
            emailAddress = this.parseHeader(hdrParser, msg.author); // assume there is always only 1 email address in author (no array expansion)
            if (myMailAddresses.indexOf(emailAddress)>=0) {
              // only add if not already in list!
              if (excludedAddresses.indexOf(emailAddress)<0) {
                excludedAddresses.push(emailAddress);
                util.logDebugOptional ('template.multifrom', 'Excluded from multiple(from) filter: ' + emailAddress);
              }
            }
            else if (mailAddresses.indexOf(emailAddress) == -1) { // avoid duplicates
              searchTerm = createTerm(targetFilter, typeAttrib.Sender, typeOperator.Contains, emailAddress);
              if (addTerm(targetFilter, searchTerm)) {
                util.logDebugOptional ('template.multifrom', 'Added to multiple(from) filter: ' + emailAddress);
                mailAddresses.push(emailAddress);
              }
            }
          }
        }
        // should this specifically add first names?
        if (!isMerge && prefs.getBoolPref("naming.keyWord"))
          filterName += " - group ";
        break;
        
      // 2nd Filter Template: Conversation based on a Mailing list (email to fooList@bar.org [Bug 26192])
      case 'maillist':
        //// FROM
        // createTerm(filter, attrib, op, val)
        let hdrListId = 'list-id',
            listIdValue = '',
            iCustomHdr = util.checkCustomHeaderExists(hdrListId);
        if (!iCustomHdr) {
          let txt = util.getBundleString('quickfilters.prompt.createCustomHeader', 
                               "Please add the term '{1}' as a custom header to use this in a filter.");
          if (confirm(txt.replace('{1}', hdrListId))) {
            let searchTermList = document.getElementById('searchTermList');
            // let's only fix this if we can:
            if (searchTermList) { // we can only fix this if the eedit filter window is opened:
              let lastId = 'searchAttr' + searchTermList.itemCount-1, // searchAttr0 is the first search Attribute
                  lastAttr = document.getElementById(lastId);
              if (lastAttr) {
                // contains a menulist (className = search-menulist)
                // lastAttr.selectItem( item )
                lastAttr.value="-2"; // custom
              }
            }
          }
          
          return; 
        }
        else {
          debugger;
          let msgHdr = messageDb.getMsgHdrForMessageID(msg.messageId);
          listIdValue = msgHdr.getStringProperty(hdrListId);
          if (currentHeaderData && currentHeaderData.hasOwnProperty(hdrListId)) {
            listIdValue = currentHeaderData[hdrListId].headerValue;
          }
          if (!listIdValue) {
            let uri = targetFolder.getUriForMsg(msg);
            util.CurrentMessage = msgHdr;
            util.CurrentHeader = new quickFilters.clsGetHeaders(uri, msgHdr); 
            listIdValue = util.replaceReservedWords("", hdrListId);
          }
        }
        if (listIdValue) {
          // look for gViewAllHeaders
          // searchTerm = createTerm(targetFilter, typeAttrib.Custom, typeOperator.Contains, listIdValue, hdrListId);
          searchTerm = targetFilter.createTerm();
          searchTerm.op = typeOperator.Contains;
          searchTerm.attrib = typeAttrib.Custom;
          if ('customId' in searchTerm) {
            searchTerm.customId = iCustomHdr ? iCustomHdr.toString() : hdrListId; // Tb
          }
          else {
            searchTerm.attrib = iCustomHdr.toString() ; // Postbox specific
          }
          if ('arbitraryHeader' in searchTerm)
            searchTerm.arbitraryHeader = hdrListId;
          
          let val = searchTerm.value; 
          val.attrib = searchTerm.attrib; // we assume this is always a string attribute
          
          // retrieve valueId from value!  - if the term was added as a custom term it will have an id in the attributes dropdown
          val.str = listIdValue; // copy string into val object
          searchTerm.value = val; // copy object back into 
          addTerm(targetFilter, searchTerm);
        }
        else {
          addressArray = emailAddress.split(",");
          createTermList(addressArray, targetFilter, typeAttrib.Sender, typeOperator.Contains, myMailAddresses, excludedAddresses);

          //// CC
          if (msg.ccList) {
            addressArray = ccAddress.split(",");
            createTermList(addressArray, targetFilter, typeAttrib.CC, typeOperator.Contains, myMailAddresses, excludedAddresses);
          }
        }
        if (prefs.getBoolPref("naming.keyWord"))
          filterName += " - " + emailAddress.substr(0,25);

        util.logDebug("maillist: " + targetFilter.searchTerms.length + " search term(s) added. ListId value=[" + listIdValue + "]");
        break;

      // 3d Filter Template: Conversation based on a Subject  (starts with [blabla])
      case 'topic':
        //// TO DO ... improve parsing of subject keywords
        //createTerm(filter, attrib, op, val)
        //searchTerm = createTerm(targetFilter, Ci.nsMsgSearchAttrib.Subject, Ci.nsMsgSearchOp.Contains, emailAddress);
        let topics = '',
            topicList = []; // Array checking for duplicates (doesn't work yet in merge case)
        for (let i=0; i<messageList.length; i++) {
          // sender ...
          //let hdr = messageDb.getMsgHdrForMessageID(messageList[i].messageId);
          //msg = hdr.QueryInterface(Ci.nsIMsgDBHdr);
          let tmsg = messageList[i].msgClone;
          if (tmsg) {
            let topicFilter = getMailKeyword(tmsg.mime2DecodedSubject);
            if (!topicFilter) continue;
            // guard against duplicates
            let isDupe=false;
            for (let j=0; j<topicList.length; j++) {
              if (topicList[j] == topicFilter)
                isDupe = true;
            }
            if (isDupe) continue;
            topicList.push(topicFilter);
            searchTerm = targetFilter.createTerm();
            searchTerm.attrib = typeAttrib.Subject;
            searchTerm.op = typeOperator.Contains;
            if (messageList.length>1) 
              searchTerm.booleanAnd = false;
            
            searchTerm.value = {
              attrib: searchTerm.attrib,
              str: topicFilter
            };
            addTerm(targetFilter, searchTerm);
            if (i==0) topics = topicFilter;
          }
        }
        if (prefs.getBoolPref("naming.keyWord"))
          filterName += " - " + topics;
        break;

      // 4th Filter Template: Based on a Tag
      case 'tag':
        // extract the tag keys from the msgHdr
        if (!msgKeyArray)
          msgKeyArray = getTagsFromMsg(tagArray, msg);
        // -- Now try to match the search term
        //createTerm(filter, attrib, op, val)
        for (let i = msgKeyArray.length - 1; i >= 0; --i) {
          searchTerm = createTerm(targetFilter, typeAttrib.Keywords, typeOperator.Contains, msgKeyArray[i]);
          addTerm(targetFilter, searchTerm);
          for (let ta=0; ta<tagArray.length; ta++) {
            let tagInfo = tagArray[ta];
            if (tagInfo.key === msgKeyArray[i])
              filterName += tagInfo.tag + ' ';
          }
        }               
        break;
        
      case 'custom':
        util.popupProFeature("customTemplate", true);    
        // retrieve the name of name customTemplate
        util.slideAlert('Creating Custom Filter from ' + customFilter.filterName + '...', 'quickFilters');
        // 1. create new filter
        let isMergeTargetFolder = prefs.isMoveFolderAction && targetFolder; // if we move to folder, remove default folder target
        util.copyActions(customFilter, targetFilter, isMergeTargetFolder);
        
        
        // build array of own emails to omit if multiple mails are evaluated to avoid adding damaging filter conditions:
        // overwrite it with an empty array if only one email is selected.
        /* if (messageList.length <= 1)
          myMailAddresses = null; */
        
        
        // 2. copy Terms, replacing all variables
        //    replaceTerms={msgHdr,messageURI} as 4th parameter is REQUIRED in order to parse all mime headers!!
        for (let i=0; i<messageList.length; i++) {
          msg = messageList[i].msgClone;
          let msgUri = messageList[i].messageURI;
          if (!msgUri && targetFolder) {
            //use folder to retrieve URI: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIMsgFolder#getUriForMsg.28.29
            msgUri = targetFolder.getUriForMsg(msg);
          }
          
          try { 
            util.copyTerms(customFilter, targetFilter, true, {"msgHdr": msg, "messageURI": msgUri}, false, myMailAddresses);
          }
          catch(ex) {
            alert("Could not run copyTerms: " + ex.message);
          }
        }       
        break;
        
      default: // shouldn't happen => no l10n
        util.popupAlert('invalid template: ' + template);
        this.promiseCreateFilter = false;
        return false;
    }

    // possible that we could not clone other array members. Let's re-initialize
    msg = messageList[0].msgClone;
    
    // ACTIONS: target folder, add tags
    if (prefs.getBoolPref("naming.parentFolder")) {
      if (targetFolder.parent) {
        let folderDelim = prefs.getStringPref('naming.folderDelimiter').trim() + " "; // leave blank to collapse to single space.
        filterName = targetFolder.parent.prettyName + " " + folderDelim + filterName;
      }
    }
    /* New Filter Options */
    if (!isMerge) {
      targetFilter.filterName = filterName;
      if (prefs.isMoveFolderAction) {
        let moveAction = targetFilter.createAction(); // nsIMsgRuleAction 
        moveAction.type = nsMsgFilterAction.MoveToFolder;
        moveAction.targetFolderUri = targetFolder.URI;
        targetFilter.appendAction(moveAction);
      }
      // filter type
      // https://dxr.mozilla.org/comm-central/source/comm/mailnews/base/search/content/FilterEditor.js#298
      targetFilter.filterType = nsMsgFilterType.None;
      
      if (sourceFolder && sourceFolder.getFlag(util.FolderFlags.Newsgroup))
        targetFilter.filterType |= nsMsgFilterType.NewsRule;
      else
        targetFilter.filterType |= nsMsgFilterType.InboxRule;
          
      if  (prefs.getBoolPref('newfilter.autorun')) {
        targetFilter.filterType |= nsMsgFilterType.Incoming;
      }
          
      if  (prefs.getBoolPref('newfilter.autorun')) {
        targetFilter.filterType |= nsMsgFilterType.Manual;
      }
      if (prefs.getBoolPref('newfilter.runAfterPlugins')) {
        targetFilter.filterType |=  nsMsgFilterType.PostPlugin;
      }
      if (prefs.getBoolPref('newfilter.runArchiving'))
        targetFilter.filterType |= nsMsgFilterType.Archive;

      if (prefs.getBoolPref('newfilter.runPostOutgoing'))
        targetFilter.filterType |= nsMsgFilterType.PostOutgoing;      
      
      // New in Thunderbird 68.
      if (nsMsgFilterType.Periodic && prefs.getBoolPref('newfilter.runPeriodically'))
        targetFilter.filterType |= nsMsgFilterType.Periodic;      
      
    }
    
    // this is set by the 'Tags' checkbox
    if (prefs.getBoolPref('actions.tags'))  {
      // the following step might already be done (see 'tag' template case):
      if (!msgKeyArray)
        msgKeyArray = getTagsFromMsg(tagArray, msg);
      
      if (msgKeyArray.length) {
        for (let i = msgKeyArray.length - 1; i >= 0; --i) {
          let tagActionValue;
          if (filterActionExt)
            tagActionValue = filterActionExt;
          else
            for (let ta=0; ta<tagArray.length; ta++) {
              let tagInfo = tagArray[ta];
              if (tagInfo.key === msgKeyArray[i]) {
                tagActionValue = tagInfo.key;
                break;
              }
            }
        
          let append = true;
          // avoid duplicates
          for (let b = 0; b < util.getActionCount(targetFilter); b++) { 
            let newActions = targetFilter.sortedActionList,
                ac = newActions[b].QueryInterface(Ci.nsIMsgRuleAction);

            if (ac.type == nsMsgFilterAction.AddTag
                && 
                ac.strValue == tagActionValue) {
              append = false;
              break;
            }
          }
  
          // only add if it could be matched and not exists already
          if (append && tagActionValue) {
            let tagAction = targetFilter.createAction();
            tagAction.type = nsMsgFilterAction.AddTag;
            tagAction.strValue = tagActionValue;
            targetFilter.appendAction(tagAction);
            util.logDebugOptional('buildFilter', "Added new Action: " + tagAction);
          }
        }
      }
    }
    
    // 'Priority' checkbox - copies priority
    if (prefs.getBoolPref('actions.priority') && msg.priority > 1) {
      let priorityAction = targetFilter.createAction();
      priorityAction.type = nsMsgFilterAction.ChangePriority;
      priorityAction.priority = msg.priority;  // nsMsgPriorityValue - 0 = not set! - 1= none
      targetFilter.appendAction(priorityAction);
    }
    
    // 'Star' checkbox - note this will only set the star (not reset!)
    if (prefs.isStarAction && msg.isFlagged) {
      let starAction = targetFilter.createAction();
      starAction.type = nsMsgFilterAction.MarkFlagged;
      targetFilter.appendAction(starAction);
    }       


    let warningOmitted = "";

    if (!isMerge) {
			if (excludedAddresses && excludedAddresses.length>0) {
				warningOmitted = util.getBundleString('quickfilters.merge.addressesOmitted', 
							"Email addresses were omitted from the conditions - quickFilters disables filtering for your own mail address:");
				let	list = '',
						newLine = '\n';
				for (let i=0; i<excludedAddresses.length; i++) {
					list += newLine + excludedAddresses[i];
				}
        warningOmitted = warningOmitted + list;
			}
      
      // [issue 23] avoid empty filters:
      if (targetFilter.searchTerms.length==0) {
        let txtAbort = "Filter could not be created: no valid Search Terms were be added, so filter would not be editable.\n",
            prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
        prompts.alert(window, "quickFilters", txtAbort + warningOmitted); 
        return;
      }
      
      // Add filter to the top
      util.logDebug("Adding new Filter '" + targetFilter.filterName + "' "
           + "for email " + emailAddress
           + ": current filter list has: " + filtersList.filterCount + " items");
      // make sure the new filter is enabled!!
      targetFilter.enabled = true;
      filtersList.insertFilterAt(0, targetFilter);
    }
    
    let isAccepted = true,
        showEditor = prefs.getBoolPref("showEditorAfterCreateFilter"),
        showList = prefs.getBoolPref("showListAfterCreateFilter");

    if (showEditor) {
      let args = { filter:targetFilter, filterList: filtersList};
      if (excludedAddresses && excludedAddresses.length>0) {
				util.slideAlert(warningOmitted, 'quickFilters');
      }
      
      //args.filterName = targetFilter.filterName;
      // check http://mxr.mozilla.org/comm-central/source/mailnews/base/search/content/FilterEditor.js
      // => filterEditor OnLoad()
      /************************************
        ***       FILTER RULES DIALOG   ***
        ***********************************
        */
      window.openDialog("chrome://messenger/content/FilterEditor.xhtml", "",
                        "chrome, modal, resizable,centerscreen,dialog=yes", args);
                        
      isAccepted = ("refresh" in args && args.refresh)  // was [Ok] clicked?
    }
    // move to alphabetical position (only new filters):
    let isAlpha = prefs.getBoolPref('newfilter.insertAlphabetical') && !isMerge;
    
    // If the user hits ok in the filterEditor dialog we set args.refresh=true
    // there we check this here in args to show filterList dialog.
    if (isAccepted) {  // Ok
      if (showList) {
        quickFilters.Worker.openFilterList(true, sourceFolder, targetFilter, null, isAlpha); // was: isMerge ? targetFilter : null
      }
      
      // stop filter mode after creating first successful filter.
      if (prefs.isAbortAfterCreateFilter()) {
        quickFilters.Worker.toggle_FilterMode(false);
      }
      
      // if _neither_ of the windows are displayed, show a sliding notification:
      if (!showEditor && !showList) {
        let txt = isMerge ?
          util.getBundleString("qf.notify.filterMergeUpdated", "Successfully updated filter '{0}'.") :
          util.getBundleString("qf.notify.filterCreated", "Successfully created new filter '{0}'");
        util.slideAlert(txt.replace('{0}', targetFilter.filterName), 'quickFilters');
      }
      
      if (!showList) {
        // MailServices.filters.applyFiltersToFolders(filterList, folders, gFilterListMsgWindow);
        // put filter in alphabetic order [Bug 26653]
        if (isAlpha) {
          filtersList.removeFilterAt(0);
          let numFilters = filtersList.filterCount;
          for (let idx=0; idx<numFilters; idx++) { 
            if (targetFilter.filterName.toLocaleLowerCase() < filtersList.getFilterAt(idx).filterName.toLocaleLowerCase()) {
              filtersList.insertFilterAt(idx, targetFilter); // we still may have to force storing the list!
              break;
            }
          }
        } 
        // Auto Run filter [Bug 26652] 
        if (prefs.getBoolPref('runFilterAfterCreate')) {
          util.logDebug ("Running new filter automatically: " + targetFilter.filterName);
          util.applyFiltersToFolder(sourceFolder, targetFilter);
        }
      }
    } // else, let's remove the filter (Cancel case)
    else { // Cancel
      if (!isMerge) {
        filtersList.removeFilterAt(0);
      }
    }
  } ,  // buildFilter
  
  /** legacy function (used from QuickFolders) **/
  createFilterAsync: function createFilterAsync(sourceFolder, targetFolder, messageIdList, filterAction, filterActionExt, isSlow, retry) {
    let messageList = [],
        util = quickFilters.Util,
        entry;
    if (!retry)
      retry = 1;
    util.logDebugOptional ("createFilter", "legacy createFilterAsync() Attempt = " + retry || '0');
    // to be backwards compatible with [old versions of] QuickFolders
    // we need to re-package the messageList elements in the format  { messageId, msgHeader}
    // to do: merge these changes into QuickFolders filter implementation
    for (let i = 0; i < messageIdList.length; i++) {  
      let messageId = messageIdList[i],
          messageDb = targetFolder.msgDatabase ? targetFolder.msgDatabase : targetFolder.getMsgDatabase(null); // msgDatabase
      if ((!messageDb || !messageDb.getMsgHdrForMessageID(messageId))
          && 
          sourceFolder)
      {
        messageDb = sourceFolder.msgDatabase ? sourceFolder.msgDatabase : sourceFolder.getMsgDatabase(null); // msgDatabase
      }
      if (messageDb) {
        let msgHeader = messageDb.getMsgHdrForMessageID(messageId);
        // this might take a while!
        if (!msgHeader) {
          retry++;
          if (retry<=20) { // let's try for 20*250 = 5 seconds
            window.setTimeout(function() { 
              quickFilters.Worker.createFilterAsync(sourceFolder, targetFolder, messageIdList, filterAction, filterActionExt, isSlow, retry); 
            }, 250);
          }
          else {
            // no joy! we need an error in console (and possibly an alert!)
            util.logToConsole ("legacy createFilterAsync()\n"
              + "I am giving up, can't get msgHeader from " + targetFolder.prettyName + ",\n"
              + "messageId = " + messageId, "createFilter");
          }
          return;
        }
        entry = util.makeMessageListEntry(msgHeader);
      }
      else
        entry =  {"messageId":msgHeader.messageId, "msgHeader":null};  // probably won't work
        
      messageList.push(entry);  // ### [Bug 25688] Creating Filter on IMAP fails after 7 attempts ###
    }
    
    return this.createFilterAsync_New(sourceFolder, targetFolder, messageList, filterAction, filterActionExt, isSlow);
  } ,

  createFilterAsync_New: function createFilterAsync_New(sourceFolder, targetFolder, messageList, filterAction, filterActionExt, isSlow) {
    const Ci = Components.interfaces,
          worker = quickFilters.Worker;
    let delay = isSlow ? 800 : 0; // wait for the filter dialog to be updated with the new folder if drag to new
    if (filterAction ===false) {  // old isCopy value
      filterAction = Ci.nsMsgFilterAction.MoveToFolder;
    }
    if (filterAction ===true) {  // old isCopy value
      filterAction = Ci.nsMsgFilterAction.CopyToFolder;
    }
    window.setTimeout(function() {
      // avoid repeating the same thing
      const util = quickFilters.Util;
      try {
        let filtered = worker.createFilter(sourceFolder, targetFolder, messageList, filterAction, filterActionExt);
        // remember message ids!
        if (quickFilters.Preferences.getBoolPref("nostalgySupport"))
          worker.lastAssistedMsgList = messageList;
        util.logDebugOptional('createFilter', 'createFilterAsync - createFilter returned: ' + filtered);
      }
      catch(ex) {
        util.logException("createFilterAsync_New() failed: ", ex);
      }
      finally { ; }
    }, delay);

  }

};


//			//// CHEAT SHEET
// 			// from comm-central/mailnews/test/resources/filterTestUtils.js
// 			let ATTRIB_MAP = {
// 				// Template : [attrib, op, field of value, otherHeader]
// 				"subject" : [Ci.nsMsgSearchAttrib.Subject, contains, "str", null],
// 				"from" : [Ci.nsMsgSearchAttrib.Sender, contains, "str", null],
// 				"date" : [Ci.nsMsgSearchAttrib.Date, Ci.nsMsgSearchOp.Is, "date", null],
// 				"size" : [Ci.nsMsgSearchAttrib.Size, Ci.nsMsgSearchOp.Is, "size", null],
// 				"message-id" : [Ci.nsMsgSearchAttrib.OtherHeader+1, contains, "str", "Message-ID"],
// 				"user-agent" : [Ci.nsMsgSearchAttrib.OtherHeader+2, contains, "str", "User-Agent"]
// 			 };
// 			 // And this maps strings to filter actions
// 			 let ACTION_MAP = {
// 				// Template : [action, auxiliary attribute field, auxiliary value]
// 				"priority" : [Ci.nsMsgFilterAction.ChangePriority, "priority", 6],
// 				"delete" : [Ci.nsMsgFilterAction.Delete],
// 				"read" : [Ci.nsMsgFilterAction.MarkRead],
// 				"unread" : [Ci.nsMsgFilterAction.MarkUnread],
// 				"kill" : [Ci.nsMsgFilterAction.KillThread],
// 				"watch" : [Ci.nsMsgFilterAction.WatchThread],
// 				"flag" : [Ci.nsMsgFilterAction.MarkFlagged],
// 				"stop": [Ci.nsMsgFilterAction.StopExecution],
// 				"tag" : [Ci.nsMsgFilterAction.AddTag, "strValue", "tag"]
// 				"move" : [Ci.nsMsgFilterAction.MoveToFolder, "folder"]
// 			 };
