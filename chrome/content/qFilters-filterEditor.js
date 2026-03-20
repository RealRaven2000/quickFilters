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
    createSearchRow,
    gFilter,
    getSearchRowIndexForElement,
    gSearchTermList,
    gSearchScope,
    gTotalSearchTerms: writable,
    initializeDialog,
    removeSearchRow,
    saveFilter,
    updateRemoveRowButton,
*/

// highlight removable filter conditions (duplicates)
// window.onload = function()
{
  
  quickFilters.FilterEditor = {
    get currentFilter() {
      if (typeof gFilter !== "undefined") {
        return gFilter;
      }
      return window?.currentFilter() || null;
    },
    isBetterBird: false,
    isDisabled: false,
    onLoad: function loadEditor(_event) {
      const txtAbort = "Abandoning quickFilters processing.";
      const theFilter = quickFilters.FilterEditor.currentFilter;
      if (!theFilter) {
        quickFilters.FilterEditor.isDisabled = true;
        throw "quickFilters Editor: no global filter!\n" + txtAbort;
      }
      if (!theFilter.searchTerms || !theFilter.searchTerms.length) {
        quickFilters.FilterEditor.isDisabled = true;
        throw "quickFilters Editor: no searchTerms!\n" + txtAbort;
      }
      quickFilters.FilterEditor.isBetterBird =
        typeof theFilter.searchTerms[0].beginsGrouping == "number";
      const util = quickFilters.Util;
      util.logDebug("quickFilters.loadEditor()");
      // filterEditorOnLoad(); was already called as we now use a listener!
      setTimeout(function () {
        function matchAction(actionType, actionString) {
          // http://mxr.mozilla.org/comm-central/source/mailnews/base/search/content/FilterEditor.js#30
          switch (parseInt(actionType, 10)) {
            case 1:
              return actionString == "movemessage";
            case 8:
              return actionString == "addtagtomessage";
            case 9:
              return actionString == "replytomessage";
            case 10:
              return actionString == "forwardmessage";
            case 16:
              return actionString == "copymessage";
            case 17:
              return actionString == "addtagtomessage";
            default:
              return false;
          }
        }

        if ("arguments" in window && window.arguments[0]) {
          let args = window.arguments[0];
          if (args.filterConditionValue) {
            let found = false,
              firstMatch,
              list;
            util.logDebug(
              "args.filterConditionValue = " +
                args.filterConditionValue +
                "\n" +
                "args.filterConditionActionType = " +
                args.filterConditionActionType
            );
            // now we need to scroll the correct listbox to the correct place:
            if (args.filterConditionActionType) {
              list = document.getElementById("filterActionList");
              // iterate action rows => listitems
              for (let c = 0; c < list.children.length; c++) {
                let item = list.children[c];
                if (
                  item.attributes &&
                  item.attributes.length &&
                  item.attributes[0].value == "ruleaction"
                ) {
                  for (let a = 0; a < item.attributes.length; a++) {
                    // MozNamedAttrMap
                    let attrib = item.attributes[a];
                    // matching the action type is probably sufficient
                    // as we wouldn"t have the same action type twice
                    // (with different values) in most cases!
                    if (matchAction(args.filterConditionActionType, attrib.value)) {
                      // same action type (e.g. add tag, move to folder etc.
                      util.logDebug(
                        "Matched Action Type = " +
                          attrib.value +
                          "[ " +
                          args.filterConditionActionType +
                          " ]"
                      );
                      found = true;
                      firstMatch = item;
                    }
                  }
                }
                //if (found) break;
              }
            } else {
              list = document.getElementById("searchTermList");
              // iterate search rows => listitems
              let rowIndex = 0,
                lastrowIndex = -1,
                searchRowIndex;
              while (!found) {
                for (let c = 0; c < list.children.length; c++) {
                  let item = list.children[c];
                  if (item.childNodes) {
                    for (let lc = 0; lc < item.childNodes.length; lc++) {
                      let listcell = item.childNodes[lc];
                      if (
                        listcell.firstChild &&
                        listcell.firstChild.nodeName == "searchvalue" &&
                        listcell.firstChild.value
                      ) {
                        let theValue = listcell.firstChild.value,
                          currentSearchVal = theValue.str;
                        searchRowIndex = getSearchRowIndexForElement(item);
                        // e.g: [nsIMsgSearchValue: XXXX
                        util.logDebug(
                          "currentSearchVal = " +
                            currentSearchVal +
                            "   searchRowIndex = " +
                            searchRowIndex
                        );
                        let match = currentSearchVal == args.filterConditionValue ? true : false;
                        if (match) {
                          util.logDebug("MATCH found!");
                          found = true;
                          firstMatch = item;
                          break;
                        }
                      }
                    }
                  }
                  if (found) {break;}
                }
                if (!found) {
                  util.logDebug("rowIndex = " + rowIndex + ",  lastrowIndex =" + lastrowIndex);
                  if (lastrowIndex == rowIndex) {break;} // endless while if nothing found.
                  lastrowIndex = rowIndex;
                  rowIndex = searchRowIndex + 1;
                  util.logDebug("next rowIndex = " + rowIndex);
                  // http://mxr.mozilla.org/comm-central/source/mailnews/base/search/content/searchTermOverlay.js#248
                  gSearchTermList.ensureIndexIsVisible(rowIndex);
                }
              }
              util.logDebug(found ? "found item at rowIndex " + rowIndex : "No match found");
            }

            // highlight the row of the matched element
            if (firstMatch) {
              try {
                list.ensureElementIsVisible(firstMatch);
                firstMatch.style.backgroundImage =
                  "linear-gradient(to bottom, rgba(203,97,95,1) 0%,rgba(193,79,71,1) 36%,rgba(168,17,0,1) 51%,rgba(219,77,55,1) 100%)";
                firstMatch.style.backgroundColor = "rgba(203,97,95,1)";
              } catch (ex) {
                util.logException("Highlighting matched row failed:" + ex);
              }
            }
          } else {
            util.logDebug("No arguments for highlighting duplicates.");
          }
        } else {util.logDebug("No window arguments!");}
      }, 100);

      setTimeout(function () {
        quickFilters.FilterEditor.showTitle();
      }, 100);

      function refreshItems() {
        const theFilter = quickFilters.FilterEditor.currentFilter;
        if (!theFilter.searchTerms) {
          return false;
        }
        if (!theFilter.searchTerms.length) {
          return false;
        }
        const isComplexFiltering = quickFilters.FilterEditor.isBetterBird;
        const isSimpleFiltering = !isComplexFiltering;

        const terms = document.getElementById("searchTermList");
        const termChildren = Array.from(terms.itemChildren).filter(
          (a) => isSimpleFiltering || a.id?.startsWith("searchRow")
        );

        for (let i = 0; i < termChildren.length; i++) {
          let el = termChildren[i];
          if (theFilter.searchTerms[i].attrib == -2) {
            if (
              theFilter.searchTerms[i].customId &&
              theFilter.searchTerms[i].customId.startsWith("quickFilters")
            ) {
              // this is one of my own search terms...
              let val = el.querySelector("search-value");
              let filterVal;
              try {
                // evalute the nsIMsgSearchValue
                filterVal = theFilter.searchTerms[i].value.str;
              } catch { ; }

              const displayVal = (filterVal === "%empty%") ? "" : filterVal;
              if (val.getAttribute("value") != filterVal || displayVal === "") {
                val.setAttribute("value", filterVal);
                if (val.firstChild) {
                  val.firstChild.value = displayVal;
                }
                el.replaceWith(el);
                setTimeout(() => {
                  const displayVal = (filterVal === "%empty%") ? "" : filterVal;
                  const val = el.querySelector("search-value");
                  quickFilters.Util.logToConsole(
                    `Fixing search term ${theFilter.searchTerms[i].customId} - re-adding value "${filterVal}" ...`
                  );                
                  
                  const input = val.querySelector("input.search-value-textbox");                  
                  if (input) {
                    input.value = displayVal;
                  }
                }, 200);
              }   
            }
          }
        }
      }

      refreshItems();
    },

    // this function deals with showing a special titel for custom filter template editor
    // it's actually triggered by the prefix "quickFilterCustomTemplate:"" in the filter name
    showTitle: function editorShowTitle() {
      const util = quickFilters.Util,
        filterNameElement = document.getElementById("filterName"),
        filterName = filterNameElement.value;
      const customEl = document.getElementById("quickFilters-CustomTemplate"),
        variablesBox = document.getElementById("quickFilters-CustomVars"),
        templateLabel = document.getElementById("quickFilters-templateName"),
        helpTip = document.getElementById("qfi_help_actions_customtemplate");

      util.logDebug("quickFilters.FilterEditor.showTitle() - filterName = " + filterName);
      const isCustomFilterTemplate = filterName?.startsWith("quickFilterCustomTemplate");
      if (!isCustomFilterTemplate) {
        templateLabel.setAttribute("collapsed", true);
        variablesBox.setAttribute("collapsed", true);
        customEl.setAttribute("collapsed", true);
        helpTip.setAttribute("collapsed", true);
        helpTip.setAttribute("hidden", true);
        return;
      }

      helpTip.removeAttribute("hidden");

      // Custome Template Initialize:
      util.logDebug("Found Custom Filter Template:\n" + filterName);
      // show "QuickFilters Custom Template" Heading and move it on top of the Filter Name:
      customEl.removeAttribute("collapsed");
      // find container of filterName
      let hbox = filterNameElement.parentElement, // #filterNameBox
        container = hbox.parentElement; // dialog?
      hbox.style.borderColor = "green"; // test
      // there is no parent element maybe we have to wait for DOMContentLoaded ?
      container.insertBefore(customEl, hbox);

      // localise dropdown for custom filter elements
      let custVarLabel = document.getElementById("quickFilters-variablePicker-label"),
        custVarPicker = document.getElementById("quickFilters-variablePicker");
      variablesBox.removeAttribute("collapsed");
      hbox.appendChild(variablesBox);
      custVarPicker.label = custVarLabel.value; // show label on dropdown!
      // make "template name" label visible and collapse "filter name"
      filterNameElement.previousElementSibling.setAttribute("collapsed", true); // hide #filterNameLabel
      hbox.insertBefore(templateLabel, filterNameElement);
      templateLabel.removeAttribute("collapsed");
      filterNameElement.setAttribute("flex", 8);
      
      // hide sort Button for custom templates
      let sortBtn = document.getElementById("quickFiltersBtnSort");
      sortBtn.parentNode.removeChild(sortBtn);
    },

    selectCustomHeader: function selectCustomHeader(picker, event) {
      const Cc = Components.classes,
        Ci = Components.interfaces,
        util = quickFilters.Util,
        clipboardhelper = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(
          Ci.nsIClipboardHelper
        );
      // picker
      let variable = event.target.value,
        hdr = "",
        txt = util.getBundleString(
          "quickfilters.prompt.copiedCustomVar",
          "Copied variable {1} to clipboard, please insert into a search term."
        );
      clipboardhelper.copyString(variable);
      //  remove *...*
      hdr = variable.substring(1, variable.length - 1);
      let argPos = hdr.indexOf("(");
      if (argPos > 0) {hdr = hdr.substring(0, argPos);}
      // make sure this is a known header!
      if (!["from", "to", "cc", "bcc", "subject", "subjectRegex", "reply-to"].includes(hdr)) {
        if (!util.checkCustomHeaderExists(hdr)) {
          txt = util.getBundleString(
            "quickfilters.prompt.createCustomHeader",
            "Please add the term '{1}' as a custom header to use this in a filter."
          );
          if (confirm(txt.replace("{1}", hdr))) {
            let searchTermList = document.getElementById("searchTermList"),
              lastId = "searchAttr" + searchTermList.itemCount - 1, // searchAttr0 is the first search Attribute
              lastAttr = document.getElementById(lastId);
            if (lastAttr) {
              // contains a menulist (className = search-menulist)
              // lastAttr.selectItem( item )
              lastAttr.value = "-2"; // custom
            }
          }
          return;
        }
      }
      // add the new term depending on hdr
      this.addCondition(hdr, variable);
    },

    onDomLoaded: function (_event) {
      const util = quickFilters.Util;
      util.logDebug("quickFilters.editorDomLoaded()");
    },

    addCondition: function (hdr, value) {
      const Ci = Components.interfaces,
        util = quickFilters.Util,
        typeAttrib = Ci.nsMsgSearchAttrib,
        typeOperator = Ci.nsMsgSearchOp;

      const theFilter = quickFilters.FilterEditor.currentFilter;        

      // from http://mxr.mozilla.org/comm-central/source/mailnews/base/search/content/searchTermOverlay.js#232
      //      onMore() called when the [+] button is clicked on a row (simulate last row)
      let rowIndex = gSearchTermList.getRowCount(),
        searchTerm = theFilter.createTerm(); // global filter variable; create a new nsIMsgSearchTerm
      searchTerm.op = typeOperator.Contains;
      util.logDebug("quickFilters.FilterEditor.addFilterCondition(" + hdr + ", " + value + ")");
      switch (hdr) {
        case "to":
          searchTerm.attrib = typeAttrib.To;
          break;
        case "from":
          searchTerm.attrib = typeAttrib.Sender;
          break;
        case "cc":
          searchTerm.attrib = typeAttrib.CC;
          break;
        case "bcc":
          searchTerm.attrib = typeAttrib.CC; // we cannot filter by bcc, because it is hidden
          break;
        case "subject":
          searchTerm.attrib = typeAttrib.Subject;
          break;
        case "subjectRegex":
          searchTerm.attrib = typeAttrib.Subject;
          break;
        case "reply-to":
        case "Reply-To": // [issue 109]
          searchTerm.attrib = typeAttrib.Custom;
          searchTerm.customId = "quickFilters@axelg.com#replyTo";
          searchTerm.arbitraryHeader = "Reply-To";
          break;
        default: { // custom header
          searchTerm.attrib = typeAttrib.Custom;
          //
          // document.getAnonymousNodes(gSearchTermList)[1]
          // http://mxr.mozilla.org/comm-central/source/mailnews/base/search/content/searchTermOverlay.js#282
          //for (var i=0; i<gSearchTerms.length; i++)
          //    gSearchTerms[i].obj.searchattribute.refreshList();
          //
          let iCustomHdr = util.checkCustomHeaderExists(hdr);
          if ("customId" in searchTerm) {
            searchTerm.customId = iCustomHdr ? iCustomHdr.toString() : hdr;
          }
          if ("arbitraryHeader" in searchTerm) {
            searchTerm.arbitraryHeader = hdr;
          }
        } break;
      }
      let val = searchTerm.value;
      val.attrib = searchTerm.attrib; // we assume this is always a string attribute

      // retrieve valueId from value!  - if the term was added as a custom term it will have an id in the attributes dropdown
      val.str = value; // copy string into val object
      searchTerm.value = val; // copy object back into
      theFilter.appendTerm(searchTerm);

      createSearchRow(rowIndex, gSearchScope, searchTerm, false);
      gTotalSearchTerms++;
      updateRemoveRowButton();

      // the user just added a term, so scroll to it
      gSearchTermList.ensureIndexIsVisible(rowIndex);
    },

    sortConditions: function (theFilter) {
      function compareTerms(a, b) {
        try {
          // Ci.nsMsgSearchAttrib - long
          if (a.attrib > b.attrib) {
            return 1;
          }
          if (a.attrib < b.attrib) {
            return -1;
          }
          // Ci.nsMsgSearchOp - long
          if (a.op > a.op) {
            return 1;
          }
          if (a.op < a.op) {
            return -1;
          }
          // atrtirbute and operand are the same, now let"s sort equal values
          if (util.isStringAttrib(a.value.attrib)) {
            if (a.value.str > b.value.str) {
              return 1;
            }
            if (a.value.str < b.value.str) {
              return -1;
            }
          }
        } catch {;}
        // we don"t care about the rest
        return 0;
      }

      // helper function to sort a complex filter with different nesting levels
      // only contiguous elements are sorted.
      const sortWithGrouping = (termsArray) => {
        // Extract the beginsGrouping, endsGrouping, and booleanAnd values, and ensure index tracking
        const groupingValues = termsArray.map((term, index) => ({
          beginsGrouping: term.beginsGrouping,
          endsGrouping: term.endsGrouping,
          booleanAnd: term.booleanAnd,
          index, // Ensure index tracking
        }));

        const partitions = [];
        let currentPartition = [];
        let lastBeginsGrouping = -1;

        termsArray.forEach((term, _index) => {
          if (term.beginsGrouping > lastBeginsGrouping) {
            if (currentPartition.length) {
              partitions.push(currentPartition);
            }
            currentPartition = [];
          }

          if (lastBeginsGrouping === -1 || term.beginsGrouping > 0) {
            lastBeginsGrouping = term.beginsGrouping;
          }

          currentPartition.push(term);

          if (term.endsGrouping > 0) {
            if (currentPartition.length) {
              partitions.push(currentPartition);
            }
            currentPartition = [];
            lastBeginsGrouping = term.endsGrouping > 0 ? 0 : lastBeginsGrouping; // was -1
          }
        });

        if (currentPartition.length > 0) {
          partitions.push(currentPartition);
        }

        // Sort each partition
        partitions.forEach((partition) => {
          partition.sort((a, b) => compareTerms(a, b));
        });

        // Flatten partitions and restore grouping values
        const sortedTerms = partitions.flat().map((term, i) => {
          const groupValues = groupingValues[i]; // Use `i` instead of `term.index`
          term.beginsGrouping = groupValues?.beginsGrouping || 0;
          term.endsGrouping = groupValues?.endsGrouping || 0;
          term.booleanAnd = groupValues?.booleanAnd;
          return term;
        });

        return sortedTerms;
      };

      // Function to log the search terms with their properties
      const logSearchTerms = (termsArray) => {
        // Helper function to format the operator as either "&" or "|"
        const getOperator = (t) => {
          return t.booleanAnd ? "&" : "|";
        };
        const tString = (t) => {
          return t.termAsString.padEnd(65, " ");
        };
        const log = termsArray
          .map((term, index) => {
            return `[${index + 1}] ${tString(term)} begins=${term.beginsGrouping} ends=${
              term.endsGrouping
            } op= ${getOperator(term)}`;
          })
          .join("\n");

        return log;
      };

      if (quickFilters.FilterEditor.isDisabled) {
        console.warn("quickFilters was disabled on dialog startup!");
        return;
      }

      if (!util.hasPremiumLicense()) {
        if (!util.popupProFeature("sortSearchTerms", true)) {
          return;
        }
      }
      // 1st save in case there were edits on screen!
      if (!saveFilter()) {
        // [issue 149] Sorting filter items resurrects deleted search terms
        quickFilters.Util.logWarn("couldn't save filter, aborting sort!");
        return;
      }

      let stCollection = theFilter.searchTerms,
        newSearchArray = [],
        len = stCollection.length;
      for (let t = 0; t < len; t++) {
        let searchTerm = stCollection[t];
        if (searchTerm.value) {
          // eslint-disable-next-line no-unused-vars
          let val = searchTerm.value; // nsIMsgSearchValue
          if (val && util.isStringAttrib(val.attrib)) {
            // eslint-disable-next-line no-unused-vars
            let conditionStr = searchTerm.value.str || "";
          }
        }
        quickFilters.Util.logDebugOptional("filterEdit", "Adding searchTerm:", searchTerm);
        newSearchArray.push(searchTerm);
      }

      quickFilters.Util.logDebugOptional(
        "filterEdit",
        "searchTermArray:\n" + logSearchTerms(newSearchArray)
      );

      const isComplexFiltering = quickFilters.FilterEditor.isBetterBird;
      let sortedArray;
      if (isComplexFiltering) {
        sortedArray = sortWithGrouping(newSearchArray);
      } else {
        sortedArray = newSearchArray.sort(compareTerms);
      }

      quickFilters.Util.logDebugOptional(
        "filterEdit",
        "Sorted Search Terms:\n" + logSearchTerms(sortedArray)
      );

      const stCopy = theFilter.searchTerms; // Array<nsIMsgSearchTerm> searchTerms;
      while (stCopy.length) {
        stCopy.pop();
      }
      theFilter.searchTerms = stCopy;

      // Bb hasn't got gTotalSearchTerms. it's more complicated!
      if (quickFilters.FilterEditor.isBetterBird) {
        // initializeSearchRows(gSearchScope, theFilter.searchTerms);
        while (gSearchTermList.children.length > 1) {
          let lastItem = gSearchTermList.getItemAtIndex(gSearchTermList.children.length - 1);
          if (!lastItem) {
            break;
          }

          // Find the remove button
          const removeButton = lastItem.querySelector("button.small-button[label='−']");

          // Check if the button exists and if it's enabled
          if (removeButton && !removeButton.disabled) {
            // call onLess() and let the Mail App handle it.
            // Dispatch the click event to remove the row
            removeButton.click();
            // Recheck after the click if necessary (since the row is removed, the children length changes)
          } else {
            // If the remove button is disabled, break out of the loop
            console.log("Remove button is disabled or not present, stopping loop.");
            break;
          }
        }
      } else {
        // quick + dirty, Thunderbird way.
        while (gTotalSearchTerms > 0) {
          quickFilters.Util.logDebugOptional(
            "filterEdit",
            `${gTotalSearchTerms} left, removing 1st search row`
          );
          removeSearchRow(0);
          --gTotalSearchTerms;
        }
      }

      for (let x of sortedArray) {
        theFilter.appendTerm(x);
      }

      quickFilters.Util.logDebugOptional("filterEdit", "initializeDialog()...", theFilter);
      initializeDialog(theFilter); // this will duplicate the actions.

      let ruleActions = Array.from(document.querySelectorAll(".ruleaction")),
        count = ruleActions.length;
      for (let a = 0; a < count; a++) {
        if (a < count / 2) {
          quickFilters.Util.logDebugOptional("filterEdit", `remove duplicate action ${a}`);
          ruleActions[a].removeRow();
        }
      }
      // call filterEditorOnLoad(); ??
      quickFilters.Util.logDebugOptional("filterEdit", "Complete.");
    },
  };

  // we need to closure these objects for our observer callback:
  const util = window.quickFilters.Util;
        
  // custom search conditions: replace bindings - needed for:
  // # replyTo
  function patchCustomTextbox(es) {
    if (es.firstChild && es.firstChild.classList.contains("qi-textbox")) {
      util.logDebug("patchCustomTextbox: already patched.");
      return true;
    }
    if (es.firstChild) { 
      es.removeChild(es.firstChild);
    }
    // patch!
    try {
      let textbox = window.MozXULElement.parseXULToFragment(
        ` <html:input class="search-value-textbox flexinput qi-textbox" inherits="disabled" 
          onchange="this.parentNode.setAttribute('value', this.value); this.parentNode.value=this.value;"> 
          </html:input>`
      );
      es.appendChild(textbox);
      // injection of the value can screw up the XUL parser!
      es.lastChild.value = es.getAttribute("value");
      es.classList.add("flexelementcontainer");
      es.setAttribute("fq-patched", "true");
      return true;
    }
    catch(ex) {
      console.log(ex);
      return false;  
    }
  } 
        
        
  function callbackCustomSearchCondition(mutationList, _observer) {
    mutationList.forEach( (mutation) => {
      switch(mutation.type) {
        case "childList": {
          /* One or more children have been added to and/or removed
             from the tree.
             (See mutation.addedNodes and mutation.removedNodes.) */
          // iterate nodelist of added nodes
          let nList = mutation.addedNodes;
          nList.forEach( (el) => {
            if (!el.querySelectorAll) {return;} // leave the anonymous function, this continues with the next forEach
            let hbox = el.querySelectorAll("hbox.search-value-custom");
            hbox.forEach ( (es) => {
              let attType = es.getAttribute("searchAttribute"),
                  isPatched = false;
              if (!attType.startsWith("quickFilters@")) {return;}
              
              util.logDebug("Mutation observer (childList), check for patching: " + es);
              
              switch(attType) {
                case "quickFilters@axelg.com#replyTo" :      
                  isPatched = patchCustomTextbox(es);
                  break;
                default:
                  // irrelevant for quickFilters
              }
              if (isPatched) {
                console.log("mutation observer patched: " + es);
              }
              
            });
          });
        } break;
        case "attributes": {
          let es = mutation.target;
          if (es.classList.contains("search-value-custom")) {
            let attType = es.getAttribute("searchAttribute"),
                isPatched = false;
            util.logDebug("attribute changed: " + attType);
            if (!attType.startsWith("quickFilters@")) {return;}
            
            
            util.logDebug("Mutation observer (attribute), check for patching: " + es);
            // console.log(es);
            
            switch(attType) {
              case "quickFilters@axelg.com#replyTo" :      
                if (es.firstChild) {
                  if (es.firstChild.classList.contains("qi-textbox")) {return;}
                  es.removeChild(es.firstChild);
                }
                isPatched = patchCustomTextbox(es);
                break;
              default:
                // irrelevant for quickFilters
            }
            if (isPatched) {
              util.logDebug("mutation observer patched: "  + es);
            }               
          } 
        } break;          
      }
    });
  }

  const qi_observer = new MutationObserver(callbackCustomSearchCondition);
  const qi_observerOptions = {
    childList: true,
    attributes: true,
    subtree: true // Omit (or set to false) to observe only changes to the parent node
  }
  
  let termList = window.document.querySelector("#searchTermList")
  qi_observer.observe(termList, qi_observerOptions);  
  util.logDebug("qFilters-filterEditor.js - finished.")
}

quickFilters.Util.acceptEditFilter = function (win) {
  // let retVal = onAccept(); // [issue 341] Message Filters ⇒ New... ⇒ Copy... creates TWO Copies
  if (quickFilters.Preferences.isDebugOption("filterEdit")) {
    // eslint-disable-next-line no-debugger
    debugger;
  }
  quickFilters.Util.logDebug("quickFilters.Util.accept(" + win + ")");
  let op = win.opener;
  if (op && op.quickFilters && op.quickFilters.List) {
    op.quickFilters.List.refreshDuplicates(true);
  }
  // return retVal;
} ;

window.addEventListener("load", function(e) { quickFilters.FilterEditor.onLoad(e);}, false); 
window.addEventListener("DOMContentLoaded", function(e) { quickFilters.FilterEditor.onDomLoaded(e);}, false); 

