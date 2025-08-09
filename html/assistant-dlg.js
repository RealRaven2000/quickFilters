"use strict";
/* 
BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK 
*/

/* replaces qFilters-assistant-dlg.js */

var requestId;

// API helper
async function formatFolderPath(folder) {
  if (!folder || !folder.accountId || !folder.path) {
    return "";
  }
  try {
    // Get account info from accountId
    let accountName = folder.accountId;
    try {
      const accounts = await messenger.accounts.list();
      const account = accounts.find((acc) => acc.id === folder.accountId);
      if (account) {
        accountName = account.name || account.id;
      }
    } catch (e) {
      console.warn("Failed to get accounts:", e);
    }
    // Split path and filter empty
    const parts = folder.path.split("/").filter(Boolean);
    if (parts.length === 0) {
      return accountName;
    }

    // Get folder info for last part to get localized name
    let lastFolderName = parts[parts.length - 1];
    try {
      // Construct full folder path, assuming path is relative to account root
      // This can vary; you may need to tweak this if folder paths differ.
      const folderUri = `accountid://${folder.accountId}${folder.path}`;
      const folderInfo = await messenger.folders.getFolder(folderUri);
      if (folderInfo && folderInfo.name) {
        lastFolderName = folderInfo.name;
      }
    } catch {
      // fallback to path last part
    }

    // Build display path with all but last parts from the path (non-localized)
    const leadingPath = parts.slice(0, -1).join(" » ");

    return leadingPath
      ? `${accountName} » ${leadingPath} » ${lastFolderName}`
      : `${accountName} » ${lastFolderName}`;
  } catch (ex) {
    console.logException(ex);
    return "N/A";
  }
}


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
  mergeCandidates: [],
  currentCmd: null,
  initialised: false,
  licenseInfo: null,
  hasSentResult: false,
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
    const selectedOption = element.options[element.selectedIndex];
    if (selectedOption) {
      await this.setPref("filters.currentTemplate", selectedOption.value);
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
      let isMerge = document.getElementById("chkMerge").checked;

      const params = {
        answer: urlParams.get("answer"),
        selectedMergedFilterIndex: urlParams.get("selectedMergedFilterIndex"),
        currentCmd: urlParams.get("currentCmd"),
      };

      if (_currentPage == "stepMerge") {
        this.selectedMergedFilterIndex = isMerge ? this.MatchedFilters.selectedIndex : -1;
      }

      if (params.currentCmd == "mergeList") {
        // TO DO
        this.hasSentResult = true;
        await browser.runtime.sendMessage({
          command: "assistantResult",
          requestId,
          result: "merge",
          params: {
            answer: true,
            mergedFilterIndex: this.selectedMergedFilterIndex,
          },
        });
        setTimeout(function () {
          window.close();
        });
        return;
      }

      let txtNext = isMerge
        ? messenger.i18n.getMessage("qf.button.editFilter")
        : messenger.i18n.getMessage("qf.button.createFilter");

      if (!showEditor && !showList) {
        // relabel as [OK]
        txtNext = "OK";
      }
      this.NextButton.textContent = txtNext;

      switch (_currentPage) {
        case "stepMerge": // existing filters were found, lets store selected filter index or -1!
          this.toggleMergePane(false);
          break;
        case "stepDetail": // we are in template selection, either go on to create new filter or edit the selected one from first step
          {
            await quickFilters.Assistant.selectTemplate();
            this.hasSentResult = true;
            let resultParams = {
              answer: true,
            };
            if (document.getElementById("chkMerge").checked) {
              this.selectedMergedFilterIndex = this.MatchedFilters.selectedIndex;
              const selectedFilter = this.mergeCandidates[this.selectedMergedFilterIndex];
              if (selectedFilter) {
                resultParams.selectedMergedFilterName = selectedFilter.filterName;
                resultParams.selectedMergedFilterAccountId = selectedFilter.accountId || null;
              }
            }
            await browser.runtime.sendMessage({
              command: "assistantResult",
              requestId,
              result: "success",
              params: resultParams,
            });
            setTimeout(function () {
              window.close();
            });
          }
          break;
      }
      return;
    } catch (ex) {
      quickFilters.Util.logException("quickFilters.Assistant.next()", ex);
    } finally {
      quickFilters.Assistant.blocks.release("next");
    }
  },

  cancelTemplate: async function () {
    quickFilters.Assistant.initialised = false; // avoid templateSelect timer
    this.hasSentResult = true;
    await browser.runtime.sendMessage({
      command: "assistantResult",
      requestId,
      result: "cancelled",
      params: {
        answer: false,
        mergedFilterIndex: -1,
      },
    });
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
    const filtersJson = params.get("matchedFilters");
    if (!filtersJson) {
      return 0;
    }

    let filters;
    try {
      filters = JSON.parse(filtersJson);
      if (!Array.isArray(filters)) {
        console.error("Matched filters data is not an array:", filters);
        return 0;
      }
      this.mergeCandidates = filters; // remember the list for result generation
    } catch (ex) {
      console.error("Failed to parse matched filters:", ex);
      return 0;
    }

    const matchList = this.MatchedFilters; // input element
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

  previewFromApi: async function (messageId) {
    try {
      const msg = await messenger.messages.get(messageId);

      // Basic metadata to be shown in preview
      return {
        author: msg.author,
        recipients: msg.recipients.join(", "),
        subject: msg.subject,
        date: new Date(msg.date).toLocaleString(),
        size: msg.size, // optional: could estimate number of lines if needed
        msgCount: 1,
      };
    } catch (ex) {
      console.error("Failed to load message preview from API for id:", messageId, ex);
      return null;
    }
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
    const formatSize = (bytes) => {
      if (typeof bytes !== "number" || bytes < 0) {
        return "";
      }
      if (bytes < 1024) {
        return `${bytes} bytes`;
      }
      return `${(bytes / 1024).toFixed(1)} KB`;
    };
    const set = (id, field, format = "") => {
      try {
        const el = document.getElementById(id);
        if (el && field in preview) {
          const val = format == "size" ? formatSize(preview[field]) : preview[field];
          el.textContent = el.textContent + " " + val;
        }
      } catch (ex) {
        console.log(`couldn't set preview field: id=${id} field: ${field}`, ex);
      }
    };

    set("previewFrom", "author");
    set("previewTo", "recipients");
    set("previewSubject", "subject");
    set("previewDate", "date");
    set("previewLines", "size", "size");

    if (preview.folderPath) {
      set("previewPath", "folderPath");
    }
    document.getElementById("previewPath").hidden = !preview.folderPath;

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
    const urlParams = new URLSearchParams(window.location.search);
    requestId = urlParams.get("requestId");
    await this.loadPreferences(); // set all checkboxes
    const urlApiMessages = urlParams.get("selectedApiMessages");
    this.selectedApiMessages = urlApiMessages ? JSON.parse(urlApiMessages) : [];
    const templateList = this.TemplateList;
    const context = urlParams.get("context");
    await quickFilters.Util.logHighlightDebug(
      " loadAssistant() ",
      "rgba(250, 235, 119, 1)",
      "#9d4201ff",
      `Context: ${context}`
    );
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

    document.getElementById("qf-filter-templates").addEventListener("change", (event) => {
      quickFilters.Assistant.selectTemplateFromListTmr(event.target);
    });

    // find any filters that match and add them to the MatchedFilters listbox
    const countMatched = this.initMatchedFilters();
    const isMergePossible = countMatched > 0;
    this.toggleMergePane(isMergePossible);
    if (!isMergePossible) {
      this.NextButton.textContent = messenger.i18n.getMessage("qf.button.createFilter");
    }

    switch (context) {
      case "fromSelectedMessages":
        {
          const jsonMsg = urlParams.get("messageIds");
          if (!jsonMsg) {
            quickFilters.Util.logDebug("Missing messageIds parameter!");
            break;
          }
          const messageIds = JSON.parse(jsonMsg);
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
      default:
        break;
    }
    if (context.startsWith("createFilterAsync")) {
      // from QuickFOlders: createFilterAsync (legacy)
      // drag + drop etc: createFilterAsync
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
    // build a preview
    let preview;
    if (this.selectedApiMessages?.length) {
      // use API to build it fresh
      const folderPath = await formatFolderPath(this.selectedApiMessages[0].folder);
      preview = await this.previewFromApi(this.selectedApiMessages[0].messageId);
      if (folderPath) {
        preview.folderPath = folderPath;
      }
    } else if (this.passedMessages.length) {
      // legacy messages?
      preview = this.passedMessages[0];
    }
    this.initPreview({ preview });

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
    quickFilters.Assistant.selectTemplate(element); // set worker value and store in prefs. something bad happens on next!
    quickFilters.Assistant.enableCreate(true);
    let templateType = element.value;
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
