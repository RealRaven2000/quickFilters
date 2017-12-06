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

END LICENSE BLOCK
*/

if (Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo).ID != "postbox@postbox-inc.com")
{
  // Here, Postbox declares fixIterator
  Components.utils.import("resource:///modules/iteratorUtils.jsm");  
}

// note: in QuickFolder_s, this object is simply called "Filter"!
quickFilters.Worker = {
  bundle: null,
  FilterMode: false,
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
          notifyBox.removeNotification(item, (quickFilters.Util.Application == 'Postbox'));  // skipAnimation
        }
      }, 200);
  } ,
  
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
          box.removeNotification(item, (util.Application == 'Postbox'));
      }   
    }
    
    util.logDebugOptional ("filters", "toggle_FilterMode(" + active + ")");
    let notificationId,
        notifyBox;

    if (!silent) {
      switch(util.Application) {
        case 'Postbox':
          notificationId = 'pbSearchThresholdNotifcationBar';  // msgNotificationBar
          break;
        case 'Thunderbird':
          notificationId = 'mail-notification-box'
          break;
        case 'SeaMonkey':
          notificationId = null;
          break;
      }
      let notificationKey = "quickfilters-filter";
      
      // do a tidy up in case this is already open!
      if (notificationId) { // SeaMonkey: no such thing yet.
        notifyBox = document.getElementById (notificationId);
        let item = notifyBox.getNotificationWithValue(notificationKey);
        if (item)
          notifyBox.removeNotification(item, (util.Application == 'Postbox')); // second parameter in Postbox(not documented): skipAnimation
      }

      if (active
        &&
        !this.FilterMode
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
          let nbox_buttons;
          // the close button in Postbox is broken: skipAnimation defaults to false and 
          // creates a invisible label with margin = (-height) pixeles, covering toolbars above
          // therefore we implement our own close button in Postbox!!
          if (util.Application == 'Postbox') {
            nbox_buttons = [
              {
                label: dontShow,
                accessKey: null,
                callback: function() { worker.showMessage(false); },
                popup: null
              },
              {
                label: 'X',
                accessKey: 'x',
                callback: function() { worker.onCloseNotification(null, notifyBox, notificationKey); },
                popup: null
              }
            ];
          }
          else {
            nbox_buttons = [
              {
                label: dontShow,
                accessKey: null,
                callback: function() { worker.showMessage(false); },
                popup: null
              }
            ];
          }
          
          
          notifyBox.appendNotification( theText,
              notificationKey ,
              "chrome://quickfilters/skin/filterTemplate.png" ,
              notifyBox.PRIORITY_INFO_LOW,
              nbox_buttons,
              function(eventType) { worker.onCloseNotification(eventType, notifyBox, notificationKey); } // eventCallback
              ); 
              
          if (util.Application == 'Postbox') {
            util.fixLineWrap(notifyBox, notificationKey);
          }           
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

    worker.FilterMode = active;
    let doc = util.getMail3PaneWindow().document,
        // container styling?
        button = doc.getElementById('quickfilters-toolbar-button');
    if (button) 
      button.checked = active;
    let menuItem = doc.getElementById('quickFilters-wizard');
    if (menuItem) {
      menuItem.checked = active;
      menuItem.label = util.getBundleString(
                          active ? "quickfilters.FilterAssistant.stop" : "quickfilters.FilterAssistant.start",
                          active ? "stop filter assistant" : "start filter assistant");
    }
    
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
		if (quickFilters.Util.Application === 'Postbox') {
			// guessing guessing guessing ...
			// somehow this takes the C++ signature?
			return parser.extractHeaderAddressMailboxes(null, msgHeader);
		}
		else {
			// Tb + SM
			return parser.extractHeaderAddressMailboxes(msgHeader);
		}
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
      if (!sourceFolder.server.canHaveFilters) {
        util.logDebug ("sourceFolder.server cannot have filters!");
        util.logDebug ("sourceFolder=" + sourceFolder);
        util.logDebug ("sourceFolder.server=" + sourceFolder.server);
        if (sourceFolder.server) {
          let serverName = sourceFolder.server.name ? sourceFolder.server.name : "unknown";
          util.logDebug ("sourceFolder.server.name=" + serverName);
          let wrn = util.getBundleString('quickfilters.createFilter.warning.canNotHaveFilters','The account ({1}) cannot have filters.');
          util.popupAlert(wrn.replace('{1}', serverName));
        }
        else {
          util.logDebug ("sourceFolder has no server!");
          util.logDebug ("sourceFolder=" + sourceFolder);
          util.logDebug ("sourceFolder.prettyName=" + sourceFolder.prettyName);
          if (sourceFolder.prettyName) {
            let wrn = util.getBundleString('quickfilters.createFilter.warning.noServer','Folder ({1}) does not have a server.');
            util.popupAlert(wrn.replace('{1}', sourceFolder.prettyName));
          }
        }
        this.promiseCreateFilter = false;
        return false;
      }
      util.logDebugOptional('createFilter', "Validation passed: server of sourceFolder " + sourceFolder.prettyName + " can have filters");
      if (!quickFilters.Worker.FilterMode) { this.promiseCreateFilter = false; return -2; }
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
      // determine the inbox for this target folder
      /******** v v v OBSOLETE code???  v v v   ********/
      if (root.hasSubFolders) {
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
      /******** ^ ^ ^ OBSOLETE code???  ^ ^ ^ ********/
      // sourceFolder
      let sF = this.getSourceFolder(firstMessage.msgHeader);
      if (sF) 
        sourceFolder = sF;
    }
    
    if (!sourceFolder) {
      let txtMessage = 'Sorry but I cannot determine the original folder (SourceFolder) for this Message.\n'
        + 'Filter creation had to be abandoned.';
      if (util.Application == 'Postbox') {
        txtMessage += '\n\nIn Postbox, I currently have no method for determining the origin of this message,'
         + '\ninstead please activate the filter assistant and then move or tag mails.'
      }
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
            if (!messageHeader)
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
          let params = { answer: null, selectedMergedFilterIndex: -1, cmd: 'new' };
          /** we have retrieved the message and got the necessary information that it is a 
              suitable candidate to create a filter from, now select a template
              => quickFilters.Assistant.loadAssistant() is called
              **/
          // We have to do prefill filter so we are going to launch the
          // filterEditor dialog and prefill that with the emailAddress.
          
          if (sourceFolder) {
            // mailWindowOverlay.js:1790
            filtersList = (util.Application === 'Postbox') 
              ? sourceFolder.getFilterList(msgWindow)
              : sourceFolder.getEditableFilterList(msgWindow);
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
                  if (primaryAction.targetFolderUri 
                      && 
                      primaryAction.targetFolderUri == targetFolder.URI)  {
                    matchingFilters.push(aFilter);
                  }
                  break;
                case Ci.nsMsgFilterAction.AddTag:
                  // filterActionExt = newFlag parameter of  OnItemPropertyFlagChanged: count of tags added.
                  // this is unspecific so we need to guess
                  if (filterActionExt > 0) {
									  let kw = msg.getStringProperty ? msg.getStringProperty("keywords") : msg.Keywords;
                    if (kw.indexOf(primaryAction.strValue)>=0)  {
                      matchingFilters.push(aFilter);
                    }
                  }
                  break;
              }
            }
          }
          // **************************************************************
          // *******   SYNCHRONOUS PART: Shows Filter Assistant!    *******
          // **************************************************************
          let win = window.openDialog('chrome://quickfilters/content/filterTemplate.xul',
            'quickfilters-filterTemplate',
            'chrome,titlebar,centerscreen,modal,centerscreen,resizable=yes,accept=yes,cancel=yes',
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
            targetFilter.appendTerm(term);
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
            (util.Application === 'Postbox') 
              ? localFolder.getFilterList(null)
              : localFolder.getEditableFilterList(null),
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
        if (twoWayAddressing || template=='from' || template=='domain') {
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
							targetFilter.appendTerm(searchTerm);
							util.logDebugOptional ('template.multifrom', 'Added to multiple(from) filter: ' + emailAddress);
							mailAddresses.push(emailAddress);
						}
					}
				}
				// should this specifically add first names?
				if (prefs.getBoolPref("naming.keyWord"))
					filterName += " - group ";
				break;
				
			// 2nd Filter Template: Conversation based on a Mailing list (email to fooList@bar.org )
			case 'list':
				//// FROM
				//createTerm(filter, attrib, op, val)
        addressArray = emailAddress.split(",");
        createTermList(addressArray, targetFilter, typeAttrib.Sender, typeOperator.Contains, myMailAddresses, excludedAddresses);

				//// CC
				if (msg.ccList) {
					addressArray = ccAddress.split(",");
          createTermList(addressArray, targetFilter, typeAttrib.CC, typeOperator.Contains, myMailAddresses, excludedAddresses);
				}
				if (prefs.getBoolPref("naming.keyWord"))
					filterName += " - " + emailAddress.substr(0,25);

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
            targetFilter.appendTerm(searchTerm);
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
					targetFilter.appendTerm(searchTerm);
          for (let ta=0; ta<tagArray.length; ta++) {
            let tagInfo = tagArray[ta];
						if (tagInfo.key === msgKeyArray[i])
							filterName += tagInfo.tag + ' ';
          }
				}               
				break;
      case 'custom':
        util.popupProFeature("customTemplate", true, false);    
        // retrieve the name of name customTemplate
        util.slideAlert('Creating Custom Filter from ' + customFilter.filterName + '...', 'quickFilters');
        // 1. create new filter
        let isMergeTargetFolder = prefs.isMoveFolderAction && targetFolder; // if we move to folder, remove default folder target
        util.copyActions(customFilter, targetFilter, isMergeTargetFolder);
        // 2. copy Terms, replacing all variables
        //    replaceTerms={msgHdr,messageURI} as 4th parameter is REQUIRED in order to parse all mime headers!!
        let msgUri = messageList[0].messageURI;
        if (!msgUri && targetFolder) {
          //use folder to retrieve URI: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIMsgFolder#getUriForMsg.28.29
          msgUri = targetFolder.getUriForMsg(msg);
        }
        
        util.copyTerms(customFilter, targetFilter, true, {"msgHdr": msg, "messageURI": msgUri});
        // util.replaceTermVarsFromMsg(targetFilter, msg, messageList[0].messageURI);
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
			if (targetFolder.parent)
				filterName = targetFolder.parent.prettyName + " - " + filterName;
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
      if  (!prefs.getBoolPref('newfilter.autorun')) {
        // nsMsgFilterType
        //if (targetFilter.filterType & nsMsgFilterType.Incoming)
        //  targetFilter.filterType -= nsMsgFilterType.Incoming;
        targetFilter.filterType = nsMsgFilterType.Manual;
      }
		}
		
		// this is set by the 'Tags' checkbox
		if (prefs.getBoolPref('actions.tags'))	{
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
						let newActions = targetFilter.actionList ? targetFilter.actionList : targetFilter.sortedActionList,
						    ac = newActions.queryElementAt ?
                        newActions.queryElementAt(b, Ci.nsIMsgRuleAction) :
                        newActions.QueryElementAt(b, Ci.nsIMsgRuleAction);
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

		if (!isMerge) {
			// Add filter to the top
			util.logDebug("Adding new Filter '" + targetFilter.filterName + "' "
					 + "for email " + emailAddress
					 + ": current filter list has: " + filtersList.filterCount + " items");
			// make sure the new filter is enabled!!
			targetFilter.enabled = true;
			filtersList.insertFilterAt(0, targetFilter);
		}

		let args = { filter:targetFilter, filterList: filtersList};
    if (excludedAddresses && excludedAddresses.length>0) {
      let text = util.getBundleString('quickfilters.merge.addressesOmitted', 
            "Email addresses were omitted from the conditions - quickFilters disables filtering for your own mail address:"), 
          list = '',
          newLine = (util.Application == 'Postbox') ? ' ' : '\n';
      for (let i=0; i<excludedAddresses.length; i++) {
        list += newLine + excludedAddresses[i];
      }
      util.slideAlert(text + list, 'quickFilters');
    }
    
		//args.filterName = targetFilter.filterName;
		// check http://mxr.mozilla.org/comm-central/source/mailnews/base/search/content/FilterEditor.js
		// => filterEditor OnLoad()
    /************************************
      ***       FILTER RULES DIALOG   ***
      ***********************************
      */
		window.openDialog("chrome://messenger/content/FilterEditor.xul", "",
											"chrome, modal, resizable,centerscreen,dialog=yes", args);

		// move to alphabetical position (only new filters):
		let isAlpha = prefs.getBoolPref('newfilter.insertAlphabetical') && !isMerge;
		
		// If the user hits ok in the filterEditor dialog we set args.refresh=true
		// there we check this here in args to show filterList dialog.
		if ("refresh" in args && args.refresh) // was [Ok] clicked?
		{  // Ok
      if (prefs.getBoolPref("showListAfterCreateFilter")) {
        quickFilters.Worker.openFilterList(true, sourceFolder, targetFilter, null, isAlpha); // was: isMerge ? targetFilter : null
      }
			
			// stop filter mode after creating first successful filter.
			if (prefs.isAbortAfterCreateFilter()) {
				quickFilters.Worker.toggle_FilterMode(false);
			}
		} //else, let's remove the filter (Cancel case)
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
				util.logException("createFilterAsync_New() failed: ", e);
			}
			finally {	;	}
    }, delay);

  }

};

quickFilters.Assistant = {
  selectedMergedFilterIndex: -1,
  currentCmd: null,
  MERGEPAGE : 0,
  TEMPLATEPAGE : 1,
  
  selectTemplate : function selectTemplate(element) {
    if (!element) {
      element = this.TemplateList;
    }
    quickFilters.Worker.SelectedValue = element.selectedItem.value;
    quickFilters.Preferences.setCurrentFilterTemplate(element.selectedItem.value);
  } ,
  
  get currentPage() {
    return parseInt(this.CurrentDeck.selectedIndex);
  },

  next : function next() {
    let isMerge = false,
        params = window.arguments[0];
    if (this.currentPage == this.MERGEPAGE) { 
      isMerge = document.getElementById('chkMerge').checked;
      this.selectedMergedFilterIndex = (isMerge) ? this.MatchedFilters.selectedIndex : -1;
    }
  
    if (this.currentCmd == 'mergeList') {
      params.answer  = true;
      params.selectedMergedFilterIndex = this.selectedMergedFilterIndex;
      setTimeout(function() {window.close()});
      return;
    }
    
    switch(this.currentPage) {
      case this.MERGEPAGE:  // existing filters were found, lets store selected filter index or -1!
        this.toggleMatchPane(false);
        
        this.NextButton.label = isMerge 
           ? this.getBundleString('qf.button.editFilter', "Edit Filter...")
           : this.getBundleString('qf.button.createFilter', "Create New Filter...");
        break;
      case this.TEMPLATEPAGE:  // we are in template selection, either go on to create new filter or edit the selected one from first step
        quickFilters.Assistant.selectTemplate();
        quickFilters.Worker.TemplateSelected = true;
        params.answer  = true;
        params.selectedMergedFilterIndex = this.selectedMergedFilterIndex;
        setTimeout(function() {window.close()});
        break;
    }
    
    return;
  } ,

  get NextButton() {
    return document.documentElement.getButton('extra1');
  } ,
  
  get MatchedFilters() {
    return document.getElementById('filterMatches');
  } ,
  
  get CurrentDeck() {
    return document.getElementById('assistantDeck');
  } ,

  cancelTemplate : function cancelTemplate() {
    quickFilters.Worker.TemplateSelected = false;
    let params = window.arguments[0];
    params.answer  = false;
    params.selectedMergedFilterIndex = -1;
    return true;
  } ,

  get TemplateList() {
    return document.getElementById('qf-filter-templates');
  } ,
  
  toggleMatchPane: function toggleMatchPane(toggle) {
    this.CurrentDeck.selectedIndex = toggle ? this.MERGEPAGE : this.TEMPLATEPAGE;
  } ,

  selectMatchFromList: function selectMatchFromList(list) {
    let isMerge = document.getElementById('chkMerge');
    isMerge.checked = (list.selectedCount>0) ? true : false;
    let chkCreateNew = document.getElementById('chkCreateNew');
    chkCreateNew.checked = !isMerge.checked;
  } ,
  
  selectMatch: function selectMatch(list) {
    let isMerge = document.getElementById('chkMerge');
    isMerge.checked = (list.selectedCount>0) ? true : false;
  } ,
  
  selectMerge: function selectMerge(isMerge) {
    this.MatchedFilters.selectedIndex = (isMerge.checked ? 0 : -1);
    let chkNew = document.getElementById('chkCreateNew');
    chkNew.checked = !isMerge.checked;
  } ,
  
  selectMergeAuto: function(checkBox) {
    // MergeSkip must be unchecked!
    if (!checkBox.checked) {  
      let chkSkip = document.getElementById('chkMergeSkip');
      chkSkip.checked = false;
      quickFilters.Preferences.setBoolPref("merge.silent", false);
    }
  
  } ,
  
  selectMergeSkip: function selectMergeSkip(checkBox) {
    // MergeAuto must be checked!
    if (checkBox.checked) {   
      let chkAuto = document.getElementById('chkMergeAuto');
      chkAuto.checked = true;
      quickFilters.Preferences.setBoolPref("merge.autoSelect", true);
    }
  } ,
  
  selectCreateNew: function selectCreateNew(isNew) {
    this.MatchedFilters.selectedIndex = (isNew.checked ? -1 : 0);
    let chkMerge = document.getElementById('chkMerge');
    chkMerge.checked = !isNew.checked;
  } ,
  
  loadAssistant : function loadAssistant() {
    // [Bug 25199] - Add Rules to existing filters 
    /* 1. find out the correct account (server) */
    /* 2. enumerate all filters of server and find the ones that have same target folder */
    /* 3. if any matching filters are found, list them on a separate page, and give an option to merge or ignore them
    /* 4. If user ignores merge process (or list of matches is empty), move on to template selection box */
    // initialize list and preselect last chosen item!
    
    let templateList = this.TemplateList,
        util = quickFilters.Util,
				prefs = quickFilters.Preferences;
    
    // [Bug 25989] Custom Templates Support
    if (prefs.getBoolPref('templates.custom')) {
      // add custom template(s)
      // enumerate Local Folders filters to find templates      
      
      // rebuildFilterList(gCurrentFilterList) // Tb
      // rebuildFilterList()
      //   this.gFilterTreeView.filterList = msgFolder.getEditableFilterList(gFilterListMsgWindow);
      // http://mxr.mozilla.org/comm-central/source/mail/base/content/FilterListDialog.js#613
      // let filterCount = gCurrentFilterList.filterCount;
      // for (let i = 0; i < filterCount; i++) {
      //   filter = gCurrentFilterList.getFilterAt(i);
      // }
      
      // select local folder
      // http://mxr.mozilla.org/comm-central/source/mail/base/content/FilterListDialog.js#203
      // setFolder
      //   gCurrentFilterList = msgFolder.getEditableFilterList(gFilterListMsgWindow);
      // local folder uri = mailbox://nobody@Local%20Folders
      // serverMenu item! 
      let localFolder = util.getMsgFolderFromUri('mailbox://nobody@Local%20Folders'),
          localFolderList = (util.Application === 'Postbox') 
                            ? localFolder.getFilterList(null)
                            : localFolder.getEditableFilterList(null),
          filterCount = localFolderList.filterCount;
      if (filterCount) {
        for (let i = 0; i < filterCount; i++) {
          let filter = localFolderList.getFilterAt(i),
              token = filter.filterName.split(':');
          if (token[0] && token[0].indexOf('quickFilterCustomTemplate')==0) {
            // add user assigned title
            if (token[1]) {
              templateList.insertItemAt(0, token[1].trim(), filter.filterName.toString()); // check filter.enabled ?
            }
            else {
              util.popupAlert('Invalid custom Filter name {' + filter.filterName + '}\n' +
                              'Expected Format is \"quickFilterCustomTemplate:title\"');
            }
          }
        }
      }
    }
    
    this.NextButton.setAttribute("class", "extra1"); // add some style
    
    let matchingFilters = window.arguments[1],
        isMergePossible = false;
    // list matching filters - they are passed when a merge is possible
    if (matchingFilters.length > 0) {
      this.toggleMatchPane(true);
      isMergePossible = true;
      let matchList = this.MatchedFilters;
      for (let i=0; i<matchingFilters.length; i++) {
        let itemLabel = matchingFilters[i].filterName;
        if (!matchingFilters[i].enabled)
          itemLabel += ' (disabled)';
        matchList.appendItem(itemLabel, i);
      }
      let params = window.arguments[0];
      this.currentCmd = params.cmd;
      
      switch (params.cmd) {
        case 'mergeList':
          this.NextButton.label = this.getBundleString('qf.button.merge');
          document.getElementById('mergeSummary').value = this.getBundleString('qf.description.mergeAddSummary');
          document.getElementById('mergeInstructions').value = this.getBundleString('qf.description.mergeAddInstructions');
          document.getElementById('chkMerge').label = this.getBundleString('qf.button.targetSelected');
          document.getElementById('filterDescription').value = '';
          document.getElementById('chkCreateNew').hidden = true;
          break;
        default:
          document.getElementById('mergeSummary').value = this.getBundleString('qf.description.mergeSummary');
          document.getElementById('mergeInstructions').value = this.getBundleString('qf.description.mergeInstructions');
          document.getElementById('filterDescription').value = this.getBundleString('qf.description.selectToExtend');
          this.NextButton.label = this.getBundleString('qf.button.next');
          break;
      }
    }
    
    templateList.value = prefs.getCurrentFilterTemplate();
    window.sizeToContent();
    // hide flag / star checkbox depending on application
    let hideCheckbox;
    switch(util.Application) {
      case 'Thunderbird':
        hideCheckbox = 'chkActionFlag';
        break;
      case 'SeaMonkey':
        hideCheckbox = 'chkActionStar';
        break;
    }
    
    let chk = document.getElementById(hideCheckbox);
    if (chk)
      chk.collapsed = true;
    
    if (isMergePossible) {
      // 1. default select merge
      if (prefs.getBoolPref('merge.autoSelect')
         ||
         prefs.getBoolPref('merge.silent')) {
        let mergeBox = document.getElementById('chkMerge');
        mergeBox.checked = true;
        // this will select the first item in the list
        util.logDebug("Merge filter: Selecting merge as default");
        quickFilters.Assistant.selectMerge(mergeBox);
      }
      // 2. automatically continue on to the next screen
      if (prefs.getBoolPref('merge.silent')) {
        util.logDebug("Merge filter: Skipping merge page (silent merge selected).");
        setTimeout( function() {quickFilters.Assistant.next();} ) ;
      }
    }
    
    // find and remove "replyto" feature!" still experimental until 2.8 release
    if (!prefs.getBoolPref('templates.replyTo')) {
      util.logDebug('remove replyto item from template list...');
      let listbox = this.TemplateList;
      for (let i=0; i<listbox.itemCount; i++) {
        let item = listbox.getItemAtIndex(i);
        if (item.value=='replyto') {
          listbox.removeItemAt(i);
          break;
        }
      }
    }
    
  } ,

  // gets strings from filters properties
  getBundleString: function getBundleString(id, defaultText) {
    //let bundle = document.getElementById("bundle_filter");
    try {
      if(!this.bundle)
        this.bundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                                .getService(Components.interfaces.nsIStringBundleService)
                                .createBundle("chrome://quickfilters/locale/filters.properties");
      return this.bundle.GetStringFromName(id);
    }
    catch(e) {
      quickFilters.Util.logException("Could not retrieve bundle string: " + id + "\n", e);
      if (defaultText) return defaultText;
    }
    return '';
  },

  selectTemplateFromList: function selectTemplateFromList(element) {
    if (!element) {
      element = this.TemplateList;
    }
    let templateType = element.selectedItem.value;
    if (templateType) {
      if (templateType.indexOf('quickFilterCustomTemplate')==0)
        templateType = 'custom';
      let descriptionId = "qf.filters.template." + templateType + ".description",
          desc = document.getElementById ("templateDescription");
      if (desc) {
        desc.textContent = this.getBundleString(descriptionId);
        window.sizeToContent();
        let rect = desc.getBoundingClientRect ? desc.getBoundingClientRect() : desc.boxObject;
        if (rect && rect.height && window.height) {
          window.height += rect.height;
        }
        else if (window.height) {
          // say 1 line of 20px per 50 characters
          window.height += (desc.textContent.length * 20) / 50;
        }
      }
    }
  },
  
  help: function help() {
    switch (this.currentPage) {
      case this.MERGEPAGE:
        quickFilters.Util.showHomePage('index.html#merge');
        break;
      case this.TEMPLATEPAGE:
        quickFilters.Util.showHomePage('index.html#assistant');
        break;
    }
  },

};  //Assistant


