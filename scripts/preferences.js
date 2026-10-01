export const Preferences = {
  CURRENT_VERSION: 1.61,
  // qFi-background.html loads the shared classic script before this module.
  Defaults: { ...globalThis.quickFilters._preferenceDefaults.Defaults },
  DebugDefaults: { ...globalThis.quickFilters._preferenceDefaults.DebugDefaults },

  _data: {},
  _debugData: {},
  _ready: false,

  async _logStorage(message) {
    // Read outside storage.local: diagnostics must work when its backend fails.
    try {
      if (await messenger.LegacyPrefs.getUserPref("extensions.quickfilters.debug.storage") === true) {
        console.log(`quickFilters storage: ${message}`);
      }
    } catch {
      // Diagnostics must not prevent storage initialization.
    }
  },

  async _startupStorageCall(method, value) {
    let timer;
    await this._logStorage(`startup ${method}: starting`);
    try {
      const result = await Promise.race([
        browser.storage.local[method](value),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            const error = new Error(`Storage ${method} did not finish within 10 seconds`);
            error.name = "TimeoutError";
            reject(error);
          }, 10000);
        }),
      ]);
      await this._logStorage(`startup ${method}: completed`);
      return result;
    } catch (error) {
      await this._logStorage(`startup ${method}: failed (${error.name})`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  },

  async _seedMissingDefaultsToStorage(settings, debug) {
    let hasSettingsSeed = false;
    let hasDebugSeed = false;

    for (const [key, value] of Object.entries(Preferences.Defaults)) {
      if (settings[key] === null || settings[key] === undefined) {
        settings[key] = value;
        hasSettingsSeed = true;
      }
    }

    for (const [key, value] of Object.entries(Preferences.DebugDefaults)) {
      if (debug[key] === null || debug[key] === undefined) {
        debug[key] = value;
        hasDebugSeed = true;
      }
    }

    if (hasSettingsSeed || hasDebugSeed) {
      await this._logStorage(`seeding missing defaults (settings: ${hasSettingsSeed}, debug: ${hasDebugSeed})`);
      const sortedSettings = Object.fromEntries(
        Object.entries(settings).sort(([a], [b]) => a.localeCompare(b))
      );
      const sortedDebug = Object.fromEntries(
        Object.entries(debug).sort(([a], [b]) => a.localeCompare(b))
      );

      await this._startupStorageCall("set", {
        settings: sortedSettings,
        debug: sortedDebug,
      });

      // Keep in-memory objects aligned with persisted sorted order.
      Object.assign(settings, sortedSettings);
      Object.assign(debug, sortedDebug);
    }
  },

  async init() {
    const delays = [100, 500, 1000, 2000, 4000];
    this.readiness = { ok: false, status: "pending", attempts: 0 };
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      this.readiness.attempts = attempt + 1;
      await this._logStorage(`initialization attempt ${attempt + 1}/${delays.length + 1}`);
      try {
        if (await messenger.LegacyPrefs.getUserPref("extensions.quickfilters.debug.storage.forceFailure") === true) {
          throw new Error("Forced storage startup failure (legacy test preference)");
        }
        await this._initializeStorage();
        this.readiness = { ok: true, status: attempt ? "delayed" : "ready", attempts: attempt + 1 };
        console.log("quickFilters storage startup:", this.readiness);
        return this.readiness;
      } catch (error) {
        console.warn(`quickFilters storage startup attempt ${attempt + 1}/${delays.length + 1} failed:`, error);
        // A timed-out operation cannot be cancelled. Do not overlap it with retries.
        if (error.name !== "TimeoutError" && attempt < delays.length) {
          await this._logStorage(`retrying initialization in ${delays[attempt]}ms`);
          await new Promise(resolve => setTimeout(resolve, delays[attempt]));
          continue;
        }
        this.readiness = { ok: false, status: "failed", attempts: attempt + 1,
          error: { name: error.name, message: error.message } };
        console.error("quickFilters could not initialize storage - something in your Thunderbird Profile is broken. Check IndexedDB/quota backend errors in Error Console; on Thunderbird 154+ enable [Browser] and [Content].", this.readiness);
        return this.readiness;
      }
    }
  },

  async _initializeStorage() {
    const result = await this._startupStorageCall("get", { settings: {}, debug: {} });
    let settings = result.settings ?? {};
    let debug = result.debug ?? {};
    const version = settings.settingsVersion ?? 0;

    if (version < Preferences.CURRENT_VERSION) {
      await this._logStorage(`migrating legacy preferences to settings version ${Preferences.CURRENT_VERSION}`);
      const { settings: mOptions, debug: mDebug } = await Preferences._migrateLegacyPrefs();
      // avoid overwriting newer backup with older one:
      if (settings["LicenseKey.backup"] !== undefined && settings["LicenseKey.backup"] !== null) {
        mOptions["LicenseKey.backup"] = settings["LicenseKey.backup"];
      }
      settings = {
        ...mOptions,
        ...Object.fromEntries(Object.entries(settings).filter(([, value]) => value !== null && value !== undefined)),
        settingsVersion: Preferences.CURRENT_VERSION,
      };
      debug = { ...mDebug, ...Object.fromEntries(Object.entries(debug).filter(([, value]) => value !== null && value !== undefined)) };
      // store migrated data from Legacy Prefs
      await this._startupStorageCall("set", { settings, debug });
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

      for (const key of new Set([...Object.keys(oldV), ...Object.keys(newV)])) {
        if (newV[key] === undefined || newV[key] === null) {
          if (Object.prototype.hasOwnProperty.call(defaults, key)) {
            target[key] = updates[key] = defaults[key];
          } else {
            delete target[key];
          }
          continue;
        }

        if (newV[key] === oldV[key]) {
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
          // Legacy window caches expose the global switch as "debug".
          if ("debugActive" in updates) {
            updates.debug = updates.debugActive;
            delete updates.debugActive;
          }
        }
        if (!Object.keys(updates).length) {
          return;
        }

        // global update of legacy pref cache, only call once!
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

    if (value === undefined) {
      const defaultValue = Preferences.Defaults[name] ?? Preferences.DebugDefaults[name];
      if (defaultValue !== undefined) {
        console.warn(`Preferences.set("${name}", undefined) - using default value.`);
        value = defaultValue;
      } else {
        throw new Error(`Cannot set preference "${name}" to undefined`);
      }
    }

    if (name.startsWith("debug")) {
      const storageKey = name === "debug" ? "debugActive" : name;
      if (Preferences._debugData[storageKey] === value) {
        return;
      }
      Preferences._debugData[storageKey] = value;
      const { debug } = await browser.storage.local.get({ debug: {} });
      debug[storageKey] = value;
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
    if (value === null || value === undefined) {
      return def;
    }

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

    // Preserve deliberate empty strings; absent values were filtered in migration.
    return value;
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
        const value = await messenger.LegacyPrefs.getUserPref(legacyKey);

        // skip only null/undefined (preference never set), but migrate empty strings (deliberate user choice)
        if (value === undefined || value === null) {
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
