
// highlight removable filter conditions (duplicates)
// window.onload = function()
quickFilters.loadEditor = function loadEditor(event) {
  let utils = quickFilters.Util;
  utils.logDebug('quickFilters.loadEditor()');
  if (utils.Debug) debugger;
  // filterEditorOnLoad(); was already called as we now use a listener!
  setTimeout( function() {
    function matchAction(actionType, actionString) {
      // http://mxr.mozilla.org/comm-central/source/mailnews/base/search/content/FilterEditor.js#30
      switch (parseInt(actionType, 10)) {
        case  1: return (actionString=='movemessage');
        case  8: return (actionString=='addtagtomessage');
        case  9: return (actionString=='replytomessage');
        case 10: return (actionString=='forwardmessage');
        case 16: return (actionString=='copymessage');
        case 17: return (actionString=='addtagtomessage');
        default: return false;
      }
    }
  
    if ("arguments" in window && window.arguments[0]) {
      let args = window.arguments[0];  
      if (args.filterConditionValue) {
        window.quickFiltersConditionSearch = true; // a flag to tell us refreshing the list
        let found = false,
            firstMatch,
            list;
        utils.logDebug(
          'args.filterConditionValue = ' + args.filterConditionValue +'\n' +
          'args.filterConditionActionType = ' + args.filterConditionActionType);
        // now we need to scroll the correct listbox to the correct place:
          if (args.filterConditionActionType) {
            list = document.getElementById('filterActionList');
            // iterate action rows => listitems
            let item;
            for each (item in list.children) {
              if (item.attributes && item.attributes.length &&  item.attributes[0].value == 'ruleaction') {
                for each(let attrib in item.attributes) { // MozNamedAttrMap
                  // matching the action type is probably sufficient 
                  // as we wouldn't have the same action type twice 
                  // (with different values) in most cases!
                  if (matchAction(args.filterConditionActionType, attrib.value)) {
                    // same action type (e.g. add tag, move to folder etc.
                    utils.logDebug('Matched Action Type = ' + attrib.value + '[ ' + args.filterConditionActionType + ' ]');
                    found = true;
                    firstMatch = item;
                  }
                }
              }
              //if (found) break;
            }
          }
          else {
            list = document.getElementById('searchTermList');
            // iterate search rows => listitems
            let rowIndex = 0,
                lastrowIndex = -1,
                searchRowIndex;
            while (!found) {
              let item;
              for each (item in list.children) {
                if (item.childNodes)
                  for each(let listcell in item.childNodes) {
                    if (listcell.firstChild && 
                        listcell.firstChild.nodeName=='searchvalue' && 
                        listcell.firstChild.value) {
                      let theValue = listcell.firstChild.value,
                          currentSearchVal = theValue.str;
                      searchRowIndex = getSearchRowIndexForElement(item);
                      // e.g: [nsIMsgSearchValue: XXXX
                      utils.logDebug('currentSearchVal = ' + currentSearchVal + '   searchRowIndex = ' + searchRowIndex);
                      let match = (currentSearchVal == args.filterConditionValue) ? true : false;
                      if (match) {
                        utils.logDebug('MATCH found!');
                        found = true;
                        firstMatch = item;
                        break;
                      }
                    }
                  }
                if (found) break;
              }
              if (!found) {
                utils.logDebug('rowIndex = ' + rowIndex + ',  lastrowIndex =' + lastrowIndex);
                if (lastrowIndex == rowIndex) break; // endless while if nothing found.
                lastrowIndex = rowIndex;
                rowIndex = searchRowIndex + 1;
                utils.logDebug('next rowIndex = ' + rowIndex);
                // http://mxr.mozilla.org/comm-central/source/mailnews/base/search/content/searchTermOverlay.js#248
                gSearchTermList.ensureIndexIsVisible(rowIndex);
              }
            }
            utils.logDebug(found ? ('found item at rowIndex ' + rowIndex) : 'No match found');
          }
          
          // highlight the row of the matched element
          if (firstMatch) try {
            list.ensureElementIsVisible(firstMatch);
            firstMatch.style.backgroundImage = 'linear-gradient(to bottom, rgba(203,97,95,1) 0%,rgba(193,79,71,1) 36%,rgba(168,17,0,1) 51%,rgba(219,77,55,1) 100%)';
            firstMatch.style.backgroundColor = 'rgba(203,97,95,1)';
          }
          catch(ex) {
            utils.logException('Highlighting matched row failed:' + ex);
          }
       }
       else {
         utils.logDebug('No arguments for highlighting duplicates.');
       }
    }
    else
       utils.logDebug('No window arguments!');
  }, 100);
  
  setTimeout( function() { quickFilters.editorShowTitle();}, 100);
}

quickFilters.editorShowTitle = function() {
  let utils = quickFilters.Util,
      filterNameElement = document.getElementById('filterName'),
      filterName = filterNameElement.value;
  utils.logDebug('quickFilters.editorShowTitle() - filterName = ' + filterName);
  if (filterName && filterName.indexOf('quickFilterCustomTemplate')==0) {
    //show "custom Template Header" and move before the Filter Name:
    let customEl = document.getElementById('quickFilters-CustomTemplate');
    customEl.setAttribute('collapsed', false);
    // http://mxr.mozilla.org/comm-central/source/mailnews/base/search/content/FilterEditor.xul#35
    let hbox = filterNameElement.parentElement;
    hbox.style.borderColor = "green"; // test
    // there is no parent element maybe we have to wait for DOMContentLoaded ?
    hbox.parentElement.insertBefore(customEl, hbox);
    // localist quickFilters-CustomTitle
    let cTitle = document.getElementById('quickFilters-CustomTitle');
  }
}

quickFilters.editorDomLoaded = function(event) {
  let utils = quickFilters.Util;
  utils.logDebug('quickFilters.editorDomLoaded()');
} ;


quickFilters.Util.acceptEditFilter = function acceptEditFilter(win) {
  quickFilters.Util.logDebug('quickFilters.Util.accept(' + win + ')');
  let op = win.opener;
  if (op && op.quickFilters && op.quickFilters.List) {
    op.quickFilters.List.refreshDuplicates(true);
  }
} ;