"use strict";

// Shared data only: load as a classic script in extension pages, or into an
// isolated target with loadSubScriptWithOptions in legacy chrome code.
// No storage access, migration, or ESM exports belong in this file.
// Reuse the sole add-on namespace; legacy callers provide it in their private target.
var quickFilters = quickFilters || {};
quickFilters._preferenceDefaults = {
  Defaults: {
    // === NAMING ===
    "naming.targetAccount": false,
    "naming.subject.blacklist": "re:, fwd:, aw:, urgent, important, wg:, antw:, the, der, die, das",
    "naming.parentFolder.maxCount": 1,
    "naming.parentFolder": true,
    "naming.folderDelimiter": "»",
    "naming.keyWord": false,
    "naming.clonedLabel": "",
    "naming.mergeToken": " +m",

    // === NEW FILTER ===
    "newfilter.autorun": true,
    "newfilter.manual": true,
    "newfilter.insertAlphabetical": false,
    "newfilter.runAfterPlugins": false,
    "newfilter.runArchiving": false,
    "newfilter.runPostOutgoing": false,
    "newfilter.runPeriodically": false,
    "newfilter.removeOwnAddresses": true,

    lastSelectedOptionsTab: "",

    // === FILES / UI ===
    "files.path": "",
    warnInboxAssistant: true,

    abortAfterCreate: false,
    autoStart: false,
    toolbar: true,
    showListAfterCreateFilter: true,
    runFilterAfterCreate: false,
    showEditorAfterCreateFilter: true,
    "refreshHeaders.wait": 150,
    subjectDisableKeywordsExtract: false,

    // === FILTERS ===
    "filters.currentTemplate": "from",
    "filters.showMessage": true,

    // === LISTENER ===
    "listener.tags": true,
    "listener.tags.autofilter": false,

    // === SEARCHTERM ===
    "searchterm.addressesOneWay": false,
    "searchterm.insertOnTop": false,

    // === ASSISTANT ===
    "assistant.html": true,
    "assistant.exclude.trash": false,
    "assistant.exclude.junk": false,
    "assistant.exclude.archive": true,
    "assistant.ui.stayFocused": false,
    "assistant.ui.focus.maxRestores": 3,
    "assistant.merge.firstActionOnly": true,

    // === MERGE ===
    "merge.autoSelect": false,
    "merge.silent": false,

    // === ACTIONS ===
    "actions.tags": true,
    "actions.priority": false,
    "actions.star": false,
    "actions.flag": false,
    "actions.moveFolder": true,

    // === FIRST RUN ===
    firstRun: true,
    installedVersion: "0",
    hasNews: false,
    "news.minimal": false,

    // === QUICKFOLDERS UI ===
    "quickfolders.curFolderbar.listbutton": true,
    "quickfolders.curFolderbar.folderbutton": true,
    "quickfolders.curFolderbar.messagesbutton": false,
    "quickfolders.curFolderbar.findfilterbutton": true,

    // === TROUBLESHOOT ===
    "troubleshoot.incomingFlag": true,
    "troubleshoot.invalidTargetFolder": true,
    "troubleshoot.customActions": true,
    "troubleshoot.mixedAnyAndAll": true,

    // === TEMPLATES ===
    "templates.replyTo": false,
    "templates.custom": false,

    // === MULTIPASTE ===
    multipaste: false,

    // === NOTIFICATIONS ===
    "notifications.runFilter": true,
    "notifications.changelog": true,

    // === PREMIUM COUNTERS ===
    "restrictions.advancedSearchType.countDown": 15,
    "restrictions.duplicatesFinder.countDown": 10,
    "restrictions.searchFolder.countDown": 15,
    "restrictions.sortSearchTerms.countDown": 25,
    "restrictions.sortFilters.countDown": 20,
    "restrictions.customTemplate.countDown": 20,
    "restrictions.saveFilters.countDown": 10,
    "restrictions.loadFilters.countDown": 3,

    // === LICENSING ===
    "licenser.forceSecondaryIdentity": false,
    licenseType: 0,
    LicenseKey: "",
    "LicenseKey.backup": "",
    "licenser.renewalReminder": 0,

    // === MISC ===
    localFoldersRun: false,
    "shortcuts.folder": false,
    "shortcuts.mails": false,
    "shortcuts.folder.key": "F",
    "shortcuts.mails.key": "R",
    "shortcuts.challenge": true,

    "mime.resolveAB": false,
    "mime.resolveAB.preferNick": false,
    firstLastSwap: false,
  },
  DebugDefaults: {
    debugActive: false /* was "debug" */,
    "debug.3pane": false,
    "debug.assistant": false,
    "debug.assistant.ui": false,
    "debug.assistant.msg": false,
    "debug.buildFilter": false,
    "debug.clipboard": false,
    "debug.createFilter": false,
    "debug.createFilter.exec": false,
    "debug.createFilter.refreshHeaders": false,
    "debug.default": true,
    "debug.dnd": false,
    "debug.events": false,
    "debug.events.keyboard": false,
    "debug.externalMsgApi": false,
    "debug.filters": false,
    "debug.filterEdit": false,
    "debug.filterList": false,
    "debug.filterSearch": false,
    "debug.filterSearch.detail": false,
    "debug.getSourceFolder": false,
    "debug.identities": false,
    "debug.listeners": false,
    "debug.merge": false,
    "debug.merge.detail": false,
    "debug.nostalgy": false,
    "debug.notifications": false,
    "debug.msgMove": false,
    "debug.msgMove.detail": false,
    "debug.replaceReservedWords": false,
    "debug.template.multifrom": false,
    "debug.template.custom": false,
    "debug.premium": false,
    "debug.premium.licenser": false,
    "debug.premium.rsa": false,
    "debug.FiltersAPI": false,
    "debug.functions": false,
    "debug.mime": false,
    "debug.mime.split": false,
  },
};
