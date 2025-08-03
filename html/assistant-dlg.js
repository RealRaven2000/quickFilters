"use strict";
/* 
BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK 
*/

/* replaces qFilters-assistant-dlg.js */

const quickFiltersPrefs = {
  _map: {
    selectedTemplate: "extensions.quickfilters.filters.currentTemplate",
    actionsTags: "extensions.quickfilters.actions.tags",
    actionsMoveFolder: "extensions.quickfilters.actions.moveFolder",
    actionsStar: "extensions.quickfilters.actions.star",
    actionsFlag: "extensions.quickfilters.actions.flag",
    actionsPriority: "extensions.quickfilters.actions.priority",
    showEditorAfterCreate: "extensions.quickfilters.showEditorAfterCreateFilter",
    showListAfterCreate: "extensions.quickfilters.showListAfterCreateFilter",
    runFilterAfterCreate: "extensions.quickfilters.runFilterAfterCreate",
  },

  async get(id) {
    const key = this._map[id];
    if (!key) {
      throw new Error(`Unknown preference id: ${id}`);
    }
    return await messenger.LegacyPrefs.getPref(key);
  },

  set(id, value) {
    const key = this._map[id];
    if (!key) {
      throw new Error(`Unknown preference id: ${id}`);
    }
    messenger.LegacyPrefs.setPref(key, value);
  },
};


function expandCollapse(element, collapseElementId) {
  try {
    let collapsed = element.getAttribute("containercollapsed");
    let colElement = document.getElementById(collapseElementId);
    if (collapsed) {
      element.removeAttribute("containercollapsed");
      colElement.classList.remove("minimized");
    } else {
      element.setAttribute("containercollapsed", "true");
      colElement.classList.add("minimized");
    }
  } catch (ex) {
    console.error("expandCollapse()\nError toggling collapse state:", ex);
  }
}


quickFilters.Assistant = {
  selectedMergedFilterIndex: -1,
  currentCmd: null,
  initialised: false,
  licenseInfo: null,
  passedMessages: [], // new array for data passed in  (message ids)
  blocks: {
    _map: {},

    /**
     * Attempt to block an action.
     * @param {string} action
     * @returns {boolean} true if already blocked, false if newly blocked
     */
    tryBlock(action) {
      if (this._map[action]) {
        return true; // Already blocked
      }
      this._map[action] = true;
      return false; // Newly blocked
    },

    release(action) {
      delete this._map[action];
    },

    isBlocked(action) {
      return !!this._map[action];
    },
  },
  get AssistantDeck() {
    return document.getElementById("assistantDeck");
  },

  get TemplateList() {
    return document.getElementById("qf-filter-templates");
  },

  get NextButton() {
    // return document.documentElement.getButton("extra1");
    return document.getElementById("btnNext");
  },

  get MatchedFilters() {
    return document.getElementById("filterMatches");
  },

  get currentPage() {
    return this.AssistantDeck.getAttribute("currentStep");
    // return parseInt(this.AssistantDeck.selectedIndex);
  },

  showStep: function (stepId) {
    const deck = this.AssistantDeck;
    deck.setAttribute("currentStep", stepId);
    deck.querySelectorAll(".step").forEach((section) => {
      section.classList.toggle("hidden", section.id !== stepId);
    });
  },

  getPref: async function (id) {
    // pass on the promise to caller
    return messenger.LegacyPrefs.getPref("extensions.quickfilters." + id);
  },

  setPref: async function (id, value) {
    // pass on the promise to caller
    return messenger.LegacyPrefs.setPref("extensions.quickfilters." + id, value);
  },

  selectTemplate: async function (element) {
    if (!element) {
      element = this.TemplateList;
    }
    if (element.selectedItem) {
      await this.setPref("filters.currentTemplate", element.selectedItem.value);
      return false;
    }
    return true;
  },

  next: async function () {
    if (quickFilters.Assistant.blocks.tryBlock("next")) {
      // make sure event not fired multiple times
      console.warn("quickFilters.Assistant.next() was called while already processing!");
      return;
    }
    try {
      const showEditor = await quickFilters.Assistant.getPref("showEditorAfterCreateFilter"),
        showList = await quickFilters.Assistant.getPref("showListAfterCreateFilter"),
        _currentPage = this.currentPage;

      const urlParams = new URLSearchParams(window.location.search);
      let isMerge = false;

      const params = {
        answer: urlParams.get("answer"),
        selectedMergedFilterIndex: urlParams.get("selectedMergedFilterIndex"),
        currentCmd: urlParams.get("currentCmd"),
      };

      if (_currentPage == "stepMerge") {
        isMerge = document.getElementById("chkMerge").checked;
        this.selectedMergedFilterIndex = isMerge ? this.MatchedFilters.selectedIndex : -1;
      }

      if (params.currentCmd == "mergeList") {
        params.answer = true;
        params.selectedMergedFilterIndex = this.selectedMergedFilterIndex;
        // TO DO
        setTimeout(function () {
          window.close();
        });
        return;
      }

      let AcceptLabel = isMerge
        ? messenger.i18n.getMessage("qf.button.editFilter")
        : messenger.i18n.getMessage("qf.button.createFilter");

      if (!showEditor && !showList) {
        // relabel as [OK]
        AcceptLabel = "OK";
      }

      switch (_currentPage) {
        case "stepMerge": // existing filters were found, lets store selected filter index or -1!
          this.toggleMergePane(false);
          this.NextButton.label = AcceptLabel;
          break;
        case "stepDetail": // we are in template selection, either go on to create new filter or edit the selected one from first step
          await quickFilters.Assistant.selectTemplate();
          params.answer = true;
          params.selectedMergedFilterIndex = this.selectedMergedFilterIndex;
          setTimeout(function () {
            window.close();
          });
          break;
      }
      return;
    } catch (ex) {
      quickFilters.Util.logException("quickFilters.Assistant.next()", ex);
    } finally {
      quickFilters.Assistant.blocks.release("next");
    }
  },

  cancelTemplate: function () {
    quickFilters.Assistant.initialised = false; // avoid templateSelect timer

    // eslint-disable-next-line no-unused-vars
    const params = { // TO DO: send result back to caller
      answer: false,
      selectedMergedFilterIndex: -1,
    };

    window.close();
    return true;
  },

  toggleMergePane: function (isMerge) {
    // this.AssistantDeck.selectedIndex = isMerge ? this.MERGEPAGE : this.TEMPLATEPAGE;
    if (isMerge) {
      this.showStep("stepMerge");
    } else {
      this.showStep("stepDetail");
    }
  },

  selectMatchFromList: function (list) {
    const chkMerge = document.getElementById("chkMerge");
    const chkCreateNew = document.getElementById("chkCreateNew");
    const isItemSelected = list.selectedIndex >= 0;
    chkMerge.checked = isItemSelected;
    chkCreateNew.checked = !isItemSelected;
  },

  selectMatch: function (list) {
    const isMerge = document.getElementById("chkMerge");
    const isItemSelected = list.selectedIndex >= 0;
    isMerge.checked = isItemSelected;
  },

  selectMerge: function (isMerge) {
    this.MatchedFilters.selectedIndex = isMerge.checked ? 0 : -1;
    let chkNew = document.getElementById("chkCreateNew");
    chkNew.checked = !isMerge.checked;
  },

  selectCreateNew: function (el) {
    let isNew = el.checked;
    this.MatchedFilters.selectedIndex = isNew ? -1 : 0;
    document.getElementById("chkMerge").checked = !isNew;
  },

  getCurrentFilterTemplate: async function () {
    let current = await this.getPref("filters.currentTemplate");
    if (current == "undefined") {
      return null;
    }
    return current;
  },

  /* TO PASS matching filters:
    const filters = matchingFilters.map(f => ({
      accountId: f.accountId,
      filterName: f.filterName,
      enabled: f.enabled,
    }));

    const query = new URLSearchParams({
      filters: encodeURIComponent(JSON.stringify(filters))
    });

    const assistantURL = browser.runtime.getURL("html/filterAssistant.html?" + query.toString());
    browser.windows.create({
      url: assistantURL,
      type: "popup"
    });
  */

  initMatchedFilters: function () {
    const params = new URLSearchParams(location.search);
    const filtersEncoded = params.get("matchedFilters");
    if (!filtersEncoded) {
      return 0;
    }

    let filters;
    try {
      filters = JSON.parse(decodeURIComponent(filtersEncoded));
      if (!Array.isArray(filters)) {
        console.error("Matched filters data is not an array:", filters);
        return 0;
      }      
    } catch (ex) {
      console.error("Failed to parse matched filters:", ex);
      return 0;
    }

    const matchList = this.MatchedFilters;
    // reset the list
    matchList.textContent = "";
    const chkAutoRun = document.getElementById("chkAutoRun");
    chkAutoRun.disabled = this.getPref("showListAfterCreateFilter");

    if (filters.length > 0) {
      this.toggleMergePane(true);
      for (let i = 0; i < filters.length; i++) {
        const f = filters[i];
        const option = document.createElement("option");
        option.value = i;
        option.textContent = f.filterName + (!f.enabled ? " (disabled)" : "");
        matchList.appendChild(option);
      }
    }
    return filters.length;
  },

  initPreview: function (params) {
    // TO DO: for API compatibility, we could build a MessageList (?) using messageIds
    // or simply an array of MessageHeader objects
    // https://webextension-api.thunderbird.net/en/stable/messages.html#get-messageid
    // let MessageHeader = messages.get(messageId)
    // <== this should get us most of the required data for the preview
    // lets add: params.messageIds = [id1, id2 ...]
    const preview = params?.preview;
    if (!preview) {
      return;
    }
    const set = (id, field) => {
      try {
        const el = document.getElementById(id);
        if (el && field in preview) {
          el.textContent = el.textContent + " " + preview[field];
        }
      } catch(ex) {
        console.log(`couldn't set preview field: id=${id} field: ${field}`, ex);
      }
    };

    set("previewFrom", "author");
    set("previewTo", "recipients");
    set("previewSubject", "subject");
    set("previewDate", "date");
    set("previewLines", "lines");

    const caption = document.getElementById("previewCaption");
    if (caption && preview.msgCount) {
      caption.textContent = `{0} Email(s)`.replace("{0}", preview.msgCount);
    }
  },

  loadAssistant: async function () {
    console.trace("loadAssistant called");    
    if (quickFilters.Assistant.initialised) {
      return;
    }
    const templateList = this.TemplateList;
    quickFilters.Assistant.licenseInfo = await messenger.runtime.sendMessage({
      command: "getLicenseInfo",
    });

    if (await this.getPref("templates.custom")) {
      // add custom template(s)
      // from local folders account
      // Uses background to call experimental API
      const filterItems = await messenger.runtime.sendMessage({
        command: "getFilters",
        accountId: "local",
      });
      const firstItem = templateList.firstElementChild;

      for (let i = 0; i < filterItems.length; i++) {
        let filter = filterItems[i];
        if (filter.type === "template" && filter.templateName) {
          const listItem = document.createElement("option");
          listItem.value = filter.filterName;
          listItem.textContent = filter.templateName;

          // add user assigned title
          listItem.setAttribute("data-description", filter.filterName);
          if (firstItem) {
            templateList.insertBefore(listItem, firstItem);
          } else {
            templateList.appendChild(listItem);
          }
        }
      }
    }

    // find any filters that match and add them to the MatchedFilters listbox
    const countMatched = this.initMatchedFilters();
    const isMergePossible = countMatched > 0;

    const urlParams = new URLSearchParams(window.location.search);
    switch (urlParams.get("context")) {
      case "fromSelectedMessages":
        {
          const jsonMsg = urlParams.get("messageIds");
          if (!jsonMsg) {
            quickFilters.Util.logDebug("Missing messageIds parameter!");
            break;
          }
          const messageIds = JSON.parse(decodeURIComponent(jsonMsg));
          if (!Array.isArray(messageIds)) {
            throw new Error("messageIds is not an array");
          }
          quickFilters.Util.logDebug("Messages passed to assistant:", messageIds);
          for (const id of messageIds) {
            try {
              // The method below would be your experimental API call
              // that converts an API messageId to a message object or header.
              const msg = await messenger.messages.get(id);
              // remove duplicates
              if (this.passedMessages.some((m) => m.id === msg.id)) {
                continue;
              }
              if (msg) {
                this.passedMessages.push(msg);
              }
            } catch (ex) {
              quickFilters.Util.logDebug(`Message with ID ${id} not found or error:`, ex);
            }
          }
        }
        break;
    }
    switch (urlParams.get("currentCmd")) {
      case "mergeList":
        this.NextButton.label = messenger.i18n.getMessage("qf.button.merge");
        document.getElementById("mergeSummary").innerText = messenger.i18n.getMessage(
          "qf.description.mergeAddSummary"
        );
        document.getElementById("mergeInstructions").innerText = messenger.i18n.getMessage(
          "qf.description.mergeAddInstructions"
        );
        document.getElementById("chkMerge").innerText = messenger.i18n.getMessage(
          "qf.button.targetSelected"
        );
        document.getElementById("filterDescription").innerText = "";
        document.getElementById("chkCreateNew").hidden = true;
        break;
      default:
        document.getElementById("mergeSummary").innerText = messenger.i18n.getMessage(
          "qf.description.mergeSummary"
        );
        document.getElementById("mergeInstructions").innerText = messenger.i18n.getMessage(
          "qf.description.mergeInstructions"
        );
        document.getElementById("filterDescription").innerText = messenger.i18n.getMessage(
          "qf.description.selectToExtend"
        );
        this.NextButton.label = messenger.i18n.getMessage("qf.button.next");
    }
    if (this.passedMessages.length) {
      this.initPreview({
        preview: this.passedMessages[0]
      });
    }

    templateList.value = await this.getCurrentFilterTemplate();

    let expandDescription = document.getElementById("expandDescription");
    expandDescription.addEventListener("click", (e) => {
      e.stopPropagation();
      expandCollapse(e.target, "templateDescription");
    });
    let expandPreview = document.getElementById("expandPreview");
    expandPreview.addEventListener("click", (e) => {
      e.stopPropagation();
      expandCollapse(e.target, "previewContent");
    });

    // TO DO: window.sizeToContent();
    // TO DO: templateList.ensureIndexIsVisible(templateList.selectedIndex);
    // TO DO: hide flag / star checkbox depending on application

    if (isMergePossible) {
      // 1. default select merge
      if ((await this.getPref("merge.autoSelect")) || (await this.getPref("merge.silent"))) {
        let mergeBox = document.getElementById("chkMerge");
        mergeBox.checked = true;
        // this will select the first item in the list
        quickFilters.Util.logDebug("Merge filter: Selecting merge as default");
        quickFilters.Assistant.selectMerge(mergeBox);
      }
      // 2. automatically continue on to the next screen
      if (await this.getPref("merge.silent")) {
        quickFilters.Util.logDebug("Merge filter: Skipping merge page (silent merge selected).");
        setTimeout(function () {
          quickFilters.Assistant.next();
        });
      }
    }

    // TO DO: find and remove "replyto" feature!" still experimental until 2.8 release

    quickFilters.Assistant.initialised = true;
    this.selectTemplateFromListTmr(templateList); // make sure Deescription is displayed initially.
  },

  loadPreferences: async function () {
    const bindCheckbox = async (id, prefKey) => {
      const el = document.getElementById(id);
      el.checked = await quickFiltersPrefs.get(prefKey);
      el.addEventListener("change", (e) => {
        quickFiltersPrefs.set(prefKey, e.target.checked);
      });
    };

    const bindSelect = async (id, prefKey) => {
      const el = document.getElementById(id);
      el.value = await quickFiltersPrefs.get(prefKey);
      el.addEventListener("change", (e) => {
        quickFiltersPrefs.set(prefKey, e.target.value);
      });
    };

    // Template dropdown
    await bindSelect("qf-filter-templates", "selectedTemplate");

    // Action checkboxes
    await bindCheckbox("chkActionTags", "actionsTags");
    await bindCheckbox("chkActionStar", "actionsStar");
    await bindCheckbox("chkActionFlag", "actionsFlag");
    await bindCheckbox("chkActionPriority", "actionsPriority");
    await bindCheckbox("chkActionTargetFolder", "actionsMoveFolder");

    // Steps checkboxes
    await bindCheckbox("chkShowEditor", "showEditorAfterCreate");
    await bindCheckbox("chkShowList", "showListAfterCreate");
  },

  enableCreate: function (b) {
    if (this.NextButton) {
      this.NextButton.disabled = !b;
    } else {
      quickFilters.Util.logToConsole(`enableCreate(${b})\nCannot access Create Filter Button!`);
    }
  },

  selectTemplateFromListTmr: function (el) {
    if (!quickFilters.Assistant.initialised) {
      return;
    }
    quickFilters.Util.logDebug("selectTemplateFromListTimer()");
    quickFilters.Assistant.enableCreate(false);
    window.setTimeout(() => {
      quickFilters.Assistant.selectTemplateFromList(el);
    }, 500);
  },

  selectTemplateFromList: function (element) {
    if (!quickFilters.Assistant.initialised) {
      return;
    }
    if (!element) {
      element = this.TemplateList;
    }
    /*
    if (element.selectedItem == null) {
      quickFilters.Assistant.selectTemplateFromListTmr(element);
      return;
    }
      */
    quickFilters.Assistant.selectTemplate(element); // set worker value and store in prefs. something bad happens on next!
    quickFilters.Assistant.enableCreate(true);
    let templateType = element.selectedItem?.value;
    if (templateType) {
      if (templateType.indexOf("quickFilterCustomTemplate") == 0) {
        templateType = "custom";
      }
      let descriptionId = "qf.filters.template." + templateType + ".description",
        desc = document.getElementById("templateDescription");
      if (desc) {
        desc.textContent = messenger.i18n.getMessage(descriptionId);
        // window.sizeToContent();
        let rect = desc.getBoundingClientRect ? desc.getBoundingClientRect() : desc.boxObject;
        if (rect && rect.height && window.height) {
          window.height += rect.height;
        } else if (window.height) {
          // say 1 line of 20px per 50 characters
          window.height += (desc.textContent.length * 20) / 50;
        }
      }
    }
  },

  help: function help() {
    switch (this.currentPage) {
      case "stepMerge":
        quickFilters.Util.showHomePage("index.html#merge");
        break;
      case "stepDetail":
        quickFilters.Util.showHomePage("index.html#assistant");
        break;
    }
  },
};
