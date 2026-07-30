export const Preferences = {
  CURRENT_VERSION: 1.61,
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

  _data: {},
  _debugData: {},
  _ready: false,

  async _seedMissingDefaultsToStorage(settings, debug) {
    let hasSettingsSeed = false;
    let hasDebugSeed = false;

    for (const [key, value] of Object.entries(Preferences.Defaults)) {
      if (typeof settings[key] === "undefined") {
        settings[key] = value;
        hasSettingsSeed = true;
      }
    }

    const currentTemplate = settings["filters.currentTemplate"];
    if (
      typeof currentTemplate !== "string" ||
      currentTemplate === "" ||
      currentTemplate === "undefined" ||
      currentTemplate === "null" ||
      currentTemplate.trim() === ""
    ) {
      settings["filters.currentTemplate"] = "";
      hasSettingsSeed = true;
    }

    for (const [key, value] of Object.entries(Preferences.DebugDefaults)) {
      if (typeof debug[key] === "undefined") {
        debug[key] = value;
        hasDebugSeed = true;
      }
    }

    if (hasSettingsSeed || hasDebugSeed) {
      const sortedSettings = Object.fromEntries(
        Object.entries(settings).sort(([a], [b]) => a.localeCompare(b))
      );
      const sortedDebug = Object.fromEntries(
        Object.entries(debug).sort(([a], [b]) => a.localeCompare(b))
      );

      await browser.storage.local.set({
        settings: sortedSettings,
        debug: sortedDebug,
      });

      // Keep in-memory objects aligned with persisted sorted order.
      Object.assign(settings, sortedSettings);
      Object.assign(debug, sortedDebug);
    }
  },

  async init() {
    // a flat object. e.g. stored["refreshHeaders.wait"] = 150;
    let { settings = {}, debug = {} } = await browser.storage.local.get({
      settings: {},
      debug: {},
    });
    const version = settings.settingsVersion ?? 0;

    if (version < Preferences.CURRENT_VERSION) {
      const { settings: mOptions, debug: mDebug } = await Preferences._migrateLegacyPrefs();
      // avoid overwriting newer backup with older one:
      if (settings["LicenseKey.backup"] !== undefined) {
        mOptions["LicenseKey.backup"] = settings["LicenseKey.backup"];
      }
      settings = {
        ...mOptions,
        settingsVersion: Preferences.CURRENT_VERSION,
      };
      debug = { ...mDebug };
      // store migrated data from Legacy Prefs
      await browser.storage.local.set({ settings });
      await browser.storage.local.set({ debug });
    }

    // Seed missing defaults into persisted storage even when no legacy migration runs.
    // This ensures new keys appear in storage editors and can be toggled directly.
    await Preferences._seedMissingDefaultsToStorage(settings, debug);

    Preferences._data = {
      ...Preferences.Defaults,
      ...settings,
    };
    Preferences._debugData = {
      ...Preferences.DebugDefaults,
      ...debug,
    };

    Preferences._ready = true;

    function applyChanges(target, changesObj, updates, defaults) {
      // the structure is changes.settings.oldValue.key  [changes.debug.oldValue.key]
      // and              changes.settings.newValue.key  [changes.debug.newValue.key]
      const oldV = changesObj.oldValue || {};
      const newV = changesObj.newValue || {};

      for (const [key, val] of Object.entries(oldV)) {
        if (newV[key] === undefined) {
          delete target[key];
          if (Object.prototype.hasOwnProperty.call(defaults, key)) {
            updates[key] = defaults[key];
          } else {
            delete updates[key];
          }
          continue;
        }

        if (newV[key] === val) {
          continue;
        }

        // change value and record updates
        target[key] = newV[key];
        updates[key] = newV[key];
      }
    }

    // live sync all changes to cache
    messenger.storage.onChanged.addListener((changes, area) => {
      try {
        console.log("Preferences onChanged:", changes);
        if (area !== "local") {
          return;
        }
        if (!changes.settings && !changes.debug) {
          return;
        }
        const updates = {};
        if (changes.settings) {
          applyChanges(Preferences._data, changes.settings, updates, Preferences.Defaults);
        }
        if (changes.debug) {
          applyChanges(Preferences._debugData, changes.debug, updates, Preferences.DebugDefaults);
        }
        if (!Object.keys(updates).length) {
          return;
        }

        console.log("Preferences updates:", updates);
        messenger.Utilities.updatePreferencesCache(updates);
      } catch (e) {
        console.error("storage.onChanged crashed:", e);
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
    if (name === "debug") {
      return Preferences._debugData.debugActive ?? false;
    }
    if (name.startsWith("debug")) {
      return Preferences._debugData[name] ?? Preferences.DebugDefaults[name];
    }
    return Preferences._data[name] ?? Preferences.Defaults[name];
  },

  isDebug(key) {
    Preferences._ensureReady({ reason: "isDebug", key });
    // global switch
    if (!key) {
      return Preferences._debugData.debugActive ?? false;
    }
    // specific flag
    return (
      Preferences._debugData[`debug.${key}`] ?? Preferences.DebugDefaults[`debug.${key}`] ?? false
    );
  },

  async setMultiple(prefs) {
    if (!prefs || typeof prefs !== "object") {
      return;
    }
    const settingsPatch = {};
    for (const [name, value] of Object.entries(prefs)) {
      if (name.startsWith("debug")) {
        console.error("setMultiple: debug key rejected", name);
        continue;
      }
      if (this._data[name] === value) {
        continue;
      }
      this._data[name] = value;
      settingsPatch[name] = value;
    }

    const keys = Object.keys(settingsPatch);
    if (!keys.length) {
      return;
    }

    await browser.storage.local.set({
      settings: {
        ...this._data,
        ...settingsPatch,
      },
    });
  },

  async set(name, value) {
    Preferences._ensureReady({ reason: "set", key: name });

    if (name.startsWith("debug")) {
      if (Preferences._debugData[name] === value) {
        return;
      }
      Preferences._debugData[name] = value;
      const { debug } = await browser.storage.local.get({ debug: {} });
      debug[name] = value;
      await browser.storage.local.set({ debug });
      return;
    }

    if (Preferences._data[name] === value) {
      return;
    }
    Preferences._data[name] = value;
    const { settings } = await browser.storage.local.get({ settings: {} });
    settings[name] = value;
    await browser.storage.local.set({ settings });
  },

  getBool(name) {
    return !!this.get(name);
  },

  getInt(name) {
    return parseInt(this.get(name), 10) || 0;
  },

  _normalizeType(key, value) {
    const def = this.Defaults[key] ?? this.DebugDefaults[key];

    if (typeof def === "boolean") {
      if (typeof value === "boolean") {
        return value;
      }
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true" || normalized === "1") {
          return true;
        }
        if (normalized === "false" || normalized === "0") {
          return false;
        }
      }
      return def;
    }

    if (typeof def === "number") {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return def;
      }
      return numeric;
    }

    return value; // string fallback
  },

  async _migrateLegacyPrefs() {
    const legacy_root = "extensions.quickfilters.";

    const migratedOptions = {};
    const migratedDebug = {};
    // these stored entities have no defaults:
    const specialValues = ["LicenseKey.backup", "debug"];

    const migrationKeys = [
      ...Object.keys(this.Defaults),
      ...Object.keys(this.DebugDefaults),
      ...specialValues,
    ]
      .filter((key, index, arr) => arr.indexOf(key) === index)
      .sort();

    for (const key of migrationKeys) {
      const legacyKey = legacy_root + key;

      try {
        const value = await messenger.LegacyPrefs.getPref(legacyKey);

        if (value === undefined) {
          continue;
        }

        const normalized = this._normalizeType(key, value);

        // ---- DEBUG SPLIT ----
        // Legacy pref named "debug" becomes debugActive in the new debug object.
        // There is never a legacy "debugActive" key, but this keeps the branch explicit.
        if (key === "debug" || key === "debugActive") {
          migratedDebug.debugActive = normalized;
          continue;
        }

        if (key.startsWith("debug.")) {
          migratedDebug[key] = normalized;
          continue;
        }

        // ---- EVERYTHING ELSE ----
        migratedOptions[key] = normalized;
      } catch {
        console.warn(`Preference ${legacyKey} not found during migration.`);
      }
    }

    return { settings: migratedOptions, debug: migratedDebug };
  },
};


