
// OLD SHIM CODE 
//   this is to make quickFIlters backwards compatible with Postbox 3,4,5
//   which hasn't got the new code of ECMA 1.7

if (!quickFilters.Util.Accounts) {
	Object.defineProperty(quickFilters.Util, "Accounts",
	{ get: function() {
			Components.utils.import("resource:///modules/iteratorUtils.jsm");  
			const Ci = Components.interfaces,
							Cc = Components.classes,
							util = quickFilters.Util;
				let aAccounts=[];
			if (util.Application == 'Postbox') 
				aAccounts = util.getAccountsPostbox(); 
			else {
				// throw("Old ECMA module! We can use for..in in modern platforms!");
				// [Bug 26486] Support Thunderbird 38.* 
				let accounts = Cc["@mozilla.org/messenger/account-manager;1"]
										 .getService(Ci.nsIMsgAccountManager).accounts;
				aAccounts = [];
				if (typeof fixIterator == "undefined") // Postbox fix
					Components.utils.import("resource:///modules/iteratorUtils.jsm");
				
				for (let ac in fixIterator(accounts, Ci.nsIMsgAccount)) {
					aAccounts.push(ac);
				};
			}
			return aAccounts;
		}
	});
}

if (!quickFilters.Shim) {
	quickFilters.Shim = {
		validateFilterTargets: function validateFilterTargets(sourceURI, targetURI) {
			
			const util = quickFilters.Util,
			      Ci = Components.interfaces;
						
			if (typeof fixIterator == "undefined") // Postbox fix
				Components.utils.import("resource:///modules/iteratorUtils.jsm");
						
			// fix any filters that might still point to the moved folder.
			// 1. nsIMsgAccountManager  loop through list of servers
			try {
				let acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
														.getService(Ci.nsIMsgAccountManager);
				for (let account in fixIterator(acctMgr.accounts, Ci.nsIMsgAccount)) {
					if (account.incomingServer && account.incomingServer.canHaveFilters )
					{
						let ac = account.incomingServer.QueryInterface(Ci.nsIMsgIncomingServer);
						util.logDebugOptional("filters", "checking account for filter changes: " +  ac.prettyName);
						// 2. getFilterList
						let filterList = ac.getFilterList(gFilterListMsgWindow).QueryInterface(Ci.nsIMsgFilterList);
						// 3. use  nsIMsgFilterList.matchOrChangeFilterTarget(oldUri, newUri, false)
						if (filterList) {
							filterList.matchOrChangeFilterTarget(sourceURI, targetURI, false)
						}
					}
				}
			}
			catch(ex) {
				util.logException("Exception in quickFilters.List.validateFilterTargets ", ex);
			}
		}	,
		
		findFromTargetFolder: function findFromTargetFolder(targetFolder, searchFilterResults) {
			const Util = quickFilters.Util,
						prefs = quickFilters.Preferences,
						Ci = Components.interfaces,
						FA = Ci.nsMsgFilterAction;
							
			try {
				let acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
														.getService(Ci.nsIMsgAccountManager);
				
				// 1. create a list of matched filters and corresponding accounts 
				//    (these will be linked via index
				if (typeof fixIterator == "undefined") // Postbox fix
					Components.utils.import("resource:///modules/iteratorUtils.jsm");
				
				if (prefs.isDebugOption('filterSearch.detail')) debugger;
					
				for (let account in fixIterator(acctMgr.accounts, Ci.nsIMsgAccount)) {
					if (account.incomingServer && account.incomingServer.canHaveFilters ) {
						let msg ='',
								ac = account.incomingServer.QueryInterface(Ci.nsIMsgIncomingServer),
								// 2. getFilterList
								filtersList = ac.getFilterList(gFilterListMsgWindow).QueryInterface(Ci.nsIMsgFilterList),
								found=false;
						if (filtersList) {
							// build a dictionary of terms; this might take some time!
							let numFilters = filtersList.filterCount;
							Util.logDebugOptional("filterSearch", "checking account [" + ac.prettyName + "] "
																		 + "for target folder: " +  targetFolder.URI + '\n'
																		 + "iterating " + numFilters + " filters...");
							for (let idx = 0; idx < numFilters; idx++) {
								let curFilter = filtersList.getFilterAt(idx),
								// Match Target Folder by iterating all actions
										actionList = curFilter.actionList ? curFilter.actionList : curFilter.sortedActionList,
										acLength = actionList.Count ? actionList.Count() : actionList.length;
								for (let index = 0; index < acLength; index++) {
									let qryAt = actionList.queryElementAt ? actionList.queryElementAt : actionList.QueryElementAt,
											action = qryAt(index, Ci.nsIMsgRuleAction);
									if (action.type == FA.MoveToFolder || action.type == FA.CopyToFolder) {
										if (action.targetFolderUri)
											msg += "[" + index + "] Current Filter URI:" +  action.targetFolderUri + "\n";
										if (action.targetFolderUri && action.targetFolderUri === targetFolder.URI) { 
											Util.logDebugOptional("filterSearch", "FOUND FILTER MATCH:\n" + curFilter.filterName);
											searchFilterResults.push (
												{
													Filter: curFilter,
													Account: ac,
													Action: action
												}
											); // create a new object which contains this trinity
											break; // only add one action per filter (in case it is duplicated)
										}
									}        
								}
								// .. End Match Action Loop
							}       
						}
						if (!found) // show detailed filters list if no match was found
							Util.logDebugOptional("filterSearch.detail", msg);
					}
				}
				Util.logDebugOptional("filterSearch", "Matches found: " + searchFilterResults.length);
				
				// 2. Persist in dropdown
				// dropdown with terms
				let filtersDropDown = document.getElementById('quickFiltersFoundResults');
				filtersDropDown.selectedIndex = -1;
				let menuPopup = quickFilters.List.clearFoundFiltersPopup(true);
				
				for (let idx = 0; idx < searchFilterResults.length; idx++) {
					let target = searchFilterResults[idx],
							menuItem = document.createElement("menuitem"),
							dec = decodeURI(target.Action.targetFolderUri),
							valueLabel = quickFilters.List.truncateLabel(dec, 30),
							filterIdLabel = target.Filter.filterName;
					if (target.Account.prettyName) {
						filterIdLabel = '[' + target.Account.prettyName + '] ' +  filterIdLabel;
					}
					// let theLabel = filterIdLabel + ' = ' + this.getActionLabel(target.Action.type) + ': ' + valueLabel;
					menuItem.setAttribute("label", filterIdLabel);
					menuItem.targetFilter = target.Filter; 
					menuItem.targetAccount = target.Account; 
					menuItem.setAttribute("actionType", target.Action.type); 
					menuItem.setAttribute("targetFolderUri", target.Action.targetFolderUri);        
					menuPopup.appendChild(menuItem);
				}
				if (searchFilterResults.length) {
					filtersDropDown.collapsed = false;
					// hide duplicates button?
					document.getElementById('quickFiltersBtnDupe').collapsed = true;
					document.getElementById('quickFiltersBtnCancelDuplicates').collapsed = true;
					// show cancel button
					document.getElementById('quickFiltersBtnCancelFound').collapsed = false;
					filtersDropDown.selectedIndex = 0;
				}
				
			}
			catch(ex) {
				Util.logException("Exception in quickFilters.List.findFromTargetFolder ", ex);
			}  
		} ,
		
		getIdentityMailAddresses: function getIdentityMailAddresses(MailAddresses) {
			const Util = quickFilters.Util,
						Ci = Components.interfaces,
						acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
													.getService(Ci.nsIMsgAccountManager);
													
			if (typeof fixIterator == "undefined") // Postbox fix
				Components.utils.import("resource:///modules/iteratorUtils.jsm");
				
			for (let account in fixIterator(acctMgr.accounts, Components.interfaces.nsIMsgAccount)) {
				try {
					let idMail = '';
					if (account.defaultIdentity) {
						idMail = account.defaultIdentity.email;
					}
					else if (account.identities.length) {
						idMail = account.identities[0].email; // outgoing identities
					}
					else {
						Util.logDebug('getIdentityMailAddresses() found account without identities: ' + account.key);
					}
					if (idMail) {
						idMail = idMail.toLowerCase();
						if (idMail && MailAddresses.indexOf(idMail)==-1) 
							MailAddresses.push(idMail);
					}
				}
				catch(ex) {
					Util.logException ('getIdentityMailAddresses()', ex);
				}
			}
		} ,
		
		cloneHeaders: function cloneHeaders(msgHdr, messageClone, dbg, appendProperty) {
			// for (let [propertyName, prop] in Object.entries(msgHdr)) { // Object.entries is not supported in old JavaScript versions.
			Object.keys(msgHdr).forEach(
			  function(propertyName, index) {
					// propertyName is what you want
					// you can get the value like this: myObject[propertyName]
					try {
						let hasOwn = msgHdr.hasOwnProperty(propertyName),
								isCopied = false;  // replace msgHdr[propertyName] with prop
						if (hasOwn) {
							let prop = msgHdr[propertyName];
							if (typeof prop != "function" && typeof prop != "object") {
								messageClone[propertyName] = prop; // copy to the clone!
								if (messageClone[propertyName])  // make sure we have some data! (e.g. author, subject, recipient, date, charset, messageId)
									dbg.countInit ++;
								isCopied = true;
							}
						}
						if (isCopied) {
							dbg.test = appendProperty(dbg.test, msgHdr, propertyName);
						}
						else {
							dbg.test2 = appendProperty(dbg.test2, msgHdr, propertyName);
						}
					}
					catch(ex) { ; }
				});
			// } 
		} ,
		
		findInboxFromRoot: function findInboxFromRoot(root, fflags) {
			const Ci = Components.interfaces,
			      util = quickFilters.Util;
			if (typeof fixIterator == "undefined") // Postbox fix
				Components.utils.import("resource:///modules/iteratorUtils.jsm");
				
			for (let folder in fixIterator(root.subFolders, Ci.nsIMsgFolder)) {
				if (folder.getFlag && folder.getFlag(fflags.Inbox)) {
					util.logDebugOptional('createFilter', "sourceFolder: determined Inbox " + folder.prettyName);
					return folder;
				}
			}
			return null;
		} ,
			
		dummy: ', <== end Shim properties here'
	} // end of Shim definition
};