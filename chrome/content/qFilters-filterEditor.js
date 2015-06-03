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

Components.utils.import("resource://gre/modules/Services.jsm");

// highlight removable filter conditions (duplicates)
// window.onload = function()
quickFilters.FilterEditor = {
  onLoad: function loadEditor(event) {
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
    
    setTimeout( function() { quickFilters.FilterEditor.showTitle();}, 100);
  },

  showTitle: function editorShowTitle() {
    let utils = quickFilters.Util,
        filterNameElement = document.getElementById('filterName'),
        filterName = filterNameElement.value;
    utils.logDebug('quickFilters.FilterEditor.showTitle() - filterName = ' + filterName);
    if (filterName && filterName.indexOf('quickFilterCustomTemplate')==0) {
      utils.logDebug('Found Custom Filter Template:\n' + filterName);
      // show "QuickFilters Custom Template" Heading and move it on top of the Filter Name:
      let customEl = document.getElementById('quickFilters-CustomTemplate'),
          variablesBox = document.getElementById('quickFilters-CustomVars'),
          templateLabel = document.getElementById('quickFilters-templateName');
      customEl.setAttribute('collapsed', false);
      // http://mxr.mozilla.org/comm-central/source/mailnews/base/search/content/FilterEditor.xul#35
      // find container of filterName
      let hbox = filterNameElement.parentElement ? filterNameElement.parentElement : filterNameElement.parentNode, // Postbox
          container = hbox.parentElement ? hbox.parentElement : hbox.parentNode;
      hbox.style.borderColor = "green"; // test
      // there is no parent element maybe we have to wait for DOMContentLoaded ?
      container.insertBefore(customEl, hbox);
       
      // localise dropdown for custom filter elements
      let custVarLabel = document.getElementById('quickFilters-variablePicker-label'),
          custVarPicker = document.getElementById('quickFilters-variablePicker');
      utils.logDebug('Localize Variable Dropdown: ' + custVarLabel.value);
      variablesBox.setAttribute('collapsed', false);
      hbox.appendChild(variablesBox);
      custVarPicker.label = custVarLabel.value; // show label on dropdown!
      // make "template name" label visible and collapse "filter name" 
      filterNameElement.previousSibling.setAttribute('collapsed', true);
      hbox.insertBefore(templateLabel, filterNameElement);
      templateLabel.setAttribute('collapsed', false);
      filterNameElement.setAttribute('flex', 8);
      if (utils.Application == 'Postbox')
        window.resizeBy(0,customEl.clientHeight);
    }
  },

  selectCustomHeader: function selectCustomHeader(picker, event) {
    const Cc = Components.classes,
          Ci = Components.interfaces;
    // picker
    let clipboardhelper = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper),
        variable = event.target.value,
        hdr = '',
        mainWin = quickFilters.Util.getMail3PaneWindow(),
        utils = mainWin.quickFilters.Util,
        txt = utils.getBundleString('quickfilters.prompt.copiedCustomVar', 
                             'Copied variable {1} to clipboard, please paste in a search term.');
    clipboardhelper.copyString(variable);
    //  remove *...*                         
    hdr = variable.substring(1, variable.length-1);
    let argPos = hdr.indexOf('('),
        isCustom = false;
    if (argPos>0)
      hdr = hdr.substring(0, argPos);
    if (['from', 'to', 'cc', 'bcc', 'subject'].indexOf(hdr) < 0) {
      isCustom = true;
      if (!quickFilters.FilterEditor.checkCustomHeaderExists(hdr)) {
        txt = utils.getBundleString('quickfilters.prompt.createCustomHeader', 
                             "Please add the term '{1}' as a custom header to use this in a filter.");
        if (confirm(txt.replace('{1}', hdr))) {
          let searchTermList = document.getElementById('searchTermList'),
              lastId = 'searchAttr' + searchTermList.itemCount-1, // searchAttr0 is the first search Attribute
              lastAttr = document.getElementById(lastId);
          if (lastAttr) {
            // contains a menulist (className = search-menulist)
            // lastAttr.selectItem( item )
            lastAttr.value="-2"; // custom
          }
        }
        
        return; // no sliding alert
      }
    }
    // add the new term depending on hdr
    this.addCondition(hdr, variable);
    utils.slideAlert(txt.replace('{1}', variable));
  },

  checkCustomHeaderExists: function checkCustomHeaderExists(hdr) {
    // see http://mxr.mozilla.org/comm-central/source/mailnews/base/search/content/CustomHeaders.js#19
    const Ci = Components.interfaces;
    let hdrs = Services.prefs.getCharPref("mailnews.customHeaders"),
        ArrayHdrs;
    if (!hdrs) return 0;
    hdrs = hdrs.replace(/\s+/g,'');  //remove white spaces before splitting
    ArrayHdrs = hdrs.split(":");
    for (let i = 0; i < ArrayHdrs.length; i++)
      if (!ArrayHdrs[i])
        ArrayHdrs.splice(i,1);  //remove any null elements
    for (let i = 0;i < ArrayHdrs.length; i++) {
      if (ArrayHdrs[i] == hdr)
        return i + Ci.nsMsgSearchAttrib.OtherHeader + 1; // custom Header exists, return id 
        // 52 (Tb) is for showing customize - in ui headers start from 53 onwards up until 99.
        // 59 (Pb)
    }
    return 0;
  },

  onDomLoaded: function(event) {
    let utils = quickFilters.Util;
    utils.logDebug('quickFilters.editorDomLoaded()');
  },
  
  addCondition: function addFilterCondition(hdr, value) {
    const Ci = Components.interfaces, 
          Cc = Components.classes,
          utils = quickFilters.Util,
          typeAttrib = Ci.nsMsgSearchAttrib,
          typeOperator = Ci.nsMsgSearchOp;
    if (utils.Debug) debugger;
    // from http://mxr.mozilla.org/comm-central/source/mailnews/base/search/content/searchTermOverlay.js#232
    //      onMore() called when the [+] button is clicked on a row (simulate last row)
    let rowIndex = gSearchTermList.getRowCount(),
        searchTerm = gFilter.createTerm(); // global filter variable; create a new nsIMsgSearchTerm
    searchTerm.op = typeOperator.Contains;
    utils.logDebug('addFilterCondition(' + hdr + ', ' + value + ')');
    switch (hdr) {
      case 'to':
        searchTerm.attrib = typeAttrib.To;
        break;
      case 'from':
        searchTerm.attrib = typeAttrib.Sender;
        break;
      case 'cc':
        searchTerm.attrib = typeAttrib.CC;
        break;
      case 'bcc':
        searchTerm.attrib = typeAttrib.CC; // we cannot filter by bcc, because it is hidden
        break;
      case 'subject':
        searchTerm.attrib = typeAttrib.Subject;
        break;
      default:  // custom header
        searchTerm.attrib = typeAttrib.Custom;
        //
        // document.getAnonymousNodes(gSearchTermList)[1]
        // http://mxr.mozilla.org/comm-central/source/mailnews/base/search/content/searchTermOverlay.js#282
        //for (var i=0; i<gSearchTerms.length; i++) 
        //    gSearchTerms[i].obj.searchattribute.refreshList();
        //}
        let iCustomHdr = quickFilters.FilterEditor.checkCustomHeaderExists(hdr);
        if ('customId' in searchTerm)
          searchTerm.customId = iCustomHdr ? iCustomHdr.toString() : hdr; //Tb
        else {
          searchTerm.attrib = iCustomHdr.toString() ; // Postbox specific
          if ('arbitraryHeader' in searchTerm)
            searchTerm.arbitraryHeader = hdr;
        }
        break;
    }
    let val = searchTerm.value; 
    val.attrib = searchTerm.attrib; // we assume this is always a string attribute
    
    // retrieve valueId from value!  - if the term was added as a custom term it will have an id in the attributes dropdown
    val.str = value; // copy string into val object
    searchTerm.value = val; // copy object back into 
    gFilter.appendTerm(searchTerm);
    
    createSearchRow(rowIndex, gSearchScope, searchTerm, false);
    gTotalSearchTerms++;
    updateRemoveRowButton();

    // the user just added a term, so scroll to it
    gSearchTermList.ensureIndexIsVisible(rowIndex);
  }

}  

quickFilters.Util.acceptEditFilter = function acceptEditFilter(win) {
  quickFilters.Util.logDebug('quickFilters.Util.accept(' + win + ')');
  let op = win.opener;
  if (op && op.quickFilters && op.quickFilters.List) {
    op.quickFilters.List.refreshDuplicates(true);
  }
} ;
