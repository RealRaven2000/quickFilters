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

// note: in QuickFolder_s, this object is simply called "Filter"!
quickFilters.Worker = {
  bundle: null,
  FilterMode: false,
  reRunCount: 0,  // avoid endless loop
  TemplateSelected: null,
  SelectedValue: '',

  // FILTER WIZARD FUNCTIONS ...
  showMessage: function(show) {
    quickFilters.Preferences.setBoolPrefQF("filters.showMessage", show);
  } ,

  /**
  * toggles the filter mode so that dragging emails will
  * open the filter assistant
  *
  * @param {bool} start or stop filter mode
  */
  toggleFilterMode: function(active, silent)
  {
		function removeOldNotification(box, active, id) {
			if (!active && box) {
				let item = box.getNotificationWithValue(id);
				if(item)
					box.removeNotification(item);
			}		
		}
		
    quickFilters.Util.logDebugOptional ("filters", "toggleFilterMode(" + active + ")");
    let notificationId;
		let notifyBox;

		if (!silent) {
			
			switch(quickFilters.Util.Application) {
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
			notifyBox = document.getElementById (notificationId);

			if (active
				&&
				!this.FilterMode
				&&
				quickFilters.Preferences.getBoolPrefQF("filters.showMessage"))
			{
				var title = quickFilters.Util.getBundleString("quickfilters.filters.toggleMessage.title",
						"Creating Filters");
				var theText=quickFilters.Util.getBundleString("quickfilters.filters.toggleMessage.notificationText",
						"Assisted filter mode started. Whenever you move an email into another mail folder a 'Create Filter Rule' assistant will start."
						+ " #1 uses message filters for automatically moving emails based on rules such as 'who is the sender?', 'is a certain keyword in the subject line?'."
						+ " To stop filter assisted mode, press the quickFilters Assistant button again." );
				theText=theText.replace("#1",quickFilters.Util.Application);
				var dontShow = quickFilters.Util.getBundleString("quickfilters.filters.toggleMessage.dontShow",
					"Do not show this message again.");

				if (notifyBox) {
					// button for disabling this notification in the future
					var nbox_buttons = [{
						label: dontShow,
						accessKey: null,
						callback: function() { quickFilters.Worker.showMessage(false); },
						popup: null
					}];

					var item = notifyBox.getNotificationWithValue("quickfilters-filter");
					if (item)
						notifyBox.removeNotification(item);

					notifyBox.appendNotification( theText,
							"quickfilters-filter" ,
							"chrome://quickfilters/skin/filterTemplate.png" ,
							notifyBox.PRIORITY_INFO_HIGH,
							nbox_buttons )  // , eventCallback
				}
				else {
					// fallback for systems that do not support notification (currently: SeaMonkey)
					let prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
																	.getService(Components.interfaces.nsIPromptService);

					let check = {value: false};   // default the checkbox to true
					let result = prompts.alertCheck(null, title, theText, dontShow, check);
					if (check.value === true)
						quickFilters.Worker.showMessage(false);
				}
			}
		}

    quickFilters.Worker.FilterMode = active;
    let doc = quickFilters.Util.getMail3PaneWindow().document;
    // container styling?
		let button = doc.getElementById('quickfilters-toolbar-button');
		if (button) 
			button.checked = active;
    let menuItem = doc.getElementById('quickFilters-wizard');
		if (menuItem) {
			menuItem.checked = active;
			menuItem.label = quickFilters.Util.getBundleString(
													active ? "quickfilters.FilterAssistant.stop" : "quickfilters.FilterAssistant.start",
													active ? "stop filter assistant" : "start filter assistant");
    }
		
		if (!silent)
			removeOldNotification(notifyBox, active, 'quickfilters-filter');

    // If QuickFolders is installed, we should also invoke its filter mode
    if (window.QuickFolders) {
      let QF = window.QuickFolders;
      let worker = QF.FilterWorker ? QF.FilterWorker : QF.Filter;
			// we cannot supress the notification from QuickFolders
			// without adding code in it!
      if (worker.FilterMode != active) // prevent recursion!
        worker.toggleFilterMode(active);  // (active, silent) !!!

			if (!silent)
				removeOldNotification(notifyBox, active, 'quickfolders-filter');
    }
  },
  
  openFilterList: function(isRefresh, sourceFolder) {
    try {
			let mediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
			let w = mediator.getMostRecentWindow('mailnews:filterlist');
	    
	    // [Bug 25203] "Error when adding a filter if Message Filters window is already open"
	    // Thunderbird bug - if the filter list is already open and refresh is true
	    // it throws "desiredWindow.refresh is not a function"
	    if (!w) {
		    let args = { refresh: isRefresh, folder: sourceFolder };
		    MsgFilterList(args);
    	}
    	else {
	    	// we must make sure server and sourceFolder are selected!!
	    	let runFolder = w.document.getElementById('runFiltersFolder');
	    	let serverMenu = w.document.getElementById('serverMenu');
	    	let filterList = w.document.getElementById('filterList');
	    	
    	}
    }
    catch (ex) {
      ;
    }
  } ,

  // folder is the target folder - we might also need the source folder
  createFilter: function(sourceFolder, targetFolder, messageList, isCopy)
  {
	  function warningUpdate() {
			let wrn = quickFilters.Util.getBundleString('quickfilters.createFilter.warning.noHeaderParser',
				'Sorry, but in this version of {1}, we cannot create filters as it does not support extracting addresses from the message header.');
			let suggest = quickFilters.Util.getBundleString('quickfilters.createFilter.warning.suggestUpdate',
				'Consider updating to a newer version to get this feature.');
			let msg = wrn.replace('{1}', quickFilters.Util.Application) + '\n' + suggest;
			quickFilters.Util.popupAlert(msg);
		}

		function getAllTags() {
			let tagService = Components.classes["@mozilla.org/messenger/tagservice;1"]
							.getService(Components.interfaces.nsIMsgTagService);
			return tagService.getAllTags({});
		}
		
		function getTagsFromMsg(tagArray, msg) {
			var tagKeys = {};
			for each (var tagInfo in tagArray)
				if (tagInfo.tag)
					tagKeys[tagInfo.key] = true;

			let tagKeyArray = msg.getStringProperty("keywords").split(" ");
			// attach legacy label to the front if not already there
			let label = msg.label;
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
      var topicFilter = subject;
      var left,right;
      if ( (left=subject.indexOf('[')) < (right=subject.indexOf(']')) ) {
        topicFilter = subject.substr(left, right-left+1);
      }
      else if ( (left=subject.indexOf('{')) < (right=subject.indexOf('}')) ) {
        topicFilter = subject.substr(left, right-left+1);
      }
      return topicFilter;
    }

    function createTerm(filter, attrib, op, val) {
      let searchTerm = filter.createTerm();
      searchTerm.attrib = attrib;
      searchTerm.op = op;
      searchTerm.booleanAnd = false;
      var value = searchTerm.value; // Ci.nsIMsgSearchValue
      value.attrib = searchTerm.attrib;
      value.str = val;
      searchTerm.value = value;
      return searchTerm;
    }

    // do an async repeat if it fails for the first time
    function rerun() {
      quickFilters.Worker.reRunCount++;
      if (quickFilters.Worker.reRunCount > 5) {
				let wrn = "Tried to create a filter " + (quickFilters.Worker.reRunCount+1) + " times, but it didn't work out.\n"
          + "Try to move a different message. Otherwise, updating " + quickFilters.Util.Application + " to a newer version might help";
        quickFilters.Util.popupAlert(wrn);
        quickFilters.Worker.reRunCount=0;
        return 0;
      }
      window.setTimeout(function() {
            let filtered = quickFilters.Worker.createFilter(sourceFolder, targetFolder, messageList, isCopy);
          }, 400);
      return 0;
    }

    if (!messageList || !targetFolder)
      return null;
			
		// new: if no source folder is given, we have to add a step for selecting an inbox / account!

    let Ci = Components.interfaces;
		let targetFilter;
		let filtersList;
		let messageDb;
		let isFromMessageContext = false; // new method from message popup (create filter from msg)
		                                  // this means messageList is an array of messages, not ids 
																			// as in drag+drop case!
    let tagArray;
		let msgKeyArray;
		
		/************* SOURCE FOLDER VALIDATION  ********/
		if (sourceFolder) {
			if (!sourceFolder.server.canHaveFilters) {
				quickFilters.Util.logDebug ("sourceFolder.server cannot have filters!");
				quickFilters.Util.logDebug ("sourceFolder=" + sourceFolder);
				quickFilters.Util.logDebug ("sourceFolder.server=" + sourceFolder.server);
				if (sourceFolder.server) {
					let serverName = sourceFolder.server.name ? sourceFolder.server.name : "unknown";
					quickFilters.Util.logDebug ("sourceFolder.server.name=" + serverName);
					let wrn = quickFilters.Util.getBundleString('quickfilters.createFilter.warning.canNotHaveFilters','The account ({1}) cannot have filters.');
					quickFilters.Util.popupAlert(wrn.replace('{1}', serverName));
				}
				else {
					quickFilters.Util.logDebug ("sourceFolder has no server!");
					quickFilters.Util.logDebug ("sourceFolder=" + sourceFolder);
					quickFilters.Util.logDebug ("sourceFolder.prettyName=" + sourceFolder.prettyName);
					if (sourceFolder.prettyName) {
						let wrn = quickFilters.Util.getBundleString('quickfilters.createFilter.warning.noServer','Folder ({1}) does not have a server.');
						quickFilters.Util.popupAlert(wrn.replace('{1}', sourceFolder.prettyName));
					}
				}
				return false;
			}
			quickFilters.Util.logDebug ("server of sourceFolder " + sourceFolder.prettyName + " can have filters");
			if (!quickFilters.Worker.FilterMode)
				return -2;
		}
		else {
		  // we need an (synchronous?) way of determining the source folder (current inbox?)
			// a dialog with an account dropdown would probably be the best thing.
			let server = targetFolder.server;
			if (!server) return -3;
			let root = server.rootFolder;
			if (!root) return -4;
			
			isFromMessageContext = true;
			// determine the inbox for this target folder
			if (root.hasSubFolders) {
				for each (let folder in fixIterator(root.subFolders, Ci.nsIMsgFolder)) {
				  if (folder.getFlag && folder.getFlag(Ci.nsMsgFolderFlags.Inbox)) {
						sourceFolder = folder;
						break;
					}
				}
			}
			// sourceFolder
			// get inbox from original account key!
			if (messageList[0].accountKey) {
				const accounts = Components.classes["@mozilla.org/messenger/account-manager;1"].
												getService(Ci.nsIMsgAccountManager).accounts;
				for (let i = 0; i < accounts.Count(); i++) {
					let ac = accounts.queryElementAt ?
						accounts.queryElementAt(i, Ci.nsIMsgAccount) :
						accounts.GetElementAt(i).QueryInterface(Ci.nsIMsgAccount);
					if (ac.key == messageList[0].accountKey) {
						// account.incomingServer is an nsIMsgIncomingServer
						// account.identities is an nsISupportsArray of nsIMsgIdentity objects
						// you can loop through it just like acctMgr.accounts above
						// account.defaultIdentity is an nsIMsgIdentity
						// ac.incomingServer instanceof Ci.nsIPop3IncomingServer
						quickFilters.Util.logDebug ("Found account with matching key: " + ac.key);
						if (ac.incomingServer && ac.incomingServer.canHaveFilters) {
							// ac.defaultIdentity
							sourceFolder = ac.incomingServer.rootFolder;
							quickFilters.Util.logDebug ("rootfolder: " + sourceFolder.prettyName);
						}
						else {
							quickFilters.Util.logDebug ("Account - No incoming Server or cannot have filters!");
							let wrn = quickFilters.Util.getBundleString('quickfilters.createFilter.warning.noFilterFallback',
								'Account [{1}] of mail origin cannot have filters!\nUsing current Inbox instead.');
							quickFilters.Util.popupAlert(wrn.replace('{1}', ac.key));
						}
						break;
					}
				}												
			}
			
		}

		/************* MESSAGE PROCESSING  ********/
    try {
			let messageHeader;
      // for the moment, let's only process the first element of the message Id List;
      if (messageList.length) {
				let messageId;
        quickFilters.Util.logDebugOptional ("filters","messageList.length = " + messageList.length);
				if (isFromMessageContext) {
					// new case: from message context menu
					messageHeader = messageList[0];
				}
				else {
					messageId = messageList[0];
					if (!messageId) {
						let wrn = quickFilters.Util.getBundleString('quickfilters.createFilter.warning.noMessageId',
								"Failed to create Filter - could not retrieve message id for the first element of the messages list!\n"
						      + "Consider running the Repair Folder command.");
						quickFilters.Util.popupAlert(wrn);
						return -1;
					}
					messageDb = targetFolder.msgDatabase ? targetFolder.msgDatabase : null;

					if (messageDb) {
						messageHeader = messageDb.getMsgHdrForMessageID(messageId);
					}
					else { // Postbox ??
						// var globalIndex = Cc['@mozilla.org/msg-global-index;1'].getService(QuickFilters_CI.nsIMsgGlobalIndex);
						try {
							// see nsMsgFilleTextIndexer
							messageDb = targetFolder.getMsgDatabase(null); //GetMsgFolderFromUri(currentFolderURI, false)
							messageHeader = messageDb.getMsgHdrForMessageID(messageId);
						}
						catch(e) {
							let wrn = quickFilters.Util.getBundleString('quickfilters.createFilter.warning.noMessageDb', "Cannot access message database for folder {1}");
							quickFilters.Util.popupAlert(wrn.replace('{1}', targetFolder.prettyName) + "\n" + e);
							return null;
						}
					}

					if (!targetFolder.msgDatabase)
						quickFilters.Util.logDebug ("No targetFolder.msgDatabase!");
				}

        if (!messageHeader || !messageHeader.QueryInterface) {
          quickFilters.Util.logDebug ("Cannot get messageHeader for messageId [" + messageId + "]- attempting rerun()...");
          return rerun();
        }
        var msg = messageHeader.QueryInterface(Components.interfaces.nsIMsgDBHdr);
        if (!msg) {
          quickFilters.Util.logDebug ("No msg from messageHeader - attempting rerun()...");
          return rerun();
        }
      }

      if (msg) {
        let key = msg.messageKey;
        quickFilters.Util.logDebugOptional ("filters","got msg; key=" + key);
				
        // some of the fields are not filled, so we need to go to the db to get them
        //var msgHdr = targetFolder.msgDatabase.GetMsgHdrForKey(key); // .QueryInterface(Ci.nsIMsgDBHdr);
        let folderName = targetFolder.prettyName;
        // default filter name = name of target folder
        let filterName = folderName;

        let hdrParser = Components.classes["@mozilla.org/messenger/headerparser;1"].getService(Components.interfaces.nsIMsgHeaderParser);
        if (hdrParser) {
          quickFilters.Util.logDebugOptional ("filters","parsing msg header...");
          if (hdrParser.extractHeaderAddressMailboxes) { // Tb 2 can't ?
            if (quickFilters.Util.Application === 'Postbox') {
              // guessing guessing guessing ...
              // somehow this takes the C++ signature?
              var emailAddress = hdrParser.extractHeaderAddressMailboxes(null, msg.author);
              var ccAddress  =  hdrParser.extractHeaderAddressMailboxes(null, msg.ccList)
              var bccAddress  =  hdrParser.extractHeaderAddressMailboxes(null, msg.bccList)
            }
            else {
              // Tb + SM
              emailAddress = hdrParser.extractHeaderAddressMailboxes(msg.author);
              ccAddress  =  hdrParser.extractHeaderAddressMailboxes(msg.ccList);
              bccAddress  =  hdrParser.extractHeaderAddressMailboxes(msg.bccList);
            }
          }
          else { 
						warningUpdate();
            quickFilters.Util.logDebugOptional ("filters","no header parser :(\nAborting Filter Operation");
            return false;
          }
          quickFilters.Util.logDebugOptional ("filters","message header parsed.");
        }
        else { // exception
					warningUpdate();
          return false;
        }

        quickFilters.Util.logDebugOptional ("filters",
            "createFilter(target folder="+ targetFolder
              + ", message Id=" + msg.messageId
              + ", author=" + msg.mime2DecodedAuthor + "\n"
              + ", subject=" + msg.mime2DecodedSubject + "\n"
              + ", recipients=" + msg.mime2DecodedRecipients + "\n"
              + ", copy=" + isCopy + "\n"
              + ", cc=" + ccAddress ? ccAddress : '' + "\n"
              + ", bcc=" + bccAddress ? bccAddress : '' + "\n"
              + ", folder name=" + folderName
              + ", parsed email address=" + emailAddress);

        let previewText = msg.getStringProperty('preview');
        quickFilters.Util.logDebugOptional ("filters", "previewText="+ previewText );

				/***************  USER INTERFACE  **************/
        if (emailAddress)
        {
          var params = { answer: null, selectedMergedFilterIndex: -1, cmd: 'new' };
					/** we have retrieved the message and got the necessary information that it is a 
					    suitable candidate to create a filter from, now select a template
							=> quickFilters.Assistant.loadAssistant() is called
							**/
          // We have to do prefill filter so we are going to launch the
          // filterEditor dialog and prefill that with the emailAddress.
					
					if (sourceFolder) {
						if (quickFilters.Util.Application === 'Postbox') {
							// mailWindowOverlay.js:1790
							filtersList = sourceFolder.getFilterList(msgWindow);
						}
						else {
							filtersList = sourceFolder.getEditableFilterList(msgWindow);
						}
					}
					// we can clone a new nsIMsgFilterList that has matching target folders.
					let matchingFilters = [];
					for (let f = 0; f < filtersList.filterCount; f++)
					{
					  let aFilter = filtersList.getFilterAt(f);  // nsIMsgFilter 
						// if primary action is movin to folder
						let primaryAction;
						try {
							primaryAction = aFilter.getActionAt(0);
						}
						catch(ex) {
							quickFilters.Util.logDebug("Check for merging - omitting Filter because action cannot be retrieved: " + aFilter.filterName);
							primaryAction = null;
						}
						
						if (primaryAction && primaryAction.type == Components.interfaces.nsMsgFilterAction.MoveToFolder) {
						  if(primaryAction.targetFolderUri == targetFolder.URI) {
							  // make a list of filters with matching actions
								matchingFilters.push(aFilter);
							}
						}
					}
					
					// **************************************************************
					// *******   SYNCHRONOUS PART: Shows Filter Assistant!    *******
					// **************************************************************
          var win = window.openDialog('chrome://quickfilters/content/filterTemplate.xul',
            'quickfilters-filterTemplate',
            'chrome,titlebar,centerscreen,modal,centerscreen,resizable=yes,accept=yes,cancel=yes',
            params,
						matchingFilters).focus(); // pass array of matching filters as additional arg

					// user cancels:
          if (!params.answer) {
						while (matchingFilters.length) matchingFilters.pop();
            return false;
					}
					
					// is there an existing filter selected for merging?
					let mergeFilterIndex = params.selectedMergedFilterIndex;
					let isMerge = false;

					// user has selected a template
          var template = quickFilters.Preferences.getCurrentFilterTemplate();
					
					// helper variables for creating filter terms
          var searchTerm, searchTerm2, searchTerm3;
					
					// create new filter or load existing filter?
					if (mergeFilterIndex>=0) {
						targetFilter = matchingFilters[mergeFilterIndex];
						isMerge = true;
					}
					else {
						targetFilter = filtersList.createFilter(folderName);
					}
					while (matchingFilters.length) matchingFilters.pop();
					
					// TEMPLATES: filters
          switch (template) {
            // 1st Filter Template: Conversation based on a Person (email from ..., replies to ...)
            case 'to':
              emailAddress = msg.mime2DecodedRecipients;
              // fallthrough is intended!
            case 'from': // was 'person' but that was badly labelled, so we are going to retire this string
              // sender ...
              searchTerm = createTerm(targetFilter, Components.interfaces.nsMsgSearchAttrib.Sender, Components.interfaces.nsMsgSearchOp.Contains, emailAddress);

              // ... recipient, to get whole conversation based on him / her
              // ... we exclude "reply all", just in case; hence Is not Contains
              searchTerm2 = createTerm(targetFilter, Components.interfaces.nsMsgSearchAttrib.To, Components.interfaces.nsMsgSearchOp.Contains, emailAddress);
              targetFilter.appendTerm(searchTerm);
              targetFilter.appendTerm(searchTerm2);

              if (quickFilters.Preferences.getBoolPrefQF("naming.keyWord"))
                filterName += " - " + emailAddress;
              break;

            // 2nd Filter Template: Conversation based on a Mailing list (email to fooList@bar.org )
            case 'list':
              //// TO
              //createTerm(filter, attrib, op, val)
              searchTerm = createTerm(targetFilter, Components.interfaces.nsMsgSearchAttrib.Sender, Components.interfaces.nsMsgSearchOp.Contains, emailAddress);
              targetFilter.appendTerm(searchTerm);

              //// CC
              if (msg.ccList) {
                let ccArray = ccAddress.split(",");
                for (let counter=0; counter<ccArray.length; counter++) {
                  searchTerm2 = createTerm(targetFilter, Components.interfaces.nsMsgSearchAttrib.CC, Components.interfaces.nsMsgSearchOp.Contains, ccArray[counter]);
                  targetFilter.appendTerm(searchTerm2);
                }
              }
              if (quickFilters.Preferences.getBoolPrefQF("naming.keyWord"))
                filterName += " - " + emailAddress;

              break;

            // 3nd Filter Template: Conversation based on a Subject  (starts with [blabla])
            case 'topic':
              //// TO DO ... improve parsing of subject keywords
              //createTerm(filter, attrib, op, val)
              //searchTerm = createTerm(targetFilter, Ci.nsMsgSearchAttrib.Subject, Ci.nsMsgSearchOp.Contains, emailAddress);
              searchTerm = targetFilter.createTerm();
              searchTerm.attrib = Components.interfaces.nsMsgSearchAttrib.Subject;
              searchTerm.op = Components.interfaces.nsMsgSearchOp.Contains;
              var topicFilter = getMailKeyword(msg.mime2DecodedSubject);
              searchTerm.value = {
                attrib: searchTerm.attrib,
                str: topicFilter
              };
              targetFilter.appendTerm(searchTerm);
              if (quickFilters.Preferences.getBoolPrefQF("naming.keyWord"))
                filterName += " - " + topicFilter;
              break;

            // 4th Filter Template: Based on a Tag
            case 'tag':
              // get the list of known tags
              tagArray = getAllTags();
              // extract the tag keys from the msgHdr
              msgKeyArray = getTagsFromMsg(tagArray, msg);

              // -- Now try to match the search term
              //createTerm(filter, attrib, op, val)
              for (let i = msgKeyArray.length - 1; i >= 0; --i) {
                searchTerm = createTerm(targetFilter, Components.interfaces.nsMsgSearchAttrib.Keywords, Components.interfaces.nsMsgSearchOp.Contains, msgKeyArray[i]);
                targetFilter.appendTerm(searchTerm);
                if (quickFilters.Preferences.getBoolPrefQF("naming.keyWord")) {
									for each (var tagInfo in tagArray)
										if (tagInfo.key === msgKeyArray[i])
											filterName += tagInfo.tag + ' ';
                }
              }

              break;
            default: // shouldn't happen => no l10n
              quickFilters.Util.popupAlert('invalid template: ' + template);
              return false;
          }

					// ACTIONS: target folder, add tags
          if (quickFilters.Preferences.getBoolPrefQF("naming.parentFolder")) {
            if (targetFolder.parent)
              filterName = targetFolder.parent.prettyName + " - " + filterName;
          }
					if (!isMerge) {
						targetFilter.filterName = filterName;
						let moveAction = targetFilter.createAction();
						moveAction.type = Components.interfaces.nsMsgFilterAction.MoveToFolder;
						moveAction.targetFolderUri = targetFolder.URI;
						targetFilter.appendAction(moveAction);
					}
					
					// this is set by the 'Tags' checkbox
					if (quickFilters.Preferences.getBoolPrefQF('actions.tags'))
					{
					  // the following step might already be done (see 'tag' template case):
						if (!tagArray) {
							tagArray = getAllTags();
							msgKeyArray = getTagsFromMsg(tagArray, msg);
						}
						if (msgKeyArray.length) {
							for (let i = msgKeyArray.length - 1; i >= 0; --i) {
							  let tagAction = targetFilter.createAction();
								tagAction.type = Components.interfaces.nsMsgFilterAction.AddTag;
								for each (var tagInfo in tagArray)
									if (tagInfo.key === msgKeyArray[i]) {
										tagAction.strValue = tagInfo.key;
									  break;
									}
								// only add if it could be matched.
								if (tagAction.strValue) {
									targetFilter.appendAction(tagAction);
									quickFilters.Util.logDebug("Added new Action: " + tagAction);
								}
							}
						}
					}
					
					// 'Priority' checkbox - copies priority
					if (quickFilters.Preferences.getBoolPrefQF('actions.priority') && msg.priority > 1)
					{
						let priorityAction = targetFilter.createAction();
						priorityAction.type = Components.interfaces.nsMsgFilterAction.ChangePriority;
						priorityAction.priority = msg.priority;  // nsMsgPriorityValue - 0 = not set! - 1= none
						targetFilter.appendAction(priorityAction);
					}
					
					// 'Star' checkbox - note this will only set the star (not reset!)
					if (quickFilters.Preferences.isStarAction && msg.isFlagged)
					{
						let starAction = targetFilter.createAction();
						starAction.type = Components.interfaces.nsMsgFilterAction.MarkFlagged;
						targetFilter.appendAction(starAction);
					}				

					if (!isMerge) {
						// Add to the end
						quickFilters.Util.logDebug("Adding new Filter '" + targetFilter.filterName + "' "
								 + "for email " + emailAddress
								 + ": current list has: " + filtersList.filterCount + " items");
						filtersList.insertFilterAt(0, targetFilter);
					}

          let args = { filter:targetFilter, filterList: filtersList};
          //args.filterName = targetFilter.filterName;
          // check http://mxr.mozilla.org/comm-central/source/mailnews/base/search/content/FilterEditor.js
          // => filterEditor OnLoad()
          window.openDialog("chrome://messenger/content/FilterEditor.xul", "",
                            "chrome, modal, resizable,centerscreen,dialog=yes", args);

          // If the user hits ok in the filterEditor dialog we set args.refresh=true
          // there we check this here in args to show filterList dialog.
          if ("refresh" in args && args.refresh)
          {
            quickFilters.Worker.openFilterList(true, sourceFolder);
            
            // stop filter mode after creating first successful filter.
            if (quickFilters.Preferences.isAbortAfterCreateFilter()) {
              quickFilters.Worker.toggleFilterMode(false);
            }
          } //else, let's remove the filter (Cancel case)
          else {
						if (!isMerge) {
							filtersList.removeFilterAt(0);
						}
          }
        }
        else  // just launch filterList dialog
        {
	        quickFilters.Worker.openFilterList(false, sourceFolder);
        }
      }
      else {
        quickFilters.Util.logDebugOptional ("filters","no message found to set up filter");
      }

      return 1;
    }
    catch(e) {
      alert("Exception in quickFilters.Worker.createFilter: " + e.message);
      return -1;
    }
    return null;

  } ,

  createFilterAsync: function(sourceFolder, targetFolder, messageList, isCopy, isSlow)
  {
    let delay = isSlow ? 1200 : 300; // wait for the filter dialog to be updated with the new folder if drag to new
    window.setTimeout(function() {
      let filtered = quickFilters.Worker.createFilter(sourceFolder, targetFolder, messageList, isCopy);
    }, delay);

  }

};

quickFilters.Assistant = {
  selectedMergedFilterIndex: -1,
	currentCmd: null,
	MERGEPAGE : 0,
	TEMPLATEPAGE : 1,
	
  selectTemplate : function(element) {
    if (!element) {
      element = this.getTemplateListElement();
    }
    quickFilters.Worker.SelectedValue = element.selectedItem.value;
    quickFilters.Preferences.setCurrentFilterTemplate(element.selectedItem.value);
  } ,

  next : function()
  {
		let sI = parseInt(this.CurrentDeck.selectedIndex);
		let isMerge = false;
    if (sI == this.MERGEPAGE) {	
			isMerge = document.getElementById('chkMerge').checked;
			this.selectedMergedFilterIndex = (isMerge) ? this.MatchedFilters.selectedIndex : -1;
		}
	
		let params = window.arguments[0];
		if (this.currentCmd == 'mergeList') {
			params.answer  = true;
			params.selectedMergedFilterIndex = this.selectedMergedFilterIndex;
			setTimeout(function() {window.close()});
			return;
		}
		
		switch(sI) {
			case this.MERGEPAGE:  // existing filters were found, lets store selected filter index or -1!
				this.toggleMatchPane(false);
				this.NextButton.label = isMerge ? "Edit Filter..." : "Create Filter...";
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

	get NextButton()
	{
		return document.documentElement.getButton('extra1');
	} ,
	
	get MatchedFilters()
	{
	  return document.getElementById('filterMatches');
	} ,
	
	get CurrentDeck()
	{
	  return document.getElementById('assistantDeck');
	} ,

  cancelTemplate : function()
  {
    quickFilters.Worker.TemplateSelected = false;
    var params = window.arguments[0];
    params.answer  = false;
		params.selectedMergedFilterIndex = -1;
    return true;
  } ,

  getTemplateListElement: function()
  {
    return document.getElementById('qf-filter-templates');
  } ,
	
	toggleMatchPane: function(toggle)
	{
		this.CurrentDeck.selectedIndex = toggle ? this.MERGEPAGE : this.TEMPLATEPAGE;
	} ,

	selectMatchFromList: function(list) {
	  let isMerge = document.getElementById('chkMerge');
		isMerge.checked = (list.selectedCount>0) ? true : false;
	  let chkCreateNew = document.getElementById('chkCreateNew');
		chkCreateNew.checked = !isMerge.checked;
	} ,
	
	selectMatch: function(list) {
	  let isMerge = document.getElementById('chkMerge');
		isMerge.checked = (list.selectedCount>0) ? true : false;
	} ,
	
	selectMerge: function(isMerge) {
		this.MatchedFilters.selectedIndex = (isMerge.checked ? 0 : -1);
	  let chkNew = document.getElementById('chkCreateNew');
		chkNew.checked = !isMerge.checked;
	} ,
	
	selectCreateNew: function(isNew) {
		this.MatchedFilters.selectedIndex = (isNew.checked ? -1 : 0);
	  let chkMerge = document.getElementById('chkMerge');
		chkMerge.checked = !isNew.checked;
	},
	
  loadAssistant : function()
  {
	  // [Bug	25199] - Add Rules to existing filters 
		/* 1. find out the correct account (server) */
		/* 2. enumerate all filters of server and find the ones that have same target folder */
		/* 3. if any matching filters are found, list them on a separate page, and give an option to merge or ignore them
	  /* 4. If user ignores merge process (or list of matches is empty), move on to template selection box */
    // initialize list and preselect last chosen item!
		this.NextButton.setAttribute("class", "extra1"); // add some style
		
		let matchingFilters = window.arguments[1];
		// list matching filters
		if (matchingFilters.length > 0) {
			this.toggleMatchPane(true);
			let matchList = this.MatchedFilters;
			for (let i=0; i<matchingFilters.length; i++) {
			  let itemLabel = matchingFilters[i].filterName;
				if (!matchingFilters[i].enabled)
					itemLabel += ' (disabled)';
				matchList.appendItem(itemLabel, i);
			}
			var params = window.arguments[0];
			this.currentCmd = params.cmd;
			
			switch(params.cmd) {
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
		
    var element = this.getTemplateListElement();
    element.value = quickFilters.Preferences.getCurrentFilterTemplate();
    window.sizeToContent();
		// hide flag / star checkbox depending on application
		let hideCheckbox;
		switch(quickFilters.Util.Application) {
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
  } ,

  getBundleString  : function(id) {
    //var bundle = document.getElementById("bundle_filter");
    try {
      if(!this.bundle)
        this.bundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
				                        .getService(Components.interfaces.nsIStringBundleService)
																.createBundle("chrome://quickfilters/locale/filters.properties");
      return this.bundle.GetStringFromName(id);
    }
    catch(e) {
      quickFilters.Util.logException("Could not retrieve bundle string: " + id + "\n", e);
    }
    return '';
  },

  selectTemplateFromList: function(element) {
    if (!element) {
      element = this.getTemplateListElement();
    }
    let descriptionId = "qf.filters.template." + element.selectedItem.value + ".description";
    let desc = document.getElementById ("templateDescription");
    if (desc) {
      desc.textContent = this.getBundleString(descriptionId);
    }
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
};