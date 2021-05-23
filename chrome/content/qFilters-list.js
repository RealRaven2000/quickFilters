"use strict";

/* 
BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK 
*/

// note: in QuickFolder_s, this object is simply called "Filter"!
quickFilters.List = {
  eventsAreHooked: false ,
	clipboardList: [] , // a 'fake' clipboard for copying / pasting filters across accounts.
	clipboardServer: null,
	clipboardPending: '',
  rebuildFilterList_Orig: null,
  duplicateTerms: null,
  duplicateActions: null,
  updateButtons: function updateButtons() {
    let numFiltersSelected = this.getSelectedCount(this.FilterListElement),
        oneFilterSelected = (numFiltersSelected == 1);
    try {
      document.getElementById("quickFiltersBtnClone").disabled = !oneFilterSelected;
      document.getElementById("quickFiltersBtnMerge").disabled = (numFiltersSelected<2);
      document.getElementById("quickFiltersBtnSort").disabled = (numFiltersSelected<2);
      document.getElementById("quickFiltersBtnCut").disabled = (numFiltersSelected==0);
      document.getElementById("quickFiltersBtnCopy").disabled = (numFiltersSelected==0);
    }
    catch(ex) {
      quickFilters.Util.logException('quickFilters.List.updateButtons: ', ex);
    }
		let runInFolderName = "N/A";
		if (quickFilters.List.RunFolder)
			runInFolderName = quickFilters.List.RunFolder.prettyName;
		quickFilters.Util.logDebugOptional('filterList','quickFilters.List.updateButtons()\n'
		  + '# Filters selected: ' + numFiltersSelected + '\n'
			+ 'Folder to Run in: ' + runInFolderName
			);
  },
  
  // FILTER LIST DIALOG FUNCTIONS - replaces gFilterListbox
  get FilterListElement() {
    let el = document.getElementById("filterList");
    if (!el)
      el = document.getElementById("filterTree");
    return el;
  } ,
  
  // helper Property for SeaMonkey/Postbox (which doesn't have a gCurrentFilterList)
  get FilterList() {
    try {
      if (typeof gCurrentFilterList !== "undefined")
        return gCurrentFilterList;
    }
    catch(ex) {
      quickFilters.Util.logException('quickFilters.List.FilterList: ', ex);
    }
    return null;
  } ,

  // SeaMonkey / Postbox helper
  get gFilterTreeView() {
    if (typeof gFilterTreeView !== "undefined")
      return gFilterTreeView; // SM
    return gFilterTree.view; //Postbox
  } ,
	
  get ServerMenu() {
    return document.getElementById("serverMenu");
  } ,
  
  get ServerMenuPopup() {
    return document.getElementById("serverMenuPopup");
  } ,

  getSelectedFilterAt: function getSelectedFilterAt(list, i) {
    if (typeof list.selectedItems !== "undefined")
      return list.selectedItems[i]._filter;  // Thunderbird

    // SeaMonkey uses a tree view - there can be multiple ranges selected
    let start = new Object(),
        end = new Object(),
        numRanges = list.view.selection.getRangeCount(),
        current = 0, // counting index to find nth item
        targetIndex = -1;

    // allow multiple range selection - find the nth item and return its real index
    for (let t = 0; t < numRanges; t++) {
      list.view.selection.getRangeAt(t,start,end);
      for (let v = start.value; v <= end.value; v++){
        if (i == current) {
          targetIndex = v;
          break;
        }
        current++;
      }
      if (targetIndex>=0)
        break;
    }

    // return list.view.getFilterAt(start.value);
    if (targetIndex==-1) return null;
    return getFilter(targetIndex); // defined in FilterListDialog.js (SM only)
  } ,

  getSelectedCount: function getSelectedCount(list) {
    if (typeof list.selectedItems !== "undefined")
      return list.selectedItems.length;
    return list.view.selection.count;
  } ,
  
  // Postbox: doesn't have selectedIndex; instead we use view.selection.currentIndex
  getSelectedIndex: function getSelectedIndex(list) {
    return list.selectedIndex;
  } ,
	
	clone: function clone(evt) {
    let filtersList = this.FilterList,
        sourceFolder = filtersList.folder,
        list = this.FilterListElement;
		const util = quickFilters.Util,
				  prefs = quickFilters.Preferences;

    if (this.getSelectedCount(list) != 1) {
			let wrn = util.getBundleString('quickfilters.clone.selectOne', 
                                   'To clone, select exactly one filter.');
      util.popupAlert(wrn);
      return;
    } 
	
		let selectedFilter = this.getSelectedFilterAt(list, 0);
		if (!selectedFilter) {
      let wrn = util.getBundleString('quickfilters.clone.undetermined', 
                                   'Could not determine which filter is selected');
			util.popupAlert(wrn);
			return;
		}
		// get user specific clone label
		let clonedLabel = prefs.getCharPref('naming.clonedLabel'),
		    newName = selectedFilter.filterName + ' '
		if (clonedLabel.trim()) {
		  newName += clonedLabel;
		}
		else {
		 // get default localized clone label
			newName += util.getBundleString('quickfilters.clone.label', '(copy)');		
		}
		
		try {
			// 1. create new filter
			let newFilter = filtersList.createFilter(newName);
			
			// 2. iterate all actions & clone them
			util.copyActions(selectedFilter, newFilter);
			
			// 3. iterate all conditions & clone them
			util.copyTerms(selectedFilter, newFilter, true);
			// determine the index of insertion point (at the filter selected in the assistant)
			let idx;
			for (idx = 0; idx < filtersList.filterCount; idx++) {
				if (selectedFilter == filtersList.getFilterAt(idx))
					break;
			}	

			// 4. open the editor
			let args = { filter:newFilter, filterList: filtersList};
			// check http://mxr.mozilla.org/comm-central/source/mailnews/base/search/content/FilterEditor.js
			window.openDialog("chrome://messenger/content/FilterEditor.xhtml", "",
												"chrome, modal, resizable,centerscreen,dialog=yes", args);
												
			if ("refresh" in args && args.refresh) {
				quickFilters.Worker.openFilterList(true, sourceFolder);
				// 5. insert the merged filter
				util.logDebug("Adding new Filter '" + newFilter.filterName + "' "
						 + ": current list has: " + filtersList.filterCount + " items");
				newFilter.enabled = true;
				filtersList.insertFilterAt(idx, newFilter);
				this.rebuildFilterList();
			}
		}
		catch(ex) {
		  util.logException('clone() - failed creating filter ' + newName, ex);
		}
	} ,
  
  refreshDuplicates: function refreshDuplicates(calledFromEditor) {
		const util = quickFilters.Util;
		
    let doc;
    util.logDebug("refreshDuplicates(" + calledFromEditor + ") ...");
    if (calledFromEditor) {
      let w = util.getLastFilterListWindow();
      if (!w) {
        util.logDebug("No Filter List window open?");
        return;
      }
      doc = w.document;
    }
    else
      doc = document;
    // [Bug 25748] Automatic Refresh of Duplicate List
    let termDropDown = doc.getElementById('quickFiltersDuplicateList')
    util.logDebug("Duplicates dropdown: " + termDropDown);
    if (!termDropDown.collapsed) {
      this.findDuplicates();  // re-populate duplicates list
    }
  } ,
  
  sort: function sort(evt) {
		const util = quickFilters.Util;
    let filtersList = this.FilterList, // Tb / SM
        sourceFolder = filtersList.folder,
        list = this.FilterListElement,
        count = this.getSelectedCount(list);
    if (count < 2) {
			let wrn = util.getBundleString('quickfilters.sort.warning.selectMultiple', 
                                              'To sort, select at least 2 filters');
      util.popupAlert(wrn);
      return;
    } 
    if (this.pushSelectedToClipboard('sort')) {
      util.popupProFeature("sortFilters", true);
			this.clipboardPending='sort';
      this.pasteFilters(true);
		}

  } ,
    
  merge: function merge(evt, isEvokedFromButton) {
		const prefs = quickFilters.Preferences,
		      util = quickFilters.Util,
					Ci = Components.interfaces;
    let params = { answer: null, selectedMergedFilterIndex: -1, cmd: 'mergeList' },
        filtersList = this.FilterList, // Tb / SM
        sourceFolder = filtersList.folder,
        list = this.FilterListElement,
        count = this.getSelectedCount(list);
    util.logDebugOptional("merge", "filter.merge\n"
      + count + " filters selected.\n"
      + "evoked from button:" + isEvokedFromButton);
    if (count < 2) {
			let wrn = util.getBundleString('quickfilters.merge.warning.selectMultiple', 
                                              'To merge, select at least 2 filters');
      util.popupAlert(wrn);
      return;
    } 
    // see qFilters-worker line 471
    // we can clone a new nsIMsgFilterList that has matching target folders.
    let matchingFilters = [],
        action = 0,
        deselectUnmatched = false,
        filterMatch,
		    firstSelectedFilter = this.getSelectedFilterAt(list, 0);
		if (!firstSelectedFilter) {
			let wrn = util.getBundleString('quickfilters.merge.warning.selectMultiple2',
				          'Cannot determine first selected filter - to merge, you must select at least 2 filters!');
			util.popupAlert(wrn);
			return;
		}
    let primaryAction,
        primaryName = firstSelectedFilter.filterName;
		try {
			primaryAction = firstSelectedFilter.getActionAt(0);
		}
		catch(ex) {
			let wrn = util.getBundleString('quickfilters.merge.warning.missingAction',
				          'Could not get the main action of the filter: {1}');
		  wrn.replace ('{1}', primaryName);
			util.popupAlert(wrn + '\n' + ex.toString());
		}
    action = primaryAction;
    let FA = Ci.nsMsgFilterAction,
		    failedFilters = '';
    for (let f = this.getSelectedCount(list)-1; f >=0 ; f--) {
      filterMatch = true;
      let aFilter = this.getSelectedFilterAt(list, f);  // nsIMsgFilter 
      util.logDebugOptional("merge", "Adding filter: " + aFilter.filterName);
      // match the first action only
      // nsMsgFilterAction.MarkFlagged
      // nsMsgFilterAction.MoveToFolder
      // nsMsgFilterAction.CopyToFolder
      // nsMsgFilterAction.AddTag
      // nsMsgFilterAction.ChangePriority
			try {
				action = aFilter.getActionAt(0);
        util.logDebugOptional("merge", "First filter action type: " + action.type);
			}
			catch(ex)  {
				failedFilters = failedFilters + ', ' + aFilter.filterName;
        util.logDebugOptional("merge", "failed to get type, omitting filter.");
				filterMatch = false;
			}
      if (filterMatch && primaryAction && primaryAction.type != action.type) {
        filterMatch = false;
        util.logDebugOptional("merge", "no match, as primary action type is " + primaryAction.type);
      }
      else {
        // here, we need to create a switch statement, to accommodate different action types
        switch(primaryAction.type) {
          case FA.MoveToFolder: case FA.CopyToFolder:
            if (primaryAction.targetFolderUri != action.targetFolderUri) {
              util.logDebugOptional("merge", "no match, as target folder uri is " + action.targetFolderUri);
              filterMatch = false;
            }
            break;
          case FA.AddTag:
            if (primaryAction.strValue !=  action.strValue) {
              util.logDebugOptional("merge", "no match, as strValue is " + action.strValue);
              filterMatch = false;
            }
            break;
          case FA.MarkFlagged:
            util.logDebugOptional("merge", "MarkFlagged - no change in match");
            break;
          case FA.ChangePriority:
            if (primaryAction.priority !=  action.priority) {
              util.logDebugOptional("merge", "no match, as priority is " + action.priority);
              filterMatch = false;
            }
            break;
        }
      }
      if (!filterMatch && !deselectUnmatched) {
        let question = util.getBundleString('quickfilters.merge.warning.selectMismatch',
                                            'Cannot merge all selected filters: action mismatch with filter {1}!')
                      + '\n'
                      + util.getBundleString('quickfilters.merge.warning.selectMismatchContinue',
                                             'Deselect filters that do not match and continue?');
        question = question.replace('{1}', '\'' + primaryName + '\'' );          
        if (confirm(question)) {
          deselectUnmatched = true;
        }
        else {
          return; // Early Exit
        }
      }
      if (filterMatch) {
        util.logDebugOptional("merge", "filter match: pushing to list {" + aFilter.filterName + "}");
        matchingFilters.push(aFilter);  
      }
      else {
        util.logDebugOptional("merge", "not matching - removed from selection: " + aFilter.filterName);
        // remove any filter that does not match from selection!
        if (list.removeItemFromSelection)
          list.removeItemFromSelection(aFilter); // Thunderbird
        else
          list.view.selection.clearRange(f,f); // SeaMonkey
        // OR list.removeItemAt(f);
      }
    }
    
    // **************************************************************
    // *******   SYNCHRONOUS PART: Shows Filter Assistant!    *******
    // **************************************************************
    util.logDebugOptional("merge", "OPENING MODAL DIALOG\n==========================");
    let win = window.openDialog('chrome://quickfilters/content/filterTemplate.xhtml',
      'quickfilters-filterTemplate',
      'chrome,titlebar,centerscreen,modal,centerscreen,resizable=yes,accept=yes,cancel=yes',
      params,
      matchingFilters).focus(); // pass array of matching filters as additional arg
    // user cancels:
    if (!params.answer) {
      while (matchingFilters.length) matchingFilters.pop();
      return;
    }
    
    // is there an existing filter selected for merging?
    let mergeFilterIndex = params.selectedMergedFilterIndex,
        isMerge = false,
        targetFilter;

    // user has selected a template
    let template = prefs.getCurrentFilterTemplate();
    if (mergeFilterIndex >= 0) {
      targetFilter = matchingFilters[mergeFilterIndex];
      isMerge = true;
    }
    else {
			let wrn = util.getBundleString('quickfilters.merge.warning.selectTarget',
                                     'A target filter must be selected for merging!')
      util.popupAlert(wrn);
			return;
    }

    // 1. create a new filter and copy actions of target filter
    let newName = targetFilter.filterName,
    // append " +m" to name to show that filter is merged
        mergeToken = quickFilters.Preferences.getCharPref('naming.mergeToken');
    if (mergeToken) {
      if (newName.indexOf(mergeToken) == -1)
        newName = newName + mergeToken;
    }
    let newFilter = filtersList.createFilter(newName);
		newFilter.clearActionList();
    let aList = [],
        actions = targetFilter.sortedActionList; // apparently actionList has been removed for this one
		if (targetFilter.sortedActionList) {
		  // Thunderbird
			let newActions = newFilter.sortedActionList;
			for (let a = 0; a <actions.length; a++) {
			  let append = true;
			  for (let b = 0; b < newActions.length; b++) { 
          let ac = newActions[b].QueryInterface(Ci.nsIMsgRuleAction); // newActions.queryElementAt(b, Ci.nsIMsgRuleAction);
				  if (ac.type == actions[a].type
					    &&
							ac.strValue == actions[a].strValue) {
					  append = false; // avoid duplicated actions
						break;
					}
				}
				if (append)
				  newFilter.appendAction(actions[a]);
			}
		}


    // 2. now copy the filter search terms of the filters in the array to the new filter
    // then delete the other filters
    // 2a - copy TargetFilter first
    util.copyTerms(targetFilter, newFilter, true); // we probably need to determine the booleanAnd property of the (first) target term
		                                               // and use this for all (or the first) terms of the merged filters
																									 // if the operators are mixed we might also need to add beginsGrouping and endsGrouping
																									 // attributes
    for (let i = 0 ; i < matchingFilters.length ; i++) {
      let current = matchingFilters[i];
      // copy filter
      if (targetFilter == current)
        continue;
      util.copyTerms(current, newFilter, true);
    }
    // determine the index of insertion point (at the filter selected in the assistant)
    let idx;
    for (idx = 0; idx < filtersList.filterCount; idx++) {
      if (targetFilter == filtersList.getFilterAt(idx))
        break;
    }
    
    // 3. open the editor
    let args = { filter:newFilter, filterList: filtersList};
    //args.filterName = targetFilter.filterName;
    // check http://mxr.mozilla.org/comm-central/source/mailnews/base/search/content/FilterEditor.js
    // => filterEditorOnLoad()
    window.openDialog("chrome://messenger/content/FilterEditor.xhtml", "",
                      "chrome, modal, resizable,centerscreen,dialog=yes", args);

    // If the user hits ok in the filterEditor dialog we set args.refresh=true
    // we also need to remove all old filters that have been merged into the new one.
    if ("refresh" in args && args.refresh)
    {
      quickFilters.Worker.openFilterList(true, sourceFolder);
      // 4. insert the merged filter
      util.logDebug("Adding new Filter '" + newFilter.filterName + "' "
           + ": current list has: " + filtersList.filterCount + " items");
			newFilter.enabled = true;
      filtersList.insertFilterAt(idx, newFilter);
      // 5. delete the original filters
      for (let i = 0; i < matchingFilters.length; i++) {
        let current = matchingFilters[i];
        for (idx = filtersList.filterCount-1; idx >= 0; idx--) {
          if (current == filtersList.getFilterAt(idx)){
            filtersList.removeFilterAt(idx);
            break;
          }
        }
      }
      this.selectFilter(newFilter);
      // [Bug 25748] Automatic Refresh of Duplicate List
      this.refreshDuplicates(false);
    }
    else
      this.rebuildFilterList();
  } ,
	
	// retrieves the folder of the currently selected server
	get CurrentFolder() {
		if (typeof gServerMenu !== 'undefined')
			return gServerMenu._folder; // Tb52++ this is the menulist #serverMenu
	  if (typeof gCurrentFolder !== "undefined") {
			return gCurrentFolder ; // Tb
		}
		// Postbox / Suite:
		if (typeof gCurrentServerURI !== 'undefined')
		  return quickFilters.Util.getMsgFolderFromUri(gCurrentServerURI);
		
		return null; 
	} ,
	
	set RunFolder(f) {
    let runMenu = document.getElementById("runFiltersPopup");
    if (runMenu) runMenu.selectFolder(f);
		
		if (typeof updateButtons !== 'undefined')
			updateButtons();
	} ,	
	
	get RunFolder() {
		// research: https://dxr.mozilla.org/comm-central/source/mail/base/content/FilterListDialog.js
		if (typeof gRunFiltersFolder !== 'undefined') // Tb
			return gRunFiltersFolder._folder;
		if (typeof gRunFiltersFolderPicker !== 'undefined') // Pb 
		  return quickFilters.Util.getMsgFolderFromUri(gRunFiltersFolderPicker.getAttribute("uri"));
		return null;
	} ,
	
  styleFilterListItems: function styleFilterListItems() {
		let list = this.FilterListElement,
        type = this.clipboardPending,
        clpFilters = this.clipboardList;
    this.resetClipboardStylings();
    if (type && clpFilters.length>0) {
      for (let i=0; i<clpFilters.length;i++) {
        let current = clpFilters[i];
        for (let c=0; c < list.children.length; c++) {
          let item = list.children[c];
          if (item._filter && item._filter == current) {
            switch(type) {
              case 'cut':
                item.setAttribute("class", "quickFiltersCut");
                break;
              case 'copy':
                item.setAttribute("class", "quickFiltersCopy");
                break;
            }
            item.firstChild.setAttribute("class", "listcell-iconic");
          }
        }
      }
    }
  },
  
  rebuildPost: function rebuildPost() {
    quickFilters.List.styleFilterListItems();
  },
  
  styleSelectedItems: function styleSelectedItems(type) {
		let list = this.FilterListElement;
    if (typeof list.selectedItems !== "undefined") {
      for(let i=0; i<this.getSelectedCount(list); i++) {
        switch(type) {
          case 'cut': case 'sort':
            list.selectedItems[i].setAttribute("class", "quickFiltersCut");
            break;
          case 'copy':
            list.selectedItems[i].setAttribute("class", "quickFiltersCopy");
            break;
        }
        list.selectedItems[i].firstChild.setAttribute("class", "listcell-iconic");
      }
    }
  } ,
  
	pushSelectedToClipboard: function pushSelectedToClipboard(type) {
		const util = quickFilters.Util,
		      list = this.FilterListElement,
					filtersList = this.FilterList,
					sourceFolder = filtersList.folder;
		function getListIndex(filter) {
			for (let i=0; i<filtersList.filterCount; i++) {
				if (list.getItemAtIndex(i)._filter == filter) return i;
			}
			return -1;
		}
		let count = this.getSelectedCount(list);
		if (count < 1) {
			let wrn = util.getBundleString('quickfilters.copy.warning.selectFilter', 'Please select at least one filter!');
			util.popupAlert(wrn, "quickFilters", 'fugue-clipboard-exclamation.png');
			return false;
		}
		this.clipboardList.splice(0); // discard old list
		this.clipboardServer = this.CurrentFolder; // original account when copying to clipboard!
		let cutFiltersList = sourceFolder.getEditableFilterList(gFilterListMsgWindow);
				
		// get all selected filters and sort them by their list position
		// then copy to clipboardList array
		let unsortedFilterSelection = [];
    for (let f=0; f<count ; f++) {
      let aFilter = this.getSelectedFilterAt(list, f), // nsIMsgFilter 
			    idx = getListIndex(aFilter);
			unsortedFilterSelection.push ({filter: aFilter, index: idx});
    }
		let sorted = unsortedFilterSelection.sort(function(a, b) {
					let ai = a.index,
    					bi = b.index;
					return ((ai < bi) ? -1 : ((ai > bi) ? 1 : 0));
			});
		for (let s=0; s<sorted.length; s++) {
			this.clipboardList.push(sorted[s].filter);
		}
		// let's style the affected items for visual feedback...
	  try {
			this.resetClipboardStylings();
      this.styleSelectedItems(type);
		}
		catch(ex) {
      util.logException('pushSelectedToClipboard - during marking as copied/cut', ex);
		}
		
		return true;
	},
	
	cutFilters: function cutFilters() {
		if (this.pushSelectedToClipboard('cut')) {
			this.clipboardPending='cut';
		}
	},
	
	copyFilters: function copyFilters() {
		if (this.pushSelectedToClipboard('copy')) {
			this.clipboardPending='copy';
		}
	},
	
	pasteFilters: function pasteFilters(isSort) {
		const util = quickFilters.Util,
		      prefs = quickFilters.Preferences,
		      Ci = Components.interfaces;
		let clpFilters = this.clipboardList,
        sortedFiltersList,
		    isInsert = false,
		    isRemove = false,
        isMove = false,
        sortIndex = 0;
		try {
			if (clpFilters.length < 1) {
				let wrn = util.getBundleString('quickfilters.copy.warning.emptyClipboard',
				  'No filters in clipboard!');
				util.popupAlert(wrn, 'quickFilters', 'fugue-clipboard-exclamation.png');
				return;
			}
			if (this.clipboardServer == this.CurrentFolder) {
        isMove = true; // copy / paste from same server = move
        if (this.clipboardPending == 'copy')  { // not allowed
          let wrn = util.getBundleString('quickfilters.copy.warning.selectOtherAccount',
            'Select a different account for pasting items!');
          util.popupAlert(wrn, 'quickFilters', 'fugue-clipboard-exclamation.png');
          return;
        }
			}
			if (!this.clipboardServer.server.canHaveFilters) {
				let msg = util.getBundleString('quickfilters.createFilter.warning.canNotHaveFilters',
					'The account {1} does not support filters!');
				util.popupAlert(msg.replace('{1}', this.clipboardServer.prettyName), 
				                             'quickFilters', 'fugue-clipboard-exclamation.png');
				return;
			}
			
			switch (this.clipboardPending) {
				case 'cut':
        case 'sort':
					isInsert = true;
					isRemove = true;
					break;
				case 'copy':
					isInsert = true;
					break;
				default:
					return;
			}
			// find insert position
			let list = this.FilterListElement,
			    index = this.getSelectedIndex(list);
			if (index<0) // if nothing is selected append to end
				index = this.getListElementCount(list); // list.itemCount - itemCount doesn't work in Postbox

			let filtersList = this.FilterList,
          sourceFolder = this.clipboardServer.rootFolder,
          cutFiltersList;
			if (isRemove) {
        cutFiltersList = sourceFolder.getEditableFilterList(gFilterListMsgWindow);
      }
      if (isMove && !isSort) {  // we are moving within the same server, so let's get rid of all icons to avoid confusion.
        this.resetClipboardStylings();
      }
			// PASTE new filters in account
			if (isInsert) {
        // if sorting, determine insert position by taking smallest index of selected filterSearch
        if (isSort) {
          sortIndex = 10000;
          for (let i = 0; i < clpFilters.length; i++) {
            let current = clpFilters[i];
            for (let cix = cutFiltersList.filterCount-1; cix >= 0; cix--) {   
              if (current == cutFiltersList.getFilterAt(cix)){
                if (cix<sortIndex) sortIndex = cix; // get topmost position for insert
              }
            }
          }
          // append to sorted List in alphabetical order:
          sortedFiltersList = clpFilters.sort(function(a,b) { 
            return a.filterName.toLocaleLowerCase() > b.filterName.toLocaleLowerCase(); 
          });
        }
				// insert, in order, at cursor or append to end if no target filter selected.
				for (let i = 0; i < clpFilters.length; i++) {
          if (isRemove) {
            let current = clpFilters[i];
            // CUT FIRST
            for (let cix = cutFiltersList.filterCount-1; cix >= 0; cix--) {
              if (current == cutFiltersList.getFilterAt(cix)){
                util.logDebugOptional("clipboard", 'Removing filter: ' + current.filterName);
                cutFiltersList.removeFilterAt(cix);
                if (isMove) {
                  if (cix<=index) index--; // compensate for moving (we deleted item before insert point).
                }
                break;
              }
            }
          }
          // PASTE: NOW INSERT
          if (!isSort) {
            let filter = clpFilters[i].QueryInterface(Ci.nsIMsgFilter);
            filtersList.insertFilterAt(index++, filter); 
          }
				}
        // SORT: when sorting we insert after *all* cut clipboard filters have been removed
        if (isSort) {
          for (let i = 0; i < clpFilters.length; i++) {
            let filter = sortedFiltersList[i].QueryInterface(Ci.nsIMsgFilter);
            util.logDebugOptional("clipboard", 'Insert filter [' + sortIndex + ']: ' + filter.filterName);
            filtersList.insertFilterAt(sortIndex++, filter); 
          }
          this.resetClipboardStylings();
        }
			}
		}
		catch (ex) {
      util.logException('Exception during paste filter; aborting. ', ex);
			this.rebuildFilterList();
			return;
		}
		// 2. remove original filters (if cut)
		//    for this, we need to return to the filter list on the original server!
		if (isRemove) {
			for (let i = 0; i < clpFilters.length; i++) {
				let filter = clpFilters[i].QueryInterface(Ci.nsIMsgFilter);
			}
		}
    if (!prefs.getBoolPref("multipaste") ) {
      this.clipboardPending = ''; // reset copy/cut mode.
    }
		this.rebuildFilterList();
		
	},

  getListElementCount: function getListElementCount(list) {
    return list.getRowCount();
  } ,

  // remove any icons that were added as part of copy or cut functions
  resetClipboardStylings: function resetClipboardStylings() {
		quickFilters.Util.logDebugOptional("clipboard", "resetClipboardStylings()");
		let list = this.FilterListElement,
		    ct = list.children.length;
	  for (let i = 0; i<ct; i++) {
			let cl = list.children[i].getAttribute('class');
			if (cl.indexOf('quickFilters')>=0) {
				cl = cl.replace('quickFiltersCut', '').replace('quickFiltersCopy', '');
				list.children[i].setAttribute('class', cl);
			}
			
		}
	} ,
	
	onSelectServer: function onSelectServer() {
		const util = quickFilters.Util;
		util.logDebugOptional("clipboard", "onSelectServer()");
    this.styleFilterListItems();
    if (document.getElementById('quickFiltersBtnCancelFound').collapsed) {
      // reset duplicates list + hide: only if we are not in Search mode.
      this.clearDuplicatePopup(false);
      document.getElementById('quickFiltersBtnCancelDuplicates').collapsed = true;
      document.getElementById('quickFiltersBtnDupe').collapsed = false;
    }
	} ,
	
	onSelectFilter : function onSelectFilter(evt) {
    let list = this.FilterListElement,
        numFiltersSelected = this.getSelectedCount(list),
        oneFilterSelected = (numFiltersSelected === 1),
        upDisabled = !(oneFilterSelected &&
                       this.getSelectedFilterAt(list, 0) != list.childNodes[1]);
    if (list.currentIndex === 0) // SM
      upDisabled = true;
    let downDisabled = (!oneFilterSelected
        || list.currentIndex === this.getListElementCount(list)-1);
  } ,

  onLoadFilterList: function onLoadFilterList(evt) {
    const util = quickFilters.Util,
		      prefs = quickFilters.Preferences,
					qList = quickFilters.List;
    function removeElement(el) {
      try {
        el.collapsed = true;
      }
      catch(ex) {
        util.logException('onLoadFilterList - removeElement() failed', ex);
      }
    }
    
    function formatListLabel(el) {
      if (el) {
        el.setAttribute('crop','end');
        el.minwidth = 15;
      }
    }
		
    let getElement = document.getElementById.bind(document);
		if (prefs.isDebugOption('filterList')) debugger;
    util.logDebugOptional('filterList', 'onLoadFilterList() starts...');
    // overwrite list updateButtons
    let orgUpdateBtn = updateButtons;
    updateButtons = function() {
			util.logDebugOptional('filterList','called updateButtons() - calling original function...');
      orgUpdateBtn();
      qList.updateButtons();
    }
		// Toolbar
		let toolbox = getElement("quickfilters-toolbox"),
		    hbs = document.getElementsByTagName('hbox'),
		  hbox = hbs ? hbs[0] : null ;
		let isToolbar = false;
		if (!prefs.getBoolPref("toolbar")) {
		  toolbox.parentNode.removeChild(toolbox);
		}
		else if (hbox && toolbar) { // move toolbox up
			hbox.parentNode.insertBefore(toolbox, hbox);
			isToolbar = true;
			if (quickFilters.Util.AssistantActive) {
				let button = getElement('quickFiltersBtnStart');
				button.checked = true;			
			}
		}
		
		// add event listener for changing account
    let dropDown = getElement("serverMenu");
		if (dropDown) {
			util.logDebugOptional("clipboard", "Server dropdown event listener");
			dropDown.addEventListener("command", 
				function(e) { qList.onSelectServer();},
				false);
		}
		
		// attach context menu.
		let filterListEl = this.FilterListElement;
		filterListEl.setAttribute('context','quickFiltersContext');

    // check whether [Bug 450302] has landed - Thunderbird 24.0
    let nativeSearchBox = getElement("searchBox");
    //move buttons to the correct place
    let down = getElement("reorderDownButton"),
        mergeButton = getElement("quickFilters-mergeButton");
    if (mergeButton) {
		  if (isToolbar)
				mergeButton.parentNode.removeChild(mergeButton); // remove unneccessary button
			else
				down.parentNode.insertBefore(mergeButton, getElement("deleteButton").nextSibling);
    }
    
    let sb = nativeSearchBox;
    if (sb) {
      util.logDebugOptional('filterList', 'got search box, extending functionality...');
      let btnOptions = getElement('quickFilters-SearchOptions');
      btnOptions.collapsed = false;
      btnOptions = sb.parentNode.insertBefore(btnOptions, sb);
      // extend search methods:
      filterSearchMatch = qList.filterSearchMatchExtended;
      if (rebuildFilterList) {
        if (!this.rebuildFilterList_Orig) {
          this.rebuildFilterList_Orig = rebuildFilterList;
          rebuildFilterList = function() { 
            qList.rebuildFilterList_Orig(); 
            qList.rebuildPost(); // step for styling the list after rebuilding
          }
        }
      }
    
      // in this case, this id should be assigned already by the bugfix
      formatListLabel(getElement("filterListLabel"));
    }
    
    // highlight target filter if passed into window
    if (window.arguments.length) {
      util.logDebugOptional('filterList', 'window.arguments found');
      // targetFilter: highlights the filter that is passed in
      let targetFilter,
          targetFolder, // filter search: find filters that redirect mail to this folder
					isAlphabetic,
					args = window.arguments; // insert new filter in alphabetical order
					
      for (let i=0; i<args.length; i++) {
        if (args[i].targetFilter) targetFilter = args[i].targetFilter;
        if (args[i].targetFolder) targetFolder = args[i].targetFolder;
        if (args[i].alphabetic) isAlphabetic = args[i].alphabetic;
      }
      if (targetFolder) {
        // prepare a dropdown with results!
        this.findFromTargetFolder(targetFolder);
      }
      if (targetFilter) {
        // Tb78
        // trying timeout because this causes call to rebuildFilterList with exception "gSearchBox is null"
        // maybe document isn't ready at this stage?
        setTimeout(
          function() {
            qList.selectFilter(targetFilter);
            if (isAlphabetic)
              qList.moveAlphabetic(targetFilter);
            if (typeof getFirstFolder != 'undefined') {
              // set run folder:
              let rootFolder = qList.CurrentFolder.rootFolder,
                  first = getFirstFolder(rootFolder);
              if (first) qList.RunFolder = first; 
            }
          }, 150
        );
      }  
    }
    // set zlevel to raisedZ
    // https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIXULWindow
    let windowMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                     .getService(Components.interfaces.nsIWindowMediator);
    if (windowMediator.setZLevel)
      windowMediator.setZLevel(window, 6);
    else 
      window.focus();
    
    util.logDebugOptional('filterList', 'onLoadFilterList() complete.');
  } ,
	
	moveAlphabetic: function moveAlphabetic(targetFilter) {
		let filtersList = this.FilterList,
				numFilters = filtersList.filterCount;;
		// if (prefs.isDebugOption('createFilter')) debugger;
		this.cutFilters();
		for (let idx=1; idx<numFilters; idx++) { // skip first one, this is the newly created filter
			if (targetFilter.filterName.toLocaleLowerCase() < filtersList.getFilterAt(idx).filterName.toLocaleLowerCase()) {
				// select filter insert on the filter that is alphabetically later
				this.selectFilter(filtersList.getFilterAt(idx));
				// paste new filter before that
				this.pasteFilters(false);
				this.selectFilter(targetFilter);
				break;
			}
		}
	} ,

  selectFilter: function selectFilter(targetFilter) {
		const util = quickFilters.Util;
    // highlight last edited filter: (after merge!!)
    // [Bug 25802] After editing existing Filter, it should be selected in List 
    util.logDebugOptional('filterList', 'targetFilter argument passed: ' + targetFilter ? targetFilter.filterName : 'null');
    // reset the filter first
    try {
      resetSearchBox();  // http://mxr.mozilla.org/comm-central/source/mail/base/content/FilterListDialog.js#920
    }
    catch(ex) {
      debugger;
    }
    finally {
      rebuildFilterList();
    }
    // if passed to window arguments, iterate and highlight matching filter
    let list = this.FilterListElement,
        filtersList = this.FilterList,
        ct = filtersList.filterCount;
    try {
      let msg = targetFilter ? 'list - searching ' + ct + ' rows for targetFilter: ' + targetFilter.filterName : 'selectFilter() - No target filter passed!';
      util.logDebugOptional('filterList', msg);
    }
    catch(x) {;}
    for (let idx = 0; idx < ct; idx++) {
      let f = filtersList.getFilterAt(idx); // list.getItemAtIndex(idx);
      if (targetFilter == f) {
        util.logDebugOptional('filterList', 'Target Filter [' + targetFilter.filterName + '] found at index: ' + idx);
        if (list.nodeName != 'tree') { // listbox (Tb)  if (list.getIndexOfItem)
          let item = list.getItemAtIndex(idx);
          list.ensureElementIsVisible(item);
          list.selectItem(item);
        } 
        else {  // tree (Postbox + SeaMonkey)#
          alert("incompatible code in selectFilter!");
        }
        break;
      }
    }
  } ,
  
	// here is a hack for filtering, because the filtered view returns incorect rowCount
  // Tb78 obsolete?
  updateCountBox: function updateCountBox(forceCount) {
		try {
      return;
/*      
			let countBox = document.getElementById("quickFilters-Count"),
					sum = this.FilterList.filterCount,
					filterList = this.FilterListElement,
					len = (forceCount!=null) ?
					  forceCount : this.getListElementCount(filterList);

			if (len === sum)
				countBox.value =
					(len === 1)
					? document.getElementById ('quickFilters-Count-1-item').value
					: len.toString() + " " + document.getElementById ('quickFilters-Count-items').value;
			else /// copy from hidden box
				countBox.value = document.getElementById ('quickFilters-Count-n-of-m').value
					.replace('{0}', len.toString())
					.replace('{1}', sum.toString());
*/
		}
		catch(ex) {
			quickFilters.Util.logException("Exception in quickFilters.List.updateCountBox()", ex);
		}

  } ,

  // note: use an alias to avoid recursion (we want to call the global / Tb function_
  rebuildFilterList: function rebuildFilterList_qF() {
		const util = quickFilters.Util;
		try {
			rebuildFilterList(gCurrentFilterList);
			// this.updateCountBox(); // is this obsolete? uses the now non-existent quickFilters-Count element
		}
		catch(ex) { util.logException('rebuildFilterList()', ex) }
  } ,

/**
 * Called when the search button is clicked, this will narrow down the amount
 * of filters displayed in the list, using the search term to filter the names
 *
 * @param focusSearchBox  if called from the button click event, return to searchbox
 */
  onFindFilter: function onFindFilter(focusSearchBox) {
    const util = quickFilters.Util,
		      prefs = quickFilters.Preferences;
    let searchBox = document.getElementById("searchBox"), // quickFilters-Search
        filterList = this.FilterListElement,
        keyWord = searchBox.value.toLocaleLowerCase();

    // simplest case: if filter was added or removed and searchbox is empty
    if (!keyWord && !focusSearchBox) {
      //this.updateCountBox();
      return;
    }

    this.rebuildFilterList(this.FilterList); // creates the unfiltered list; already updates countBox
    if (!keyWord) {
      if (focusSearchBox)
        searchBox.focus();
      return;
    }

    // rematch everything in the list, remove what doesn't match the search box
    let rows = this.getListElementCount(filterList),
        title, item, hiddenCount=0;
        
    for (let i = rows - 1; i>=0; i--) {
      let matched = true;
      // Thunderbird
      item = filterList.getItemAtIndex(i);
      // in Tb78, this is now a richlistitem. It's first child is a label element with a value
      title = item.firstChild.value; // item.firstChild.getAttribute("label");
      if (title.toLocaleLowerCase().indexOf(keyWord) === -1)
      {
        matched = false;
        filterList.removeChild(item);
      }

      if (matched)
        util.logDebugOptional("filters", "matched filter: " + title);
    }
    // this.updateCountBox(rows-hiddenCount);
    if (focusSearchBox)
      searchBox.focus();

  } ,

  validateFilterTargets: function validateFilterTargets(sourceURI, targetURI) {
		quickFilters.Util.validateFilterTargets(sourceURI, targetURI);
  },
	
	toggleAssistant: function toggleAssistant(btn) {
	  let win = quickFilters.Util.getMail3PaneWindow();
		btn.checked = !quickFilters.Util.AssistantActive; 
		win.quickFilters.onToolbarButtonCommand();	
	} ,
  
  searchType: 'name', // standard filter search. looks only at filter names
  
  toggleSearchType: function toggleSearchType(type) {
		const util = quickFilters.Util;
    if (this.searchType==type) 
      return;
    this.searchType=type;
		
		if(type != 'name') {
			util.popupProFeature("Advanced search (type=" + type + ")", true);
		}
    this.rebuildFilterList(); // used the global rebuildFilterList!
  } ,
  
  showPopup: function showPopup(button, popupId, evt) {
		let p = button.ownerDocument.getElementById(popupId);
		if (p) {
			// document.popupNode = button;
			p.targetNode = button; 
			
			if (p.openPopup)
				p.openPopup(button,'after_start', 0, -1,true,false,evt);
			else
				p.showPopup(button, 0, -1,"context","bottomleft","topleft"); // deprecated method
    }
  } ,
  /**
   * Decides if the given filter matches the given keyword. This is where the advanced filter search happens in Thunderbird.
   * @param  aFilter   nsIMsgFilter to check
   * @param  aKeyword  the string to find in the filter name
   * @return  True if the selected field contains the searched keyword.
              Otherwise false. In the future this may be extended to match
              other filter attributes.
   */
  filterSearchMatchExtended : function filterSearchMatchExtended(aFilter, aKeyword) {
		const util = quickFilters.Util,
		      Ci = Components.interfaces;
    // more search options
    let FA = Ci.nsMsgFilterAction,
        acLength = util.getActionCount(aFilter);
    switch(quickFilters.List.searchType) {
      case 'name':
        return (aFilter.filterName.toLocaleLowerCase().indexOf(aKeyword)>=0);
      case 'targetFolder':
        for (let index = 0; index < acLength; index++) {
          let ac = aFilter.getActionAt(index);
          if (ac.type == FA.MoveToFolder || ac.type == FA.CopyToFolder) {
            if (ac.targetFolderUri) { 
              // also allow complete match (for duplicate search)
              if (ac.targetFolderUri.toLocaleLowerCase() == aKeyword)
                return true;
              let lI = ac.targetFolderUri.lastIndexOf('/');
              if (lI<0) lI=0;
              if (ac.targetFolderUri.substr(lI).toLocaleLowerCase().indexOf(aKeyword)>=0)
                return true;
            }
          }
        }        
        return false;
      case 'condition':
        let stCollection = util.querySearchTermsArray(aFilter.searchTerms);
        for (let t = 0; t < util.querySearchTermsLength(stCollection); t++) {
          // http://mxr.mozilla.org/comm-central/source/mailnews/base/search/content/searchTermOverlay.js#177
          // searchTerms.QueryElementAt(i, Ci.nsIMsgSearchTerm);
          let searchTerm = util.querySearchTermsAt(stCollection, t);
          if (searchTerm.value) {
            let val = searchTerm.value, // nsIMsgSearchValue
                AC = Ci.nsMsgSearchAttrib;
            if (val && util.isStringAttrib(val.attrib)) {
              let conditionStr = searchTerm.value.str || '';  // guard against invalid str value.
              if (conditionStr.toLocaleLowerCase().indexOf(aKeyword)>=0)
                return true;
            }
          }
        }
        return false;
      case 'tagLabel':
        for (let index = 0; index < acLength; index++) {
          let ac = aFilter.getActionAt(index);
          if (ac.type == FA.AddTag || ac.type == FA.Label) {
            if (ac.strValue &&
                ac.strValue.toLocaleLowerCase() == aKeyword) // full match for tags, but case insensitive.
							return true;
          }
        } 
        return false;
			case 'stringAction': // any (custom) action that sets a string
        for (let index = 0; index < acLength; index++) {
          let ac = aFilter.getActionAt(index);
          if (ac.type == FA.Custom) {
						try {
							if (ac.strValue &&
								  ac.strValue.toLocaleLowerCase().indexOf(aKeyword) >=0) // partly match case insensitive
								return true;
						}
						catch(ex) {} ;
          }
        } 
			  return false;
      case 'replyWithTemplate':
        for (let index = 0; index < acLength; index++) {
          let ac = aFilter.getActionAt(index, Ci);
          if (ac.type == FA.Reply) {
            if (ac.strValue) { 
              let searchSubject = quickFilters.List.retrieveSubjectFromReply(ac.strValue).toLocaleLowerCase();
              if (searchSubject.indexOf(aKeyword)>=0) // full match for tags, but case insensitive.
                return true;
            }
          }
        }        
        return false;
    }
    return true; // no search filter.
  },
  
  retrieveSubjectFromReply: function retrieveSubjectFromReply(strValue) {
    let k = strValue.indexOf('subject=');
    if (k>0) {
      return strValue.substr(k+8);
    }
    else return "";
  },
  
  bundleSearchAttributes: null,
  get bundleSA() {
    if (!this.bundleSearchAttributes)
      this.bundleSearchAttributes = Components.classes["@mozilla.org/intl/stringbundle;1"]
        .getService(Components.interfaces.nsIStringBundleService)
        .createBundle("chrome://messenger/locale/search-attributes.properties");
    return this.bundleSearchAttributes;
  } ,
  bundleSearchOperators: null,
  get bundleSO() {
    if (!this.bundleSearchOperators)
      this.bundleSearchOperators = Components.classes["@mozilla.org/intl/stringbundle;1"]
        .getService(Components.interfaces.nsIStringBundleService)
        .createBundle("chrome://messenger/locale/search-operators.properties");
    return this.bundleSearchOperators;
  } ,
  // gets string from search-attributes.properties
  getSearchAttributeString: function getSearchAttributeString(id, defaultText) {
    let s;
    try {
      s = this.bundleSA.GetStringFromName(id); 
    }
    catch(e) {
      s = defaultText;
      quickFilters.Util.logException ("Could not retrieve bundle string: " + id, e);
    }
    return s;
  } ,  
  
  getSearchOperatorString: function getSearchOperatorString(id, defaultText) {
    let s;
    try {
      s = this.bundleSO.GetStringFromName(id); 
    }
    catch(e) {
      s = defaultText;
      quickFilters.Util.logException ("Could not retrieve bundle string: " + id, e);
    }
    return s;
  } ,
  
  // see mxr.mozilla.org/comm-central/source/mailnews/base/search/content/searchTermOverlay.js#316
  // return meaning of nsMsgSearchAttribValue  (string types only)
  getAttributeLabel: function getAttributeLabel(attrib) {
    //  retrieve locale strings from http://mxr.mozilla.org/comm-central/source/suite/locales/en-US/chrome/mailnews/search-attributes.properties
    switch(attrib) {
      case -2: return 'Custom';  /* a custom term, see nsIMsgSearchCustomTerm */
      case -1: return 'Default';
      case  0: return this.getSearchAttributeString('Subject', 'Subject'); 
      case  1: return this.getSearchAttributeString('From', 'From');
      case  4: return this.getSearchAttributeString('Priority', 'Priority');
      case  6: return this.getSearchAttributeString('To', 'To');
      case  7: return this.getSearchAttributeString('Cc', 'Cc');
      case  8: return this.getSearchAttributeString('ToOrCc', 'To Or Cc');
      case  9: return this.getSearchAttributeString('FromToCcOrBcc', 'From, To, Cc or Bcc'); // AllAddresses 
      case 10: return 'Location'; /* result list only */
      case 11: return 'Message Key';  /* message result elems */
      case 15: return 'Any Text';
      case 16: return 'Tags'; // Keywords
      case 17: return this.getSearchAttributeString('AnyName', 'Any Name'); // Name
      case 18: return this.getSearchAttributeString('DisplayName', 'Display Name');
      case 19: return this.getSearchAttributeString('Nickname', 'Nickname');
      case 20: return this.getSearchAttributeString('ScreenName', 'Screen Name');
      case 21: return this.getSearchAttributeString('Email', 'Email');
      default: return 'attrib(' + attrib + ')';
     }
  } ,
  
  // return meaning of nsMsgSearchOpValue
  getOperatorLabel: function getOperatorLabel(operator) {
    switch (operator) {
      case 0: return this.getSearchOperatorString('0', 'contains');
      case 1: return this.getSearchOperatorString('1', 'doesn\'t contain');
      case 2: return this.getSearchOperatorString('2', 'is');
      case 3: return this.getSearchOperatorString('3', 'isn\'t');
      case 4: return this.getSearchOperatorString('4', 'is empty');
      case 5: return this.getSearchOperatorString('5', 'is before');
      case 6: return this.getSearchOperatorString('6', 'is after');
      case 7: return this.getSearchOperatorString('7', 'is higher than');
      case 8: return this.getSearchOperatorString('8', 'is lower than');
      case 9: return this.getSearchOperatorString('9', 'begins with');
      case 10: return this.getSearchOperatorString('10', 'ends with');
      case 11: return this.getSearchOperatorString('11', 'sounds like');
      case 13: return this.getSearchOperatorString('13', 'is greater than');
      case 14: return this.getSearchOperatorString('14', 'is less than');
      default: return 'operator(' + operator + ')';
    }
  } ,
  
  truncateLabel : function truncateLabel(x, maxlen) {
    /* given a string and a maximum length for the string, this routine
    returns the same string truncated to the maximum length. In addition,
    if the string was truncated, "..." is added to the start, again not to
    exceed the maximum length.

    E.g. truncateLabel("abcdef", 4) = "...bcdef"
      truncateLabel("abcdef", 6) = "abcdef"
    */

    if (x.length <= maxlen)
      return x;
    else if (maxlen < 4)
      return x.substring(0, maxlen); // no room for ellipsis
    else  {
      let l=x.length;
      return String.fromCharCode(0x2026) + x.substring(l-(maxlen-1)); // prepend ellipsis
    }
  } ,
  
  // return label for  nsMsgRuleActionType
  getActionLabel: function getActionLabel(actionType) {
    // retrieve locale strings from http://mxr.mozilla.org/comm-central/source/mail/locales/en-US/chrome/messenger/FilterEditor.dtd
    // l10n at http://hg.mozilla.org/l10n-central
		let getString = quickFilters.Util.getBundleString.bind(quickFilters.Util);
    switch(actionType) {
      case  1: return getString('quickfilters.moveMessage.label', 'Move Message to');
      case  2: return getString('quickfilters.setPriority.label', 'Set Priority to');
      case  4: return getString('quickfilters.markMessageRead.label', 'Mark As Read');
    //case  8: return getString('quickfilters.xx.label', 'Add label'); // ??
      case  9: return getString('quickfilters.replyWithTemplate.label', 'Reply with template');
      case 10: return getString('quickfilters.forwardTo.label', 'Forward Message to');
      case 16: return getString('quickfilters.copyMessage.label', 'Copy Message to');
      case 17: return getString('quickfilters.addTag.label', 'Tag Message');
      case 19: return getString('quickfilters.markMessageUnread.label', 'Mark As Unread');
      default: return 'Action (' + actionType + ')';
    }
  } ,
  
  clearResultsPopup: function clearResultsPopup(show, popupId) {
    try {
      let termDropDown = document.getElementById(popupId),
          menuPopup = termDropDown.menupopup;
      // clear
      while(menuPopup.childNodes.length) {
        menuPopup.removeChild(menuPopup.childNodes[0]);
      }  
      termDropDown.collapsed = !show;
      termDropDown.style.display = '-moz-box';
      return menuPopup;    
    }
    catch (ex) {
      quickFilters.Util.logException("clearResultsPopup", ex);
      return null;
    }
  } ,
  
  clearDuplicatePopup: function clearDuplicatePopup(show) {
    return this.clearResultsPopup(show, 'quickFiltersDuplicateList');
  } ,
  
  findDuplicates: function findDuplicates() {
		const util = quickFilters.Util;
    // make an Array of
    // {attribType, 
    // 1. type of term  'sub
    // 2. operator
    // 3. match String
    this.duplicateTerms = [];  
    this.duplicateActions = [];
    let Terms = [],
        Actions = [];
    
    util.popupProFeature("duplicatesFinder", true);
    let filtersList = this.FilterList,
        FA = Components.interfaces.nsMsgFilterAction;
    // build a dictionary of terms; this might take some time!
    for (let idx = 0; idx < filtersList.filterCount; idx++) {
      let filter = filtersList.getFilterAt(idx),
      // 1. Search Conditions
          stCollection = util.querySearchTermsArray(filter.searchTerms);
      for (let t = 0; t < util.querySearchTermsLength(stCollection); t++) {
        // http://mxr.mozilla.org/comm-central/source/mailnews/base/search/content/searchTermOverlay.js#177
        // searchTerms.QueryElementAt(i, Components.interfaces.nsIMsgSearchTerm);
        let searchTerm = util.querySearchTermsAt(stCollection, t);
        if (searchTerm.value) {
          let val = searchTerm.value; // nsIMsgSearchValue
          if (val && util.isStringAttrib(val.attrib)) {
            let conditionStr = searchTerm.value.str || '', // guard against invalid str value.
                term = { attrib: val.attrib, operator: searchTerm.op, value: conditionStr, count: 1}, // .toLocaleLowerCase()
                found = false;
            for (let i=0; i<Terms.length; i++) {
              if (Terms[i].attrib == term.attrib && Terms[i].value == term.value && Terms[i].operator == term.operator) {
                Terms[i].count++;
                found = true;
                break;
              }
            }
            if (!found)
              Terms.push(term);
          }
        }
      }
      // 2. Actions
      let actionCount = util.getActionCount(filter);
      for (let a = 0; a < actionCount; a++) {
        let action = filter.getActionAt(a).QueryInterface(Components.interfaces.nsIMsgRuleAction),
            actionValue = '';
        switch(action.type) {
          case FA.MoveToFolder: case FA.CopyToFolder:
            actionValue = action.targetFolderUri;
            break;
          case FA.AddTag:
            actionValue = action.strValue;
          case FA.Reply:
            // get just the subject from value
            actionValue = quickFilters.List.retrieveSubjectFromReply(action.strValue);
            break;
          default:
            actionValue = '';
        }
        if (actionValue) {
          let actionTerm = { type: action.type, value: actionValue, count: 1},
              found = false;
          for (let i=0; i<Actions.length; i++) {
            if (Actions[i].type == actionTerm.type && Actions[i].value == actionTerm.value) {
              Actions[i].count++;
              found = true;
              break;
            }
          }
          if (!found)
            Actions.push(actionTerm);
        }
      }
    }  
    
    // dropdown with terms
    let termDropDown = document.getElementById('quickFiltersDuplicateList');
    termDropDown.selectedIndex = -1; //  deselect item if drop down was previously selected from
    let menuPopup = this.clearDuplicatePopup(true);
      
    // generate duplicate terms list
    for (let i=0; i<Terms.length; i++) {
      let term = Terms[i];
      if (term.count>1) {
        this.duplicateTerms.push(term);
        util.logDebug("Found duplicate condition: {attrib: " + term.attrib + ", op: " + term.operator + ", value: " + term.value + ", count: " + term.count +"}");
        let menuItem = document.createXULElement ? document.createXULElement("menuitem") : document.createElement("menuitem"),
            vLabel = term.value,
            theLabel = this.getAttributeLabel(term.attrib) + ' ' 
                     + this.getOperatorLabel(term.operator) + ': ' 
                     + vLabel 
                     + ' (' + term.count + ')';
        menuItem.setAttribute("label", theLabel);
        menuItem.setAttribute("searchAttribute", term.attrib); // special attribute for actions
        menuItem.setAttribute("value", term.value);        
        menuPopup.appendChild(menuItem);
      }
    }
    // add duplicate actions list
    for (let i=0; i<Actions.length; i++) {
      let action = Actions[i];
      if (action.count>1) {
        this.duplicateActions.push(action);
        util.logDebug("Found duplicate action: {attrib: " + action.type + ", value: " + action.value + ", count: " + action.count +"}");
        let menuItem = document.createXULElement ? document.createXULElement("menuitem") : document.createElement("menuitem"),
            dec = action.value;
        if (action.type==FA.MoveToFolder || action.type==FA.CopyToFolder)
          dec = decodeURI(dec);
        let labelVal = this.truncateLabel(dec, 30),
            theLabel = this.getActionLabel(action.type) + ': ' 
                     + labelVal
                     + ' (' + action.count + ')';
        menuItem.setAttribute("label", theLabel);
        menuItem.setAttribute("actionType", action.type); // special attribute for actions
        menuItem.setAttribute("value", action.value);        
        menuPopup.appendChild(menuItem);
      }
    }
    
    document.getElementById('quickFiltersBtnCancelDuplicates').collapsed = false;
    document.getElementById('quickFiltersBtnDupe').collapsed = true;
  } ,
  
  cancelDuplicates: function cancelDuplicates(el) {
    this.clearDuplicatePopup(false);
    document.getElementById('quickFiltersBtnCancelDuplicates').collapsed = true;
    document.getElementById('quickFiltersBtnDupe').collapsed = false;
    let contextMenu = document.getElementById('quickFiltersRemoveDuplicate');
    contextMenu.collapsed = true;
  } ,
  
  cancelFoundFilters: function cancelFoundFilters(el) {
    this.clearFoundFiltersPopup(false);
    document.getElementById('quickFiltersBtnCancelFound').collapsed = true;
    document.getElementById('quickFiltersBtnDupe').collapsed = false;
  } ,
  
  selectDuplicate: function selectDuplicate(el) {
		const util = quickFilters.Util;
    let searchBox = document.getElementById("searchBox");
    if (searchBox) {
      searchBox.value = el.value;
      this.onFindFilter(true);
    }
    let contextMenu = document.getElementById('quickFiltersRemoveDuplicate');
    contextMenu.collapsed = false;
    let actionType = el.selectedItem.getAttribute('actionType');
    if (actionType) {
      let men = util.getBundleString('quickfilters.menu.removeDupeAction', 'Remove duplicate action'),
      // remove the count e.g. (2) from label
          pos = el.label.lastIndexOf('('),
          displayAction = pos ? el.label.substring(0, pos) :  el.label;
      contextMenu.label = men + ": " + displayAction + "...";
      contextMenu.value = el.value;
      contextMenu.setAttribute("actionType", actionType);
      switch (parseInt(actionType,10)) {
        case 1:   // move to folder
        case 16:  // copy to folder
          quickFilters.List.toggleSearchType('targetFolder');
          document.getElementById('quickFiltersSearchTargetFolder').setAttribute('checked','true');
          break;
        case  8:  // Label
        case 17:  // Add Tag
          quickFilters.List.toggleSearchType('tagLabel');
          document.getElementById('quickFiltersSearchTag').setAttribute('checked', 'true');
          break;
        case 9: // Reply (with Template)
          quickFilters.List.toggleSearchType('replyWithTemplate');
          document.getElementById('quickFiltersSearchReplyWithTemplate').setAttribute('checked', 'true');
          break;
      }
    }
    else {
      let men = util.getBundleString('quickfilters.menu.removeDupeCondition', 'Remove duplicate condition');
      contextMenu.label = men + ": " + el.label + "...";
      contextMenu.value = el.value;
      quickFilters.List.toggleSearchType('condition');
      document.getElementById('quickFiltersSearchCondition').setAttribute('checked', 'true');
    }
  } ,
  
  removeSelectedCurrentDupe: function removeSelectedCurrentDupe(el) {
    // http://mxr.mozilla.org/comm-central/source/mail/base/content/FilterListDialog.js#288
    //   onEditFilter()
    let selectedFilter = currentFilter();
    if (!selectedFilter)
      return;

    // selectDuplicate has prepared the contextMenu item
    let dupeList = document.getElementById('quickFiltersDuplicateList'),
        termValue = dupeList.value,        // can be condition value or action value
        termActionType = dupeList.selectedItem.getAttribute("actionType"),
        args = {
      filter: selectedFilter, 
      filterList: this.FilterList, 
      filterConditionValue: termValue,           // use this to scroll to and highlight the condition needing to be removed
      filterConditionActionType: termActionType  // use this to scroll to and highlight the action needing to be removed
    };
    // for this functionality, we need to overload chrome://messenger/content/FilterEditor.xul
    window.openDialog("chrome://messenger/content/FilterEditor.xhtml", "FilterEditor", "chrome,modal,titlebar,resizable,centerscreen", args);

    if ("refresh" in args && args.refresh) {
      // reset search if edit was okay (name change might lead to hidden entry!)
      resetSearchBox(selectedFilter);
      rebuildFilterList();
    }          
  } ,

  clearFoundFiltersPopup: function clearFoundFiltersPopup(show) {
    return this.clearResultsPopup(show, 'quickFiltersFoundResults');
  } ,
	
  // similar to selectDuplicate but is also able to change the server selection as we search across all accounts
  selectFoundFilter: function selectFoundFilter(el) {
		const qList = quickFilters.List,
		      util = quickFilters.Util,
					prefs = quickFilters.Preferences;
    qList.toggleSearchType('targetFolder');
    document.getElementById('quickFiltersSearchTargetFolder').setAttribute('checked','true');
		
		if (prefs.isDebugOption('filterSearch')) debugger;
		
    var { MailUtils } = ChromeUtils.import("resource:///modules/MailUtils.jsm");

    
    // find out of we need to change server:
    let item = el.selectedItem,
        account = item.targetAccount,  
        targetFilter = item.targetFilter,
        uri = item.getAttribute('targetFolderUri'),
        actionType = item.getAttribute('actionType'),    
        // change server to correct account (originating inbox)
        // PROBLEM HERE!! -->
        aFolder = account ?
					(MailUtils ? 
					  (MailUtils.getExistingFolder ? MailUtils.getExistingFolder(account.serverURI) : MailUtils.getFolderForURI(account.serverURI)) 
						: account.rootMsgFolder) 
					: null;

		// check whether we changed to a different server:		
		if (qList.CurrentFolder != aFolder) {
      let serverPopup = qList.ServerMenuPopup;
      serverPopup.selectFolder(aFolder); // this didn't rebuild anymore!
			// rebuild list in case of server change
			if (typeof gCurrentFilterList !== 'undefined')  // Tb
				gCurrentFilterList = aFolder.getEditableFilterList(gFilterListMsgWindow);
			qList.rebuildFilterList();
			qList.RunFolder = aFolder;  // also refreshes buttons
		}
  
    // select found filter
    qList.selectFilter(targetFilter);
  } ,
  
  // similar to findDuplicates but goes across all accounts and looks for a filters acting on a particular folder
  // search results are able to select a different server and thus may not be reset by changing the server manually
  // initial implementation: see quickFilters.searchFiltersFromFolder()
  findFromTargetFolder: function findFromTargetFolder(targetFolder) {
    const util = quickFilters.Util;
    this.searchFilterResults = [];
    util.logDebug('findFromTargetFolder(' + targetFolder.prettyName + ')');
    
		util.findFromTargetFolder(targetFolder, this.searchFilterResults);
		
    util.logDebug('findFromTargetFolder(' + targetFolder.prettyName + ') COMPLETE \n' 
                                + this.searchFilterResults.length + ' matches found');
  } ,
	
  get currentAccountName() {
    const  Ci = Components.interfaces,
           accounts = Components.classes["@mozilla.org/messenger/account-manager;1"].
									  getService(Ci.nsIMsgAccountManager).accounts;
    let theMenu = this.ServerMenu, // document.getElementById("serverMenu"),
        menuEntry = theMenu.label,
        end = menuEntry.indexOf(' <');
		// should we cut off the mail address if it is part of the label?
    if (end>0)
      return menuEntry.substring(0, end);
    else
      return menuEntry;
  },
	
  fileFilters: function fileFilters(mode, jsonData, fname, isDateStamp) {
    // readData: this function does the actual work of interpreting the read data
    // and setting the UI values of currently selected deck accordingly:
    function readData(data) {
      function updateElement(el, stem, targetId) {
        // id target is common, append .id#, otherwise replace the .id#
        let oldId = targetId ? el.id.replace(targetId, stem) : el.id + stem,
            evt = document.createEvent("Events");
        // set element value (text / checkbox) from json data
        if (el.tagName == 'checkbox')
          el.checked = settings[oldId];
        else
          el.value = settings[oldId]; // textbox
        // force preference update
        evt.initEvent("change", true, false);
        el.dispatchEvent(evt);
      }
			let filterArray = [],
          filtersJSON = JSON.parse(data);
      // jsonData = the key
      // every identifier ends with id#; we need to replace the number with the current key!
      // or match the string up to .id!
			
			if (filtersJSON) {
				// filtersJSON = filtersJSON.replace(/\r?\n|\r/, ''); // remove all line breaks
				let entries = filtersJSON.filters; // JSON.parse(folders);
				for (let i = 0; i < entries.length; i++) {
					filterArray.push(entries[i]);
				}
			}
			
      if (prefs.isDebug) debugger;
			let iAdded = 0, 
					iReplaced = 0,
			    iFailure = 0,
			    filtersList = quickFilters.List.FilterList; // was this.FilterList
			// Merge or rebuild?
			// for account specific filter lists, see also searchFiltersFromFolder()
			for (let i = 0; i < filterArray.length; i++) {
				let el = filterArray[i];
				// create new filter list / filter
				// for the nitty-gritty, see also quickFilters.Worker.buildFilter
				let targetFilter = filtersList.createFilter(el.filterName);
				if (util.deserializeFilter(el, targetFilter)) {
					let bExists = false;
					// search existing filters for a matching filter with the same name:
					for (let j = 0; j< filtersList.filterCount; j++) {
						if (filtersList.getFilterAt(j).filterName == targetFilter.filterName) {
							bExists = true;
							// delete original
							util.logDebug ('deleting original filter at ' + j); 
							filtersList.removeFilterAt(j);
							util.logDebug ('replacing with imported filter... [ '+ targetFilter.filterName + ']'); 
							filtersList.insertFilterAt(j, targetFilter);
							iReplaced++;
							break;
						}
					}
					if (!bExists) {
						filtersList.insertFilterAt(iAdded, targetFilter);
						iAdded++;
					}
				}
				else {
					iFailure++;
					util.logToConsole("Could not deserialise Filter: " + el.filterName);
				}
			}
			let txt = "Filter Import complete.\n",
			    success = "Successfully added {0} filters.\n".replace("{0}", iAdded),
					replace = "Replaced {0} filters.\n".replace("{0}", iReplaced),
			    failure = "Failed to add {0} filters.\nFor details, please check Developer Tools / Error Console.".replace("{0}", iFailure),
					msg = txt +
					      (iAdded ? success : "") +
								(iReplaced ? replace : "") +
					      (iFailure ? failure : "");
			util.slideAlert(msg, "Filter Import");
			if (iAdded) {
				quickFilters.List.rebuildFilterList();
			}
    }
		function twoDigs(num) {
			if (num>=10) return num;
			return "0" + num.toString();
		}
		const Cc = Components.classes,
          Ci = Components.interfaces,
          util = quickFilters.Util,
					prefs = quickFilters.Preferences,
					NSIFILE = Ci.nsILocalFile || Ci.nsIFile;
		util.popupProFeature(mode + "_template", true); // save_template, load_template
					
    let filterText,    
		    fp = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker),
        fileOpenMode = (mode=='load') ? fp.modeOpen : fp.modeSave;
    
		let dPath = prefs.getStringPref('files.path');
		if (dPath) {
			let defaultPath = Cc["@mozilla.org/file/local;1"].createInstance(NSIFILE);
			defaultPath.initWithPath(dPath);
			if (defaultPath.exists()) { // avoid crashes if the folder has been deleted
				fp.displayDirectory = defaultPath; // nsILocalFile
				util.logDebug("Setting default path for filepicker: " + dPath);
			}
			else {
				util.logDebug("fileFilters()\nPath does not exist: " + dPath);
			}
		}
		fp.init(window, "", fileOpenMode); // second parameter: prompt
    filterText = util.getBundleString("quickfilters.fpJsonFile","JSON File");
    fp.appendFilter(filterText, "*.json");
    fp.defaultExtension = 'json';
    if (mode == 'save') {
			let fileName = fname;
			if (isDateStamp) {
				let d = new Date(),
				    timeStamp = d.getFullYear() + "-" + twoDigs(d.getMonth()+1) + "-" + twoDigs(d.getDate()) + "_" + twoDigs(d.getHours()) + "-" + twoDigs(d.getMinutes());
				fileName = fname + "_" + timeStamp;
			}
      fp.defaultString = fileName + '.json';
    }
    
    let fpCallback = function fpCallback_FilePicker(aResult) {
      if (aResult == Ci.nsIFilePicker.returnOK || aResult == Ci.nsIFilePicker.returnReplace) {
        if (fp.file) {
          let path = fp.file.path;
					// Store last Path 
					util.logDebug("File Picker Path: " + path);
					let lastSlash = path.lastIndexOf("/");
					if (lastSlash < 0) lastSlash = path.lastIndexOf("\\");
					let lastPath = path.substr(0, lastSlash);
					util.logDebug("Storing Path: " + lastPath);
					prefs.setStringPref('files.path', lastPath);
          
					const {OS} = (typeof ChromeUtils.import == "undefined") ?
						Components.utils.import("resource://gre/modules/osfile.jsm", {}) :
						ChromeUtils.import("resource://gre/modules/osfile.jsm", {});
          
          //localFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
          switch (mode) {
            case 'load':
              let promiseRead = OS.File.read(path, { encoding: "utf-8" }); //  returns Uint8Array
              promiseRead.then(
                function readSuccess(data) {
                  readData(data);
                },
                function readFailed(ex) {
                  util.logDebug ('read() - Failure: ' + ex); 
                }
              )
              break;
            case 'save':
              // if (aResult == Ci.nsIFilePicker.returnReplace)
              let promiseDelete = OS.File.remove(path);
              // defined 2 functions
              util.logDebug ('Setting up promise Delete');
              promiseDelete.then (
                function saveJSON() {
                  util.logDebug ('saveJSON()...'); 
                  // force appending correct file extension!
                  if (!path.toLowerCase().endsWith('.json'))
                    path += '.json';
                  let promiseWrite = OS.File.writeAtomic(path, jsonData, { encoding: "utf-8"});
                  promiseWrite.then(
                    function saveSuccess(byteCount) {
                      util.logDebug ('successfully saved ' + byteCount + ' bytes to file');
                    },
                    function saveReject(fileError) {  // OS.File.Error
                      util.logDebug ('bookmarks.save error:' + fileError);
                    }
                  );
                },
                function failDelete(fileError) {
                  util.logDebug ('OS.File.remove failed for reason:' + fileError); 
                }
              );
              break;
          }
        }
      }
    }
    
		if (fp.open)
			fp.open(fpCallback);		
    
    return true;    
  } ,
  
	
/*
nsresult nsMsgFilterList::SaveTextFilters(nsIOutputStream *aStream)
{
  uint32_t   filterCount = 0;
  nsresult   err = GetFilterCount(&filterCount);
  NS_ENSURE_SUCCESS(err, err);

  err = WriteIntAttr(nsIMsgFilterList::attribVersion, kFileVersion, aStream);
  NS_ENSURE_SUCCESS(err, err);
  err = WriteBoolAttr(nsIMsgFilterList::attribLogging, m_loggingEnabled, aStream);
  NS_ENSURE_SUCCESS(err, err);
  for (uint32_t i = 0; i < filterCount; i ++)
  {
    nsCOMPtr<nsIMsgFilter> filter;
    if (NS_SUCCEEDED(GetFilterAt(i, getter_AddRefs(filter))) && filter)
    {
      filter->SetFilterList(this);

      // if the filter is temporary, don't write it to disk
      bool isTemporary;
      err = filter->GetTemporary(&isTemporary);
      if (NS_SUCCEEDED(err) && !isTemporary) {
        err = filter->SaveToTextFile(aStream);
        if (NS_FAILED(err))
          break;
      }
    }
    else
      break;
  }
  if (NS_SUCCEEDED(err))
    m_arbitraryHeaders.Truncate();
  return err;
}
 */		
	
  store: function store() {
		// see nsMsgFilterList::SaveTextFilters(nsIOutputStream *aStream)
		// https://dxr.mozilla.org/comm-central/source/mailnews/base/search/src/nsMsgFilterList.cpp#867
		
		
    // let's get all the settings from the key and then put them in a json structure:
    const util = quickFilters.Util,
          settings = quickFilters.Settings,
					qfList = quickFilters.List; // this object
					
    let uri = this.ServerMenu.value,
		    folder = typeof gSelectedFolder == "string" 
				  ? gSelectedFolder   // global in Thunderbird FitlerListDialog.js
					: util.getMsgFolderFromUri(uri),
        filtersList = util.getFilterList(folder, gFilterListMsgWindow),
				filterCount = filtersList.filterCount;
				
		// get selected account info: see FilterListDialog.js setFilterFolder()
		// it sets gServerMenu._folder (was gCurrentFolder) and
		// gCurrentFilterList = msgFolder.getEditableFilterList(gFilterListMsgWindow);
		// date can be converted back with new Date(jsonDate);
		let	iSuccess = 0,
				iFail = 0,
				currentFolder = qfList.CurrentFolder,
		    filtersJSON = {
					accountName: this.ServerMenu.value,
					rootFolderURL: currentFolder.server.rootMsgFolder.folderURL,
					date: (new Date()).toJSON(),  
					filters: []
				};
		
		let customErrors = [];
		for (let i = 0; i < filterCount; i++) {
			let filter = filtersList.getFilterAt(i),
			    errs = [],
			    jsonAtom = util.serializeFilter(filter, errs),
			    fn = jsonAtom ? (jsonAtom.filterName || "[unnamed]") : "[serializeFilter failed]";
			while (errs.length) { customErrors.push(errs.pop()); }
		  if (jsonAtom) {
				iSuccess++;
				util.logDebug("# " + (i+1) + ". Added filter to JSON: " + fn)
				filtersJSON.filters.push(jsonAtom);
			}
			else {
				iFail++;
				util.logToConsole("# " + (i+1) + ". COULD NOT ADD filter: " + fn);
			}
		}
		if (customErrors.length) {
			let errList = "";
			for (let e=0; e<customErrors.length; e++) {
				errList += "[" + customErrors[e].name +"] " + customErrors[e].customId + "\n";
			}
			let txtAlert = 
			  util.getBundleString('quickfilters.backup.customErrors',
			    "The following filters had custom Actions which cannot be completely saved - a 3rd party Add-on may be missing:");
			util.alert (txtAlert + "\n" + errList);
		}
		
    const msgArchive = util.getBundleString('quickfilters.backup.archivingFilters', "Archiving {1} Filters" + String.fromCharCode(0x2026) ),
		      msgFailed = util.getBundleString('quickfilters.backup.failedFilters', "{1} filters could not be encoded! Please check the error log for detail.");
    let json = JSON.stringify(filtersJSON, null, '  '), // prettified with indentation
		    msg = msgArchive.replace('{1}', iSuccess);
		if (iFail) {
			msg += "\n" + msgFailed.replace('{1}', iFail);
		}
		util.slideAlert(msg, 'quickFilters');
    this.fileFilters('save', json, this.currentAccountName, true); // filename defaults to label of server
		if (iFail)
			util.alert(msg);
  } ,
  
  load: function load() {
    this.fileFilters('load');  // , {key: this.currentId} - do we need to transmit selected account info?
  } ,
	
  // troubleshooter - generates error list(s)
	checkErrors: function checkFilterErrors() {
    const util = quickFilters.Util,
          settings = quickFilters.Settings,
					ff = util.FolderFlags,
					nsMsgFilterType = Ci.nsMsgFilterType,
					FA = Ci.nsMsgFilterAction,
          prefs = quickFilters.Preferences;
		let qfList = quickFilters.List, // this object
				filtersList = this.FilterList,
				sourceFolder = quickFilters.Shim.findInboxFromRoot(filtersList.folder, ff),
				errorList = [],
				isInbox=false, isNewsgroup=false;
        
    function isEnabled(troubleshootWhat) {
      return prefs.getBoolPref("troubleshoot." + troubleshootWhat);
    }
		
		if(sourceFolder){
			isInbox = sourceFolder.getFlag(ff.Inbox);
			isNewsgroup = sourceFolder.getFlag(ff.Newsgroup);
		}
		else {
			// is this a Local folders account? Set inbox flag anyway.
			isInbox = (filtersList.folder.username == 'nobody');
		}
				
		for (let i = 0; i < filtersList.filterCount; i++) {
			let filter = filtersList.getFilterAt(i),
			    incomingFaulty = false;
			// Incoming = InboxRule | InboxJavaScript | NewsRule | NewsJavaScript
			
			// Test 1: can filter autorun?
      if (isEnabled('incomingFlag')) {
        if (isInbox || isNewsgroup) {
          // We probably should omit disabled filters!!
          incomingFaulty = ((filter.filterType & nsMsgFilterType.Incoming)==0);
        }
        if (incomingFaulty) {
          errorList.push ( { index:i, flt:filter, type: 'incoming'} );
        }
      }
			
      
      let actionCount = util.getActionCount(filter);
      for (let a = 0; a < actionCount; a++) {
        let ac = filter.getActionAt(a).QueryInterface(Components.interfaces.nsIMsgRuleAction);
        // Test 2: invalid target folder
        if (isEnabled('invalidTargetFolder')) {
          if (ac.type==FA.MoveToFolder || ac.type==FA.CopyToFolder) {
            // check url
            let fld = util.getMsgFolderFromUri(ac.targetFolderUri, true); // check if it exists
            if (fld==null) {
              errorList.push ( { index:i, flt:filter, type: 'folderUri'} );
            }
          }
        }
        // Test 3: invalid  custom Actions
        if (ac.type == FA.Custom && isEnabled('customActions')) {  // -1
          let isError = false;
          try { 
            let customAction = ac.customAction;
            if (!customAction) isError=true;
          }
          catch(ex) {
            isError=true;
          }
          if (isError) {
            util.logDebug("Missing custom action in filter [" + filter.filterName + "]: " + ac.customId);
            errorList.push ( { index:i, flt:filter, type: 'customAction'} );
          }
        }
			}
      
      // Test 4. check for mixed booleanAnd properties:
      if (isEnabled('mixedAnyAndAll')) {
        let TargetTerms = util.querySearchTermsArray(filter.searchTerms),
            theCount = TargetTerms ? util.querySearchTermsLength(TargetTerms) : 0,
            targetBoolean = theCount ? util.querySearchTermsAt(TargetTerms, 0).booleanAnd : null,
            fixedConditions = 0;
        for (let t = 0; t < theCount; t++) {
          let searchTerm = util.querySearchTermsAt(TargetTerms, t);
          if (searchTerm.booleanAnd != targetBoolean) {
            fixedConditions++;
          }
        }
        if (fixedConditions) {
          let el = { index:i, 
                     flt:filter, 
                     type: 'mixedAnyAndAll',
                     booleanAnd: targetBoolean, 
                     conditionCount: fixedConditions
                   } 
          errorList.push (el);
        }
        if (!theCount) {
          let el = { index:i, 
                     flt:filter, 
                     type: 'missingSearchTerms',
                     booleanAnd: targetBoolean, 
                     conditionCount: 0
                   } 
          errorList.push (el);
        }
      }
      
      
		}
		if (errorList.length) 
			document.getElementById('quickFiltersTroubleshoot').classList.add("faulty");
		else 
			document.getElementById('quickFiltersTroubleshoot').classList.remove("faulty");
		return errorList;
	} ,
	
	troubleshoot: function troubleshootFilterList() {
		// go through list and check for flags InboxRule / InboxRuleJavaScript / NewsRule / NewsRuleJavascript
    const util = quickFilters.Util,
          settings = quickFilters.Settings,
					nsMsgFilterType = Ci.nsMsgFilterType,
					qfList = quickFilters.List, // this object
					ff = util.FolderFlags,
					filtersList = this.FilterList;
		
		// return a list of affected filters, formatted for a messagebox
		function makeNameList(errList) {
			let names = "",
			    line = 0, 
					start = 0;
			for (let i=0; i<errList.length; i++) {
				if (start) names += ", ";
				names += errList[i].flt.filterName ;
				let lines = Math.floor(names.length / 70); // make a new line?
				if (lines>line) {
					names += "\n";
					line++;
					start=0;
				}
				else start++;
			}
			return names;
		}
					
		if (typeof ChromeUtils.import == "undefined")
			Components.utils.import("resource://gre/modules/Services.jsm");
		else
			var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
    const PromptService = Services.prompt,
          flags = (PromptService.BUTTON_POS_0 * PromptService.BUTTON_TITLE_YES) +
                  (PromptService.BUTTON_POS_1 * PromptService.BUTTON_TITLE_NO);


		let sourceFolder = quickFilters.Shim.findInboxFromRoot(filtersList.folder, ff),
				isInbox=false, isNewsgroup=false; // flag setters
					
		if (sourceFolder) {
			isInbox = sourceFolder.getFlag(ff.Inbox);
			isNewsgroup = sourceFolder.getFlag(ff.Newsgroup);
		}
		else {
			// local folder
			isInbox = (filtersList.folder.username == 'nobody');
		}
    
		let errorList = qfList.checkErrors(),
		    errorsIncoming = errorList.filter(el => el.type == 'incoming'),
				errorsURI = errorList.filter(el => el.type == 'folderUri'),
				errorsCustomAction = errorList.filter(el => el.type == 'customAction'),
        errorsAnyAndAll = errorList.filter(el => el.type == 'mixedAnyAndAll'),
        errorsNoSearchTerms = errorList.filter(el => el.type == 'missingSearchTerms');
		
		// ==== INVALID Incoming flag  ====
		if (errorsIncoming.length) {
			let question = util.getBundleString('quickfilters.debug.fixFilters', 
				  "Found {0} filters that should have Incoming flag set."
					+ " These will potentially not run during get mail. Fix these?"),
					names =  makeNameList(errorsIncoming),
			    ask = question.replace("{0}",errorsIncoming.length) + "\n";
					
			util.logDebug(ask + names);
			
      // 0=Yes, 1=No
			if (0 == PromptService.confirmEx(null, "quickFilters", ask + names, flags, null, null, null, null, {})) {
				let filtersList = this.FilterList,
				    err, 
            countFixed=0;
        // start fixing the list...
				while (errorsIncoming.length) {
					err = errorsIncoming.pop();
					let filter = filtersList.getFilterAt(err.index);
          
          util.logDebug("Fixing Filter[" + err.index + "] INCOMING FLAG: " + filter.filterName);
          if (isInbox)
            filter.filterType = filter.filterType | nsMsgFilterType.InboxRule;
          if (isNewsgroup)
            filter.filterType = filter.filterType | nsMsgFilterType.NewsRule;
          countFixed++;
				}
				// store changes
				qfList.rebuildFilterList();
				document.getElementById('quickFiltersTroubleshoot').classList.remove("faulty");
				// show result
				// but do not show list of names as they don't wrap nicely in notification panel.
        if (countFixed)
          util.popupAlert(
            util.getBundleString('quickfilters.debug.fixFilters.result','{0} filters were fixed.').replace('{0}',countFixed),
            "quickFilters", "debug-success.png", 0
          );
			}
		}

    if (errorsAnyAndAll.length) {
      let question = util.getBundleString('quickfilters.debug.fixFilters.AnyAll', 
				  "Found conditions mixing 'Any' / 'All' - these may not work as intended. Should I fix these?"),
          names = makeNameList(errorsAnyAndAll);
      // 0=Yes, 1=No
			if (0 == PromptService.confirmEx(null, "quickFilters", question + '\n' + names, flags, null, null, null, null, {})) {
        // to do - fix any and all mixes
        let countFixed = 0;
				while (errorsAnyAndAll.length) {
					let err = errorsAnyAndAll.pop(),
					    filter = filtersList.getFilterAt(err.index);
          util.logDebug("Fixing Filter[" + err.index + "] MIXED ANY/ALL CONDITIONS: " + filter.filterName);
          
          let TargetTerms = util.querySearchTermsArray(filter.searchTerms),
              theCount = util.querySearchTermsLength(TargetTerms),
              targetBoolean = theCount ? util.querySearchTermsAt(TargetTerms, 0).booleanAnd : false;
          for (let t = 0; t < theCount; t++) {
            let searchTerm = util.querySearchTermsAt(TargetTerms, t);
            if (searchTerm.booleanAnd != targetBoolean) {
              searchTerm.booleanAnd = targetBoolean;
              util.logDebug("Changing condition[" + t  + "] - booleanAnd = " + targetBoolean);
            }
          }
          countFixed++;
				}
        
        if (countFixed) {
          util.popupAlert(
            util.getBundleString('quickfilters.debug.fixFilters.result','{0} filters were fixed.').replace('{0}',countFixed),
            "quickFilters", "debug-success.png", 0
          );        
          // store changes
          qfList.rebuildFilterList();
          document.getElementById('quickFiltersTroubleshoot').classList.remove("faulty");
        }
        
      }
    }
    
    if (errorsNoSearchTerms.length) {
      let question = "Some filters have no search terms - you should delete these:",
          names = makeNameList(errorsNoSearchTerms);
      PromptService.alert(null, "quickFilters", question + "\n" + names);
    }
    
		// ==== INVALID target URIs  ====
		if (errorsURI.length) {
			let question = util.getBundleString('quickfilters.debug.fixFilters.invalidUris', 
						"Found {0} filters with invalid folder targets." 
						+ " These may have been imported from non-matching profile? Or the target folder doesn't exist anymore or was moved."),
					names = makeNameList(errorsURI),
			    ask = question.replace("{0}", errorsURI.length) + "\n";
			
			util.logDebug(ask + names);
			PromptService.alert(null, "quickFilters", ask + '\n' + names);
		}    
    
		// ==== MISSING custom actions  ====
		if (errorsCustomAction.length) {
			let question = util.getBundleString('quickfilters.debug.fixFilters.customActionErrors', 
						"Found {0} filters with unresolved custom actions. "
						+ "You may be missing a third party Add-on or need to configure it to support custom actions."),
					names = makeNameList(errorsCustomAction),
			    ask = question.replace("{0}", errorsCustomAction.length) + "\n";
					
			PromptService.alert(null, "quickFilters", ask + '\n' + names);
		}
        
		
		if (!errorList.length) {
				util.popupAlert(
				  util.getBundleString('quickfilters.debug.fixFilters.none',"No faulty filters found."),
					"quickFilters", "debug-success.png", 0
				);
			util.logDebug();
			document.getElementById('quickFiltersTroubleshoot').classList.remove("faulty");
		}
		
	} ,
  
  configureTroubleshooter: function configureTroubleshooter(el) {
    quickFilters.Util.showAboutConfig(el, 'quickfilters.troubleshoot', true);
  } ,
  
  setAssistantButton: function(active) {
    let button = document.getElementById('quickFiltersBtnStart');
    button.checked = active;
  } ,
  
  dummy: function() {
		/* 
		 *
		 *  END OF QUICKFILTERS.LIST OBJECT
		 *  ADD NEW ATTRIBUTES ON TOP  ^ ^ ^ 
		 *  ================================================================
		 *  ================================================================
		 */
	}  
}; // quickFilters.List
