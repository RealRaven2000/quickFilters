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
quickFilters.List = {
  eventsAreHooked: false ,
	clipboardList: [] , // a 'fale' clipboard for copying / pasting filters across accounts.
	clipboardServer: null,
	clipboardPending: '',

  // FILTER LIST DIALOG FUNCTIONS
  getFilterListElement: function()
  {
    var el = document.getElementById("filterList");
    if (!el)
      el = document.getElementById("filterTree");
    return el;
  } ,

  getSelectedFilterAt: function(list, i)
  {
    if (typeof list.selectedItems !== "undefined")
      return list.selectedItems[i]._filter;  // Thunderbird

    // SeaMonkey uses a tree view - there can be multiple ranges selected
    let start = new Object();
    let end = new Object();
    let numRanges = list.view.selection.getRangeCount();
    let current = 0; // counting index to find nth item
    let targetIndex = 0;

    // allow multiple range selection - find the nth item and return its real index
    for (var t = 0; t < numRanges; t++){
      list.view.selection.getRangeAt(t,start,end);
      for (var v = start.value; v <= end.value; v++){
        if (i == current) {
          targetIndex = v;
          break;
        }
        current++;
      }
      if (i == current)
        break;
    }

    // return list.view.getFilterAt(start.value);
    return getFilter(targetIndex); // defined in FilterListDialog.js (SM only)
  } ,

  getSelectedCount: function(list)
  {
    if (typeof list.selectedItems !== "undefined")
      return list.selectedItems.length;
    return list.view.selection.count;
  } ,
  
  merge: function (evt, isEvokedFromButton)
  {
    function copyTerms(fromFilter, toFilter) {
      let stCollection = fromFilter.searchTerms.QueryInterface(Components.interfaces.nsICollection);
      for (let t = 0; t < stCollection.Count(); t++) {
        let searchTerm = stCollection.GetElementAt(t);
        toFilter.appendTerm(searchTerm);
      }
    }
    let params = { answer: null, selectedMergedFilterIndex: -1, cmd: 'mergeList' };
    let filtersList = this.getFilterList(); // Tb / SM
    let sourceFolder = filtersList.folder;
    let list = this.getFilterListElement();
    if (this.getSelectedCount(list) < 2) {
			let wrn = quickFilters.Util.getBundleString('quickfilters.merge.warning.selectMultiple', 
                                              'To merge, select at least 2 filters');
      quickFilters.Util.popupAlert(wrn);
      return;
    } 
    // see qFilters-worker line 471
    // we can clone a new nsIMsgFilterList that has matching target folders.
    let matchingFilters = [];
    let action = 0;
    let deselectUnmatched = false;
    let filterMatch;
    let count = this.getSelectedCount(list);
		let firstSelectedFilter = this.getSelectedFilterAt(list, 0);
		if (!firstSelectedFilter) {
			let wrn = quickFilters.Util.getBundleString('quickfilters.merge.warning.selectMultiple2',
				          'Cannot determine first selected filter - to merge, you must select at least 2 filters!');
			quickFilters.Util.popupAlert(wrn);
			return;
		}
		let primaryAction;
    let primaryName = firstSelectedFilter.filterName;
		try {
			primaryAction = firstSelectedFilter.getActionAt(0);
		}
		catch(ex) {
			let wrn = quickFilters.Util.getBundleString('quickfilters.merge.warning.missingAction',
				          'Could not get the main action of the filter: {1}');
		  wrn.replace ('{1}', primaryName);
			quickFilters.Util.popupAlert(wrn + '\n' + ex.toString());
		}
    action = primaryAction;
    let FA = Components.interfaces.nsMsgFilterAction;
		let failedFilters = '';
    for (let f = this.getSelectedCount(list)-1; f >=0 ; f--)
    {
      filterMatch = true;
      let aFilter = this.getSelectedFilterAt(list, f);  // nsIMsgFilter 
      // match the first action only
      // nsMsgFilterAction.MarkFlagged
      // nsMsgFilterAction.MoveToFolder
      // nsMsgFilterAction.AddTag
      // nsMsgFilterAction.ChangePriority
			try {
				action = aFilter.getActionAt(0);
			}
			catch(ex)  {
				failedFilters = failedFilters + ', ' + aFilter.filterName;
				filterMatch = false;
			}
      if (filterMatch && primaryAction && primaryAction.type != action.type) {
        filterMatch = false;
      }
      else {
        // here, we need to create a switch statement, to accommodate different action types
        switch(primaryAction.type) {
          case FA.MoveToFolder:
            if (primaryAction.targetFolderUri != action.targetFolderUri) 
              filterMatch = false;
            break;
          case FA.AddTag:
            if (primaryAction.strValue !=  action.strValue)
              filterMatch = false;
            break;
          case FA.MarkFlagged:
            break;
          case FA.ChangePriority:
            if (primaryAction.priority !=  action.priority)
              filterMatch = false;
            break;
        }
      }
      if (!filterMatch && !deselectUnmatched) {
        let question = quickFilters.Util.getBundleString('quickfilters.merge.warning.selectMismatch',
                                                         'Cannot merge all selected filters: action mismatch with filter {1}!')
                      + '\n'
                      + quickFilters.Util.getBundleString('quickfilters.merge.warning.selectMismatchContinue',
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
        matchingFilters.push(aFilter);  
      }
      else {
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
    var win = window.openDialog('chrome://quickfilters/content/filterTemplate.xul',
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
    let mergeFilterIndex = params.selectedMergedFilterIndex;
    let isMerge = false;
    let targetFilter;

    // user has selected a template
    var template = quickFilters.Preferences.getCurrentFilterTemplate();
    if (mergeFilterIndex >= 0) {
      targetFilter = matchingFilters[mergeFilterIndex];
      isMerge = true;
    }
    else {
			let wrn =quickFilters.Util.getBundleString('quickfilters.merge.warning.selectTarget',
                                                 'A target filter must be selected for merging!')
      quickFilters.Util.popupAlert(wrn);
			return;
    }

    // 1. create a new filter and copy actions of target filter
    let newName = targetFilter.filterName;
    if (newName.indexOf(' +m') == -1)
      newName = newName + " +m";
    let newFilter = filtersList.createFilter(newName);
    let aList = [];
    let actions = targetFilter.actionList ? targetFilter.actionList : targetFilter.sortedActionList; // Tb : Sm
		if (targetFilter.actionList) {
		  // Thunderbird
			let aCollection = actions.QueryInterface(Components.interfaces.nsICollection);
			// targetFilter.getSortedActionList(aList);
			for (let a = 0; a < aCollection.Count(); a++)
				newFilter.appendAction(aCollection.GetElementAt(a));
		}
		else {
			// SeaMonkey - a simple nsIArray - we get an enumerator 
			let enumerator = actions.enumerate();
			while (enumerator.hasMoreElements()) {
				let ac = enumerator.getNext();
				newFilter.appendAction(ac);
			}
		}

    // 2. now copy the filter search terms of the filters in the array to the new filter
    // then delete the other filters
    // 2a - copy TargetFilter first
    copyTerms(targetFilter, newFilter);
    for (let i = 0 ; i < matchingFilters.length ; i++) {
      let current = matchingFilters[i];
      // copy filter
      if (targetFilter == current)
        continue;
      copyTerms(current, newFilter);
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
    window.openDialog("chrome://messenger/content/FilterEditor.xul", "",
                      "chrome, modal, resizable,centerscreen,dialog=yes", args);

    // If the user hits ok in the filterEditor dialog we set args.refresh=true
    // we also need to remove all old filters that have been merged into the new one.
    if ("refresh" in args && args.refresh)
    {
      quickFilters.Worker.openFilterList(true, sourceFolder);
      // 4. insert the merged filter
      quickFilters.Util.logDebug("Adding new Filter '" + newFilter.filterName + "' "
           + ": current list has: " + filtersList.filterCount + " items");
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
      this.rebuildFilterList();
    }
    
  } ,
	
	get CurrentFolder() {
	  if (typeof gCurrentFolder !== "undefined") {
			return gCurrentFolder ; // Tb
		}
		// from: SM's setServer(uri) function
		let resource = gRDF.GetResource(gCurrentServerURI);
		let folder = resource.QueryInterface(Components.interfaces.nsIMsgFolder);
		return folder; // Suite
	},
	
	pushSelectedToClipboard: function(type) {
		let list = this.getFilterListElement();
		if (this.getSelectedCount(list) < 1) {
			let wrn = quickFilters.Util.getBundleString('quickfilters.copy.warning.selectFilter', 'Please select at least one filter!');
			quickFilters.Util.popupAlert(wrn, "quickFilters", 'fugue-clipboard-exclamation.png');
			return false;
		}
		this.clipboardList.splice(0); // discard old list
		this.clipboardServer = this.CurrentFolder; // original account when copying to clipboard!
    for (let f = this.getSelectedCount(list)-1; f >=0 ; f--)
    {
      let aFilter = this.getSelectedFilterAt(list, f);  // nsIMsgFilter 
			this.clipboardList.push(aFilter);  
    }
		// let's style the affected items for visual feedback...
	  try {
			this.resetClipboardStylings();
			if (typeof list.selectedItems !== "undefined") {
				for(let i=0; i<list.selectedItems.length; i++) {
					switch(type) {
						case 'cut':
							list.selectedItems[i].setAttribute("class", "quickFiltersCut");
							break;
						case 'copy':
							list.selectedItems[i].setAttribute("class", "quickFiltersCopy");
							break;
					}
					list.selectedItems[i].firstChild.setAttribute("class", "listcell-iconic");
				}
			}
		}
		catch(ex) {
      quickFilters.Util.logException('pushSelectedToClipboard - during marking as copied/cut', ex);
		}
		
		return true;
	},
	
	cutFilters: function() {
		if (this.pushSelectedToClipboard('cut')) {
			this.clipboardPending='cut';
		}
	},
	
	copyFilters: function() {
		if (this.pushSelectedToClipboard('copy')) {
			this.clipboardPending='copy';
		}
	},
	
	pasteFilters: function() {
		let Ci = Components.interfaces;
		let clpFilters = this.clipboardList;
		let isInsert = false;
		let isRemove = false;
		try {
			if (clpFilters.length < 1) {
				let wrn = quickFilters.Util.getBundleString('quickfilters.copy.warning.emptyClipboard',
				  'No filters in clipboard!');
				quickFilters.Util.popupAlert(wrn, 'quickFilters', 'fugue-clipboard-exclamation.png');
				return;
			}
			if (this.clipboardServer == this.CurrentFolder)  {
				let wrn = quickFilters.Util.getBundleString('quickfilters.copy.warning.selectOtherAccount',
				  'Select a different account for pasting items!');
				quickFilters.Util.popupAlert(wrn, 'quickFilters', 'fugue-clipboard-exclamation.png');
				return;
			}
			if (!this.clipboardServer.server.canHaveFilters) {
				let msg = quickFilters.Util.getBundleString('quickfilters.createFilter.warning.canNotHaveFilters',
					'The account {1} does not support filters!');
				quickFilters.Util.popupAlert(msg.replace('{1}', this.clipboardServer.prettyName), 
				                             'quickFilters', 'fugue-clipboard-exclamation.png');
				return;
			}
			// let acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
													// .getService(Ci.nsIMsgAccountManager);
			// let accounts = acctMgr.accounts;
			// // make sure current account is different from clipboard!
			// for (let i = 0; i < accounts.Count(); i++) {
				
			// }
			
			switch(this.clipboardPending) {
				case 'cut':
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
			let list = this.getFilterListElement();		
			let index = list.selectedIndex;
			if (index<0) 
				index = list.itemCount;

			let filtersList = this.getFilterList()
			// 1. paste new filters in account
			if (isInsert) {
				// insert, in order, at cursor or append to end if no target filter selected.
				for (let i = 0; i < clpFilters.length; i++) {
					let filter = clpFilters[i].QueryInterface(Ci.nsIMsgFilter);
					filtersList.insertFilterAt(index++, filter); 
				}
			}
			if (isRemove) {
				// cut payload:
				let sourceFolder = this.clipboardServer.rootFolder;
				if (quickFilters.Util.Application === 'Postbox') {
					// mailWindowOverlay.js:1790
					filtersList = sourceFolder.getFilterList(gFilterListMsgWindow);
				}
				else {
					filtersList = sourceFolder.getEditableFilterList(gFilterListMsgWindow);
				}
				
				for (let i = 0; i < clpFilters.length; i++) {
					let current = clpFilters[i];
					for (index = filtersList.filterCount-1; index >= 0; index--) {
						if (current == filtersList.getFilterAt(index)){
							filtersList.removeFilterAt(index);
							break;
						}
					}
				}	
				
			}
		}
		catch (ex) {
      quickFilters.Util.logException('Exception during paste filter; aborting. ', ex);
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
		this.clipboardPending = ''; // reset copy/cut mode.
		this.rebuildFilterList();
		//	let serverMenu = document.getElementById('serverMenu');
			// suite:
		//	let uri = serverMenu.getAttribute('uri');
		//	let label = serverMenu.getAttribute('label');
		
	},

  onTop : function (evt)
  {
    let filtersList = this.getFilterList(); // Tb / SM
    let list = this.getFilterListElement();
    try {
      if (this.getSelectedCount(list) != 1) {
				let wrn = quickFilters.Util.getBundleString('quickfilters.move.selectOne', 'Exactly one filter entry must be selected!');
				quickFilters.Util.popupAlert(wrn);
        return;
      }
      var activeFilter = this.getSelectedFilterAt(list, 0);
      if (activeFilter) {
        filtersList.removeFilter(activeFilter);
        filtersList.insertFilterAt(0, activeFilter);
        this.rebuildFilterList();  // not on SM?
        // SM
        if (list.view) {
          list.view.selection.clearSelection();  // Pb: gFilterTree
          list.view.selection.select(0);
          list.focus();
        }
        else
          this.onFindFilter(false);

        document.getElementById("quickFilters-reorderButtonTop").disabled=true;
      }
    }
    catch(ex) {
      quickFilters.Util.logException('Exception while moving filter to top: ', ex);
    }
  } ,

  onBottom : function (evt)
  {
    let filtersList = this.getFilterList();
    let list =this.getFilterListElement();
    try {
      if (this.getSelectedCount(list) != 1) {
        let wrn = quickFilters.Util.getBundleString('quickfilters.move.selectOne', 'Exactly one filter entry must be selected!');
				quickFilters.Util.popupAlert(wrn);
        return;
      }
      var activeFilter = this.getSelectedFilterAt(list, 0);
      if (activeFilter) {
        filtersList.removeFilter(activeFilter);
        filtersList.insertFilterAt(filtersList.filterCount, activeFilter); // rolled back :P
        this.rebuildFilterList();
        // SM
        if (list.view) {
          list.view.selection.clearSelection();  // Pb: gFilterTree
          list.view.selection.select(filtersList.filterCount-1);
          list.focus();
        }
        else
          this.onFindFilter(false);

        document.getElementById("quickFilters-reorderButtonBottom").disabled=true;
      }
    }
    catch(ex) {
      quickFilters.Util.logException('Exception while moving filter to bottom: ', ex);
    }
  } ,

  onUp: function(event) {
    let searchBox = document.getElementById("quickFilters-Search");
    if (searchBox.value) {
      var filtersList = this.getFilterList(); // Tb / SM
      var list = this.getFilterListElement();
      if (this.getSelectedCount(list) != 1)
        return;

      var activeFilter = this.getSelectedFilterAt(list, 0);
      if (activeFilter) try {
        var nextIndex = list.selectedIndex-1;
        var nextFilter = list.getItemAtIndex(nextIndex)._filter;
        this.rebuildFilterList();

        // assumption: item stays selected even after removing the search condition
        var newIndex = list.selectedIndex-1;
        filtersList.removeFilter(activeFilter);

        // insert before next visible item
        // go up from selected index until finding the correct filter name
        while (nextFilter.filterName!=list.getItemAtIndex(newIndex)._filter.filterName && nextIndex<list.itemCount)
          newIndex--;
        filtersList.insertFilterAt(newIndex, activeFilter);
        this.rebuildFilterList();
        list.selectedIndex = newIndex;

      }
      catch (ex) {
        quickFilters.Util.logException('quickFilters.List.onDown: ', ex);
      }
      this.onFindFilter(false);
    }
    else
      moveCurrentFilter(Components.interfaces.nsMsgFilterMotion.up);
  } ,

  onDown: function(event) {
    let searchBox = document.getElementById("quickFilters-Search");
    if (searchBox.value) {
      var filtersList = this.getFilterList(); // Tb / SM
      var list = this.getFilterListElement();
      if (this.getSelectedCount(list) != 1)
        return;

      var activeFilter = this.getSelectedFilterAt(list, 0);
      if (activeFilter) try {
        var nextIndex = list.selectedIndex+1;
        var nextFilter = list.getItemAtIndex(nextIndex)._filter;
        this.rebuildFilterList();

        // assumption: item stays selected even after removing the search condition
        var newIndex = list.selectedIndex+1;
        filtersList.removeFilter(activeFilter);


        // insert after next visible item
        // go down from selected index until finding the correct filter name
        while (nextFilter.filterName!=list.getItemAtIndex(newIndex)._filter.filterName && nextIndex<list.itemCount)
          newIndex++;
        filtersList.insertFilterAt(newIndex, activeFilter);
        this.rebuildFilterList();
        list.selectedIndex = newIndex;

      }
      catch (ex) {
        quickFilters.Util.logException('quickFilters.List.onDown: ', ex);
      }
      this.onFindFilter(false);
    }
    else
      moveCurrentFilter(Components.interfaces.nsMsgFilterMotion.down);
  } ,

  getListElementCount: function (list) {
    if (typeof list.getRowCount !== "undefined")
      return list.getRowCount();
    return list.view.rowCount; // SM: treeview
  } ,

  // remove any icons that were added as part of copy or cut functions
  resetClipboardStylings: function() {
		quickFilters.Util.logDebugOptional("clipboard", "resetClipboardStylings()");
		let list = this.getFilterListElement();
		let ct = list.children.length;
	  for (let i = 0; i<ct; i++) {
			let cl = list.children[i].getAttribute('class');
			if (cl.indexOf('quickFilters')>=0) {
				cl = cl.replace('quickFiltersCut', '').replace('quickFiltersCopy', '');
				list.children[i].setAttribute('class', cl);
			}
			
		}
	} ,
	
	onSelectServer: function() {
		quickFilters.Util.logDebugOptional("clipboard", "onSelectServer()");
		this.resetClipboardStylings();
	} ,
	
	onSelectFilter : function (evt) {
    let list = this.getFilterListElement();
    let numFiltersSelected = this.getSelectedCount(list);
    let oneFilterSelected = (numFiltersSelected === 1);
    let buttonTop = document.getElementById("quickFilters-reorderButtonTop");
    let buttonBottom = document.getElementById("quickFilters-reorderButtonBottom");
    let upDisabled = !(oneFilterSelected &&
                       this.getSelectedFilterAt(list, 0) != list.childNodes[1]);
    if (list.currentIndex === 0) // SM
      upDisabled = true;
    buttonTop.disabled = upDisabled;
    let downDisabled = (!oneFilterSelected
        || list.currentIndex === this.getListElementCount(list)-1);
    buttonBottom.disabled = downDisabled;
  } ,

  onLoadFilterList: function(evt)
  {
    function removeElement(el) {
      el.collapsed = true;
    }
    function formatListLabel(el) {
      if (el) {
        el.setAttribute('crop','end');
        el.minwidth = 15;
      }
    }
		// Toolbar
		let toolbox = document.getElementById("quickfilters-toolbox");
		let hbs = document.getElementsByTagName(
		    (quickFilters.Util.Application == 'Thunderbird')
			? 'hbox'
		  : 'grid');  // SM + Postbox
		let isToolbar = false;
		if (!quickFilters.Preferences.getBoolPrefQF("toolbar")) {
		  toolbox.parentNode.removeChild(toolbox);
		}
		else if (hbs && toolbar) { // move toolbox up
		  let hbox = hbs[0];
			hbox.parentNode.insertBefore(toolbox, hbox);
			isToolbar = true;
			let win = quickFilters.Util.getMail3PaneWindow();
			if (win.quickFilters.Worker.FilterMode) {
				let button = document.getElementById('quickFiltersBtnStart');
				button.checked = true;			
			}
		}
		
		
		// add event listener for changing account
    let dropDown = document.getElementById("serverMenu");
		if (dropDown) {
			quickFilters.Util.logDebugOptional("clipboard", "Server dropdown event listener");
			dropDown.addEventListener("command", 
				function(e) { quickFilters.List.onSelectServer();},
				false);
		}
		
		// attach context menu.
		let filterList = this.getFilterListElement();
		filterList.setAttribute('context','quickFiltersContext');

    // check whether [Bug 450302] has landed
    let nativeSearchBox = document.getElementById("searchBox");
    // check whether QuickFolder_s already does these modifications
    let quickFolderSearchBox = document.getElementById("qf-Filter");
    //move buttons to the correct place
    var buttonBottom = document.getElementById("quickFilters-reorderButtonBottom");
    var buttonTop = document.getElementById("quickFilters-reorderButtonTop");
    var down = document.getElementById("reorderDownButton");
    var up = document.getElementById("reorderUpButton");
    var searchBox = document.getElementById("quickFilters-Search");
    var countBox = document.getElementById("quickFilters-Count");
    var mergeButton = document.getElementById("quickFilters-mergeButton");
    if (mergeButton) {
		  if (isToolbar)
				mergeButton.parentNode.removeChild(mergeButton); // remove unneccessary button
			else
				down.parentNode.insertBefore(mergeButton, document.getElementById("deleteButton").nextSibling);
    }
    
    if (nativeSearchBox || quickFolderSearchBox) {
      // once [Bug 450302] has landed, we do not need to add this functionality ourselves :)
      // also same functionality is provided by QuickFolder_s already, so no need to do it from here
      removeElement(buttonTop);
      removeElement(buttonBottom);
      removeElement(searchBox);
      removeElement(countBox);
      // in this case, this id should be assigned already by the bugfix
      formatListLabel(document.getElementById("filterListLabel"));
      return;
    }
    // DOMi ugliness.
    if (up){
      up.parentNode.insertBefore(buttonTop, up);
    }
    if (down){
      down.parentNode.insertBefore(buttonBottom, down.nextSibling);
    }
		
    // overwrite handlers for moving filters while search is active
    // add additional listener for the filter list to select event
    filterList = this.getFilterListElement();
    if (filterList) {
      filterList.addEventListener("select",
        function(e) { quickFilters.List.onSelectFilter(e);},
        false);
      // make sure to disable the correct buttons on dialog load
      // the delay times are picked somewhat arbitrarily, sorry.
      window.setTimeout(function() {quickFilters.List.onSelectFilter(null);}, 250);
			// add a context menu:

      // Update filter counts after new and delete:
      // removed DOM_NodeInserted events and chose some monkey patching instead.
      if (!quickFilters.List.eventsAreHooked) {
        let theOnNew = onNewFilter;
        if (theOnNew) {
          onNewFilter = function() {
            theOnNew(arguments);
            try {
              quickFilters.List.updateCountBox();
            }
            catch(e) {
              if (quickFilters && quickFilters.Util)
                quickFilters.Util.logException('onNewFilter - ',e);
            }
          }
        }
        let theOnDelete = onDeleteFilter;
        if (theOnDelete) {
          onDeleteFilter = function() {
            theOnDelete(arguments);
            try {
              quickFilters.List.updateCountBox();
            }
            catch(e) {
              if (quickFilters && quickFilters.Util)
                quickFilters.Util.logException('onDeleteFilter - ',e);
            }
          }
        }
        quickFilters.List.eventsAreHooked = true; // avoid multiple hooking.
      }

    }

    // the following changes to the dialog layout are fairly fundamental, but they follow the (UI-reviewed)
    // modifications in  [Bug 450302].
    // 1. [Run Now] is relocated to the bottom, between filter target drop down and Filter Log.
    //    there is a certain functional logic to this order
    // 2. The search {filters} box is inserted to the right of the servers dropdown.
    //    Again this makes sense as both elements cause the list contents to change.
    // 3. An item count is appended to the right of the list description label
    //    TO DO: description should be collapsible in favor of item count.
    if (quickFilters.Util.Application === 'Thunderbird') {
      // move the search filter box
      let dropDown = document.getElementById("serverMenu");

      dropDown.parentNode.insertBefore(searchBox, dropDown.nextSibling);
      dropDown.addEventListener("command", function(e) { window.setTimeout(function() {quickFilters.List.onFindFilter(false);}, 50); }, false);

      // create a container that holds list label and count...
      // more DOMi ugliness...
      let rowAbove = filterList.parentNode.parentNode.previousSibling;
      let filterListLabel = rowAbove.firstChild;
      filterListLabel.id='filterListLabel';
      formatListLabel(filterListLabel);

      let hbox = document.createElement('hbox');
      rowAbove.appendChild(hbox);
      hbox.appendChild(filterListLabel);
      let spc = document.createElement('spacer');
      spc.flex = 1;
      hbox.appendChild(spc);
      // countBox.flex="1"; // make sure this is never obscured by the label
      hbox.appendChild(countBox);

      this.updateCountBox();


      // we need to overwrite the existing functions in order to support the "filtered" state
      var reorderUpButton = document.getElementById("reorderUpButton");
      reorderUpButton.setAttribute("oncommand", "quickFilters.List.onUp(event);");
      var reorderDownButton = document.getElementById("reorderDownButton");
      reorderDownButton.setAttribute("oncommand", "quickFilters.List.onDown(event);");

      var runFiltersButton =  document.getElementById("runFiltersButton");
      // find the log button (first button in hbox) and move it down
      var filterLogButton = dropDown.parentNode.getElementsByTagName("button")[0];
      // insert Filter log button at the bottom
      runFiltersButton.parentNode.insertBefore(filterLogButton, runFiltersButton);
      // move run filters button to left
      var runFiltersFolderMenu =  document.getElementById("runFiltersFolder");
      runFiltersFolderMenu.parentNode.appendChild(runFiltersButton);
    }
    else {
      // for the moment we do not support this on SM / POstbox as I have problems with removing stuff from the treeview!
      // in future we need to build our own tree
      // build a treeview that supports hidden elements and overwrite gFilterTreeView
      // #maildev@Neil: could create a virtual list, the SeaMonkey view is only interested in the filterCount property and the getFilterAt method
      searchBox.collapsed = true;
    }

  } ,

  // helper function for SeaMonkey/Postbox (which doesn't have a gCurrentFilterList)
  getFilterList: function()
  {
    try {
      if (typeof gCurrentFilterList !== "undefined")
        return gCurrentFilterList;
      if (currentFilterList)
        return currentFilterList();
    }
    catch(ex) {
      quickFilters.Util.logException('quickFilters.List.getFilterList: ', ex);
    }
    return null;
  } ,

  // SeaMonkey / Postbox helper
  gFilterTreeView: function() {
    if (typeof gFilterTreeView !== "undefined")
      return gFilterTreeView; // SM
    //Postbox
    return gFilterTree.view;

  } ,

  updateCountBox: function()
  {
    var countBox = document.getElementById("quickFilters-Count");
    var sum = this.getFilterList().filterCount;
    var filterList = this.getFilterListElement();
    var len = this.getListElementCount(filterList);

    if (len === sum)
      countBox.value =
        (len === 1)
        ? document.getElementById ('quickFilters-Count-1-item').value
        : len.toString() + " " + document.getElementById ('quickFilters-Count-items').value;
    else
      countBox.value = document.getElementById ('quickFilters-Count-n-of-m').value
        .replace('{0}', len.toString())
        .replace('{1}', sum.toString());

  } ,

  rebuildFilterList: function()
  {
    if (typeof gCurrentFilterList !== "undefined") { // Thunderbird
      rebuildFilterList(gCurrentFilterList);
    }
    else {
      if (quickFilters.Util.Application === 'Postbox') {
        refresh();
        this.updateCountBox();
        return;
      }

      // force a repaint through the BoxObject
      var fl = this.getFilterListElement();

      // from: SM's setServer(uri) function
      var msgFolder = this.CurrentFolder;

      //Calling getFilterList will detect any errors in rules.dat, backup the file, and alert the user
      switch(quickFilters.Util.Application) {
//        case 'Postbox':
//          this.gFilterTreeView().filterList = msgFolder.getFilterList(gFilterListMsgWindow);
//          break;
        default:
          this.gFilterTreeView().filterList = msgFolder.getEditableFilterList(gFilterListMsgWindow);
          break;
      }
      fl.boxObject.invalidate();
    }
    this.updateCountBox();
  } ,

/**
 * Called when the search button is clicked, this will narrow down the amount
 * of filters displayed in the list, using the search term to filter the names
 *
 * @param focusSearchBox  if called from the button click event, return to searchbox
 */
  onFindFilter: function(focusSearchBox)
  {
    let searchBox = document.getElementById("quickFilters-Search");
    let filterList = this.getFilterListElement();
    let keyWord = searchBox.value.toLocaleLowerCase();

    // simplest case: if filter was added or removed and searchbox is empty
    if (!keyWord && !focusSearchBox) {
      this.updateCountBox();
      return;
    }

    this.rebuildFilterList(gCurrentFilterList); // creates the unfiltered list
    if (!keyWord) {
      if (focusSearchBox)
        searchBox.focus();
      this.updateCountBox();
      return;
    }


    // rematch everything in the list, remove what doesn't match the search box
    let rows = this.getListElementCount(filterList);

    for(let i = rows - 1; i>=0; i--){
      let matched = true;
      var title;
       // SeaMonkey (Postbox) vs Thunderbird - treeview vs listbox
      if (filterList.nodeName === 'tree')
      {
        // SeaMonkey
        item = getFilter(i); // SM: defined in FilterListDialog.js (SM only)
        title = item.filterName;
        if(title.toLocaleLowerCase().indexOf(keyWord) === -1){
          matched = false;
          this.gFilterTreeView().performActionOnRow("delete", i);
          filterList.boxObject.invalidateRow(i);
          filterList.boxObject.rowCountChanged(i + 1, -1);
        }
      }
      else {
        // Thunderbird
        let item = filterList.getItemAtIndex(i);
        title = item.firstChild.getAttribute("label");
        if(title.toLocaleLowerCase().indexOf(keyWord) === -1)
        {
          matched = false;
          filterList.removeChild(item);
        }

      }
      if (matched)
        quickFilters.Util.logDebugOptional("filters", "matched filter: " + title);
    }
    this.updateCountBox();
    if (focusSearchBox)
      searchBox.focus();

  } ,


  validateFilterTargets: function(sourceURI, targetURI) {
    // fix any filters that might still point to the moved folder.

    // 1. nsIMsgAccountManager  loop through list of servers
    try {
      let Ci = Components.interfaces;
      let acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
                          .getService(Ci.nsIMsgAccountManager);
      let accounts = acctMgr.accounts;
      for (let i = 0; i < accounts.Count(); i++) {
        let account = accounts.QueryElementAt(i, Ci.nsIMsgAccount);
        if (account.incomingServer && account.incomingServer.canHaveFilters )
        {
          let ac = account.incomingServer.QueryInterface(Ci.nsIMsgIncomingServer);
          quickFilters.Util.logDebugOptional("filters", "checking account for filter changes: " +  ac.prettyName);
          // 2. getFilterList
          let filterList = ac.getFilterList(msgWindow).QueryInterface(Ci.nsIMsgFilterList);
          // 3. use  nsIMsgFilterList.matchOrChangeFilterTarget(oldUri, newUri, false)
          if (filterList) {
            filterList.matchOrChangeFilterTarget(sourceURI, targetURI, false)
          }
        }
      }
    }
    catch(ex) {
      quickFilters.Util.logException("Exception in quickFilters.List.validateFilterTargets ", ex);
    }

  },
	
	toggleAssistant: function(btn) {
	  let win = quickFilters.Util.getMail3PaneWindow();
		btn.checked = !win.quickFilters.Worker.FilterMode; // toggle
		win.quickFilters.onToolbarButtonCommand();	
	}
};
