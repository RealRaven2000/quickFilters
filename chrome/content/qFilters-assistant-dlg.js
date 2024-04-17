"use strict";
/* 
BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK 
*/


quickFilters.Assistant = {
  selectedMergedFilterIndex: -1,
  currentCmd: null,
  initialised: false,
  MERGEPAGE : 0,
  TEMPLATEPAGE : 1,
  ContinueLabel: "", // Edit Filter...
  
  selectTemplate : function selectTemplate(element) {
    if (!element) {
      element = this.TemplateList;
    }
    if (element.selectedItem) {
      quickFilters.Worker.SelectedValue = element.selectedItem.value;
      quickFilters.Preferences.setCurrentFilterTemplate(element.selectedItem.value);
      return false;
    }
    return true;
  } ,
  
  get currentPage() {
    return parseInt(this.CurrentDeck.selectedIndex);
  },

  next : function next() {
    const prefs = quickFilters.Preferences,
          showEditor = prefs.getBoolPref("showEditorAfterCreateFilter"),
          showList = prefs.getBoolPref("showListAfterCreateFilter");

    let isMerge = false,
        params = window.arguments[0];
        
        
    if (this.currentPage == this.MERGEPAGE) { 
      isMerge = document.getElementById('chkMerge').getAttribute("checked");
      this.selectedMergedFilterIndex = (isMerge) ? this.MatchedFilters.selectedIndex : -1;
    }
  
    if (this.currentCmd == 'mergeList') {
      params.answer  = true;
      params.selectedMergedFilterIndex = this.selectedMergedFilterIndex;
      setTimeout(function() {window.close()});
      return;
    }
    
    let AcceptLabel = 
      isMerge ?
      quickFilters.Util.getBundleString('qf.button.editFilter', "Edit Filter...") :
      quickFilters.Util.getBundleString('qf.button.createFilter', "Create New Filter...");
      
    if (!showEditor && !showList) {
      // relabel as [OK]
      AcceptLabel = "OK";
    }
      

    switch(this.currentPage) {
      case this.MERGEPAGE:  // existing filters were found, lets store selected filter index or -1!
        this.toggleMergePane(false);
        this.NextButton.label = AcceptLabel;
        break;
      case this.TEMPLATEPAGE:  // we are in template selection, either go on to create new filter or edit the selected one from first step
        quickFilters.Assistant.selectTemplate();
        quickFilters.Worker.TemplateSelected = true;
        params.answer  = true;
        params.selectedMergedFilterIndex = this.selectedMergedFilterIndex;
        setTimeout(function() { window.close() });
        break;
    }
    
    return;
  } ,
  
  get NextButton() {
    if (!document.documentElement.getButton) return null;
    return document.documentElement.getButton('extra1');
    // document.getElementsByClassName('accept')[0];
  },
  
  get MatchedFilters() {
    return document.getElementById('filterMatches');
  } ,
  
  get CurrentDeck() {
    return document.getElementById('assistantDeck');
  } ,

  cancelTemplate : function cancelTemplate() {
    quickFilters.Assistant.initialised = false; // avoid templateSelect timer
    quickFilters.Worker.TemplateSelected = false;
    let params = window.arguments[0];
    params.answer  = false;
    params.selectedMergedFilterIndex = -1;
    return true;
  } ,

  get TemplateList() {
    return document.getElementById('qf-filter-templates');
  } ,
  
  toggleMergePane: function toggleMergePane(isMerge) {
    this.CurrentDeck.selectedIndex = isMerge ? this.MERGEPAGE : this.TEMPLATEPAGE;
  } ,

  selectMatchFromList: function selectMatchFromList(list) {
    let isMerge = document.getElementById('chkMerge'),
        chkCreateNew = document.getElementById('chkCreateNew');
    if (list.selectedCount>0) {
      isMerge.setAttribute("checked", true);
      chkCreateNew.removeAttribute("checked");
    }
    else {
      isMerge.removeAttribute("checked");
      chkCreateNew.setAttribute("checked", true);
    }
  } ,
  
  selectMatch: function selectMatch(list) {
    let isMerge = document.getElementById('chkMerge');
    if (list.selectedCount>0) {
      isMerge.setAttribute("checked", true);
    }
    else {
      isMerge.removeAttribute("checked");
    }
  } ,
  
  selectMerge: function selectMerge(isMerge) {
    this.MatchedFilters.selectedIndex = (isMerge.checked ? 0 : -1);
    let chkNew = document.getElementById('chkCreateNew');
    chkNew.checked = !isMerge.checked;
  } ,
  
  selectCreateNew: function selectCreateNew(el) {
    let isNew = el.getAttribute("checked");
    let chkMerge = document.getElementById('chkMerge');
    this.MatchedFilters.selectedIndex = (isNew ? -1 : 0);
    if (!isNew) {
      isMerge.setAttribute("checked", true);
    }
    else {
      isMerge.removeAttribute("checked");
    }
  } ,
  
  l10n: function l10n() {
    // [mx-l10n]
    quickFilters.Util.localize(window, {extra1: "qf.continueFilter.label" , extra2: "qf.label.donate", cancel: "qf.label.cancel" });  
  },

  
  loadAssistant : async function() {
    // [Bug 25199] - Add Rules to existing filters 
    /* 1. find out the correct account (server) */
    /* 2. enumerate all filters of server and find the ones that have same target folder */
    /* 3. if any matching filters are found, list them on a separate page, and give an option to merge or ignore them
    /* 4. If user ignores merge process (or list of matches is empty), move on to template selection box */
    // initialize list and preselect last chosen item!
    
    const templateList = this.TemplateList,
          util = quickFilters.Util,
          prefs = quickFilters.Preferences;

    await quickFilters.Util.init();

    // wire up dialog buttons manually in Thunderbird 68 (something going wrong there with the click events)    
    let dlgButtons = document.getElementsByTagName('dialog')[0]._buttons;
    dlgButtons['extra1'].addEventListener("click", (e) => {return quickFilters.Assistant.next();});
    dlgButtons['cancel'].addEventListener("click", (e) => {return quickFilters.Assistant.cancelTemplate();});

    if (quickFilters.Util.licenseInfo) {
      if (quickFilters.Util.licenseInfo.isValid) {
        dlgButtons['extra2'].style.visibility="hidden";
      } else if (quickFilters.Util.licenseInfo.isExpired) {
        dlgButtons['extra2'].label = quickFilters.Util.getBundleString("quickfilters.notification.premium.btn.renewLicense");
        dlgButtons['extra2'].addEventListener("click", (e) => {quickFilters.Util.showLicenseDialog("assistant_renew");});
      } else {
        // old case (donate)
        dlgButtons['extra2'].addEventListener("click", (e) => {quickFilters.Util.showLicensePage();});
      }
    }
    
    this.ContinueLabel = this.NextButton.label;
          
    // [Bug 25989] Custom Templates Support
    if (prefs.getBoolPref('templates.custom')) {
      // add custom template(s)
      // enumerate Local Folders filters to find templates      
      
      // rebuildFilterList(gCurrentFilterList) // Tb
      // rebuildFilterList()
      //   this.gFilterTreeView.filterList = msgFolder.getEditableFilterList(gFilterListMsgWindow);
      // http://dxr.mozilla.org/comm-central/source/mail/base/content/FilterListDialog.js#613
      // let filterCount = gCurrentFilterList.filterCount;
      // for (let i = 0; i < filterCount; i++) {
      //   filter = gCurrentFilterList.getFilterAt(i);
      // }
      
      // select local folder
      // https://dxr.mozilla.org/comm-central/source/mail/base/content/FilterListDialog.js#213
      // setFolder
      //   gCurrentFilterList = msgFolder.getEditableFilterList(gFilterListMsgWindow);
      // local folder uri = mailbox://nobody@Local%20Folders
      // serverMenu item! 
      let localFolder = util.getMsgFolderFromUri('mailbox://nobody@Local%20Folders'),
          localFolderList = localFolder.getEditableFilterList(null),
          filterCount = localFolderList.filterCount;
      if (filterCount) {
        for (let i = 0; i < filterCount; i++) {
          let filter = localFolderList.getFilterAt(i),
              token = filter.filterName.split(':');
          if (token[0] && token[0].indexOf('quickFilterCustomTemplate')==0) {
            // add user assigned title
            if (token[1]) {
              let listItem = document.createXULElement ? document.createXULElement("richlistitem") : document.createElement("richlistitem"),
                  description = document.createXULElement ? document.createXULElement("description") : document.createElement("description");
              listItem.setAttribute("value", filter.filterName.toString());
              description.textContent = token[1].trim();
              listItem.appendChild(description);
              if (!templateList.itemCount)
                templateList.appendChild(listItem);
              else
                templateList.insertBefore(listItem, templateList.children.item(0));
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
        isMergePossible = false,
        chkAutoRun = document.getElementById('chkAutoRun');
    chkAutoRun.disabled = (prefs.getBoolPref('showListAfterCreateFilter')); 
    // list matching filters - they are passed when a merge is possible
    let params = window.arguments[0];
    if (matchingFilters.length > 0) {
      this.toggleMergePane(true);
      isMergePossible = true;
      let matchList = this.MatchedFilters;
      for (let i=0; i<matchingFilters.length; i++) {
        let itemLabel = matchingFilters[i].filterName;
        if (!matchingFilters[i].enabled)
          itemLabel += ' (disabled)';
        matchList.appendItem(itemLabel, i);
      }
      this.currentCmd = params.cmd;
      
      switch (params.cmd) {
        case 'mergeList':
          this.NextButton.label = util.getBundleString('qf.button.merge');
          document.getElementById('mergeSummary').innerText = util.getBundleString('qf.description.mergeAddSummary');
          document.getElementById('mergeInstructions').innerText = util.getBundleString('qf.description.mergeAddInstructions');
          document.getElementById('chkMerge').innerText = util.getBundleString('qf.button.targetSelected');
          document.getElementById('filterDescription').innerText = '';
          document.getElementById('chkCreateNew').hidden = true;
          break;
        default:
          document.getElementById('mergeSummary').innerText = util.getBundleString('qf.description.mergeSummary');
          document.getElementById('mergeInstructions').innerText = util.getBundleString('qf.description.mergeInstructions');
          document.getElementById('filterDescription').innerText = util.getBundleString('qf.description.selectToExtend');
          this.NextButton.label = util.getBundleString('qf.button.next');
          break;
      }
    }
    try {
      if (params.cmd == 'new') {
        if (params.preview) {
          let preview = params.preview;
          document.getElementById('previewFrom').value = document.getElementById('previewFrom').value + ' ' + preview.author;
          document.getElementById('previewTo').value = document.getElementById('previewTo').value + ' ' + preview.recipients;
          document.getElementById('previewSubject').value = document.getElementById('previewSubject').value + ' ' + preview.subject;
          document.getElementById('previewDate').value = document.getElementById('previewDate').value + ' ' + preview.date;
          document.getElementById('previewLines').value = document.getElementById('previewLines').value + ' ' + preview.lines;
          document.getElementById('previewCaption').label = "{0} Email(s)".replace('{0}',preview.msgCount);
        }
      }
    }
    catch(ex) {
      util.logException("Preview initialisation failed.", ex);
    }
    templateList.value = prefs.getCurrentFilterTemplate();
    // ensureIndexIsVisible ?
    window.sizeToContent();
    // Tb 78 for some reason moves the window to the top left?
    // move assistant to center of screen
    util.centerWindow(window);
    
    templateList.ensureIndexIsVisible(templateList.selectedIndex);
    
    // hide flag / star checkbox depending on application
    const hideCheckbox = 'chkActionFlag';
    let chk = document.getElementById(hideCheckbox);
    if (chk)
      chk.collapsed = true;
    
    if (isMergePossible) {
      // 1. default select merge
      if (prefs.getBoolPref('merge.autoSelect')
         ||
         prefs.getBoolPref('merge.silent')) {
        let mergeBox = document.getElementById('chkMerge');
        mergeBox.setAttribute("checked", true);
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
    
    try {
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
    }
    catch(ex) {;}
    finally {
      quickFilters.Assistant.initialised = true;
      this.selectTemplateFromListTmr(templateList); // make sure Deescription is displayed initially.
    }
    // this.selectTemplateFromListTmr(templateList);
  } ,

  loadPreferences: function() {
    let myprefElements = document.querySelectorAll("[preference]"),
        foundElements = {};
    for (let myprefElement of myprefElements) {
      let legacyPrefId = myprefElement.getAttribute("preference");
      foundElements[legacyPrefId] = myprefElement;
    }
    
    let myprefs = document.getElementsByTagName("preference");
    if (myprefs.length) {
      let prefArray = [];
      for (let it of myprefs) {
        let p = { 
          id: it.getAttribute('name'), 
          name: it.getAttribute('name'), 
          type: it.getAttribute('type') 
        };
        prefArray.push(p);
        foundElements[it.id].setAttribute("preference", it.getAttribute("name"));
      }
      if (Preferences)
        Preferences.addAll(prefArray);
    }             
  },

 
  enableCreate: function enableCreate(b) {
    if (this.NextButton)
      this.NextButton.disabled = !b;
    else
      quickFilters.Util.logToConsole("enableCreate(" + b + ")\nCannot access Create Filter Button!");
  },
  
  selectTemplateFromListTmr: function selectTemplateFromListTimer (el) {
    if (!quickFilters.Assistant.initialised) {
      return;
    }
    quickFilters.Util.logDebug("selectTemplateFromListTimer()");
    quickFilters.Assistant.enableCreate(false);
    window.setTimeout(
      function(el) {
        quickFilters.Assistant.selectTemplateFromList(el);
      }, 50);
  },
    
  selectTemplateFromList: function selectTemplateFromList(element) {
    const _self = quickFilters.Assistant;
    if (!_self.initialised) return;
    if (!element) {
      element = this.TemplateList;
    }
    if (element.selectedItem == null) {
      _self.selectTemplateFromListTmr(element);
      return;
    }
    _self.selectTemplate(element); // set worker value and store in prefs. something bad happens on next!
    _self.enableCreate(true);
    let templateType = element.selectedItem.value;
    if (templateType) {
      if (templateType.indexOf('quickFilterCustomTemplate')==0)
        templateType = 'custom';
      let descriptionId = "qf.filters.template." + templateType + ".description",
          desc = document.getElementById ("templateDescription");
      if (desc) {
        desc.textContent = quickFilters.Util.getBundleString(descriptionId);
        // window.sizeToContent();
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
  
  setNextSteps: function setNextSteps(element) {
    const getBundleString = quickFilters.Util.getBundleString.bind(quickFilters.Assistant),
          NextButton = this.NextButton,
          chkAutoRun = document.getElementById('chkAutoRun');
    window.setTimeout(
      function() {
        const prefs = quickFilters.Preferences;
        let showEditor = prefs.getBoolPref("showEditorAfterCreateFilter"),
            showList = prefs.getBoolPref("showListAfterCreateFilter"),
            AcceptLabel = "";
        chkAutoRun.disabled = showList;
        if (!showEditor && !showList) { // qf.continueFilter.label
          // relabel as [OK]
          AcceptLabel = "OK";
        }
        else
          AcceptLabel = getBundleString('qf.button.createFilter', "Create Filter...");
        NextButton.label = AcceptLabel;
      } , 150
    );
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


window.document.addEventListener('DOMContentLoaded', 
  quickFilters.Assistant.l10n.bind(quickFilters.Assistant) , 
  { once: true });

window.addEventListener('load', 
  quickFilters.Assistant.loadAssistant.bind(quickFilters.Assistant) , 
  { once: true });
  
