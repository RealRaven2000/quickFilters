export const Preferences = {
  CURRENT_VERSION: 1,
  Defaults: {
    // === DEBUG ===
    debug: false,
    "debug.assistant": false,
    "debug.assistant.ui": false,
    "debug.assistant.msg": false,
    "debug.buildFilter": false,
    "debug.clipboard": false,
    "debug.createFilter": false,
    "debug.createFilter.refreshHeaders": false,
    "debug.default": true,
    "debug.dnd": false,
    "debug.events": false,
    "debug.events.keyboard": false,
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

  _data: {},
  _ready: false,
  async init() {
    // a flat object. e.g. stored["refreshHeaders.wait"] = 150;
    const stored = await browser.storage.local.get();
    const version = stored.settingsVersion ?? 0;

    if (version < Preferences.CURRENT_VERSION) {
      const migrated = await Preferences._migrateLegacyPrefs();
      // avoid overwriting newer backup with older one:
      if (stored["LicenseKey.backup"] !== undefined) {
        migrated["LicenseKey.backup"] = stored["LicenseKey.backup"];
      }

      await browser.storage.local.set({
        ...migrated,
        settingsVersion: Preferences.CURRENT_VERSION,
      });

      Preferences._data = {
        ...Preferences.Defaults,
        ...migrated,
      };
    } else {
      Preferences._data = {
        ...Preferences.Defaults,
        ...stored,
      };
    }
    Preferences._ready = true;

    // live sync all changes to cache
    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") {
        return;
      }

      for (const [key, change] of Object.entries(changes)) {
        if (!change) {
          continue;
        }
        if (change.newValue === undefined) {
          delete Preferences._data[key];
        } else {
          Preferences._data[key] = change.newValue;
        }
      }
    });

  },

  _ensureReady(info) {
    if (!Preferences._ready) {
      const err = new Error("Preferences not initialized");
      err.info = info;
      throw err;
    }
  },

  get(name) {
    Preferences._ensureReady({ reason: "get", key: name });

    return Preferences._data[name] ?? Preferences.Defaults[name];
  },

  async set(name, value) {
    Preferences._ensureReady({ reason: "set", key: name });
    if (Preferences._data[name] === value) {
      return;
    }

    Preferences._data[name] = value;

    // fire-and-forget persistence (important)
    await browser.storage.local.set({
      [name]: value,
    });
  },

  getBool(name) {
    return !!this.get(name);
  },

  getInt(name) {
    return parseInt(this.get(name), 10) || 0;
  },

  _normalizeType(key, value) {
    const def = this.Defaults[key];

    if (typeof def === "boolean") {
      if (typeof value !== "boolean") {
        return def;
      }
    }

    if (typeof def === "number") {
      if (isNaN(value)) {
        return def;
      }
    }

    return value; // string fallback
  },

  async _migrateLegacyPrefs() {
    const legacy_root = "extensions.quickfilters.";

    const migrated = {};

    // migrate all known keys from legacy storage and the unlisted LicenseKey backup
    for (const key of [...Object.keys(this.Defaults), "LicenseKey.backup"]) {
      const legacyKey = legacy_root + key;

      try {
        const value = await messenger.LegacyPrefs.getPref(legacyKey);

        if (value === undefined) {
          continue;
        }

        migrated[key] = this._normalizeType(key, value);
      } catch {
        // ignore missing/failed keys
        console.warn(`Preference ${legacyKey} not found during migration.`);
      }
    }
    return migrated;
  },
};


