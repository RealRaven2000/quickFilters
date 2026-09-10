import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
const defaultsSource = await readFile(new URL("../../scripts/preference-defaults.js", import.meta.url), "utf8");
const defaultsScope = vm.createContext({});
vm.runInContext(defaultsSource, defaultsScope);
globalThis.quickFiltersPreferenceDefaults = defaultsScope.quickFiltersPreferenceDefaults;
const source = await readFile(new URL("../../scripts/preferences.js", import.meta.url), "utf8");

// Exercise the legacy loader contract and reinjection without window globals.
const storageSource = await readFile(new URL("../../chrome/content/qFilters-storage.js", import.meta.url), "utf8");
let defaultLoads = 0;
const legacyScope = vm.createContext({
  quickFilters: {},
  window: { AddOnNStest: { WL: { context: {} } } },
  ChromeUtils: { importESModule: () => ({ ExtensionParent: { GlobalManager: {
    getExtension: () => ({ instanceId: "test", rootURI: { resolve: value => value } }),
  } } }) },
  Services: { scriptloader: { loadSubScriptWithOptions(url, options) {
    assert.equal(url, "scripts/preference-defaults.js");
    assert.equal(options.allowUnsafeURL, true);
    vm.runInNewContext(defaultsSource, options.target);
    defaultLoads++;
  } } },
});
vm.runInContext(storageSource, legacyScope);
legacyScope.quickFilters.Storage.Defaults["filters.currentTemplate"] = "custom";
vm.runInContext(storageSource, legacyScope);
assert.equal(defaultLoads, 2);
assert.equal(legacyScope.quickFilters.Storage.Defaults["filters.currentTemplate"], "from");
assert.equal(legacyScope.quickFiltersPreferenceDefaults, undefined);
assert.equal(globalThis.quickFiltersPreferenceDefaults.Defaults["filters.currentTemplate"], "from");
let instance = 0;
async function setup(stored, legacy = {}, failures = {}) {
  const { Preferences: p } = await import(`data:text/javascript,${encodeURIComponent(source)}#${instance++}`);
  let reads = 0, writes = 0;
  const listeners = [], updates = [];
  globalThis.browser = globalThis.messenger = {
    LegacyPrefs: {
      async getUserPref(key) { return legacy[key.replace("extensions.quickfilters.", "")] ?? null; },
      getPref() { throw Error("Must not migrate default branch"); },
    },
    storage: {
      local: {
        async get() { if (++reads <= (failures.reads ?? 0)) { throw Error("IndexedDB unavailable"); } return structuredClone(stored); },
        async set(value) { if (++writes <= (failures.writes ?? 0)) { throw Error("Quota backend unavailable"); } Object.assign(stored, structuredClone(value)); },
      },
      onChanged: { addListener(fn) { listeners.push(fn); } },
    },
    Utilities: { updatePreferencesCache(value) { updates.push(value); } },
  };
  return { p, stored, listeners, updates, counts: () => ({ reads, writes }) };
}
const originalTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn) => originalTimeout(fn, 0);
try {
  let t = await setup({ settings: {}, debug: {} }, {
    "actions.moveFolder": false, "refreshHeaders.wait": 0, "filters.currentTemplate": "",
  });
  assert.equal((await t.p.init()).status, "ready");
  assert.equal(t.stored.settings["actions.moveFolder"], false);
  assert.equal(t.stored.settings["refreshHeaders.wait"], 0);
  assert.equal(t.stored.settings["filters.currentTemplate"], "");
  assert.equal(t.p._normalizeType("refreshHeaders.wait", null), 150);

  t = await setup({ settings: { settingsVersion: 1.61, "filters.currentTemplate": null,
    "refreshHeaders.wait": null, "actions.moveFolder": false, "files.path": "" }, debug: { debugActive: null } });
  await t.p.init();
  assert.equal(t.stored.settings["filters.currentTemplate"], "from");
  assert.equal(t.stored.settings["refreshHeaders.wait"], 150);
  assert.equal(t.stored.settings["actions.moveFolder"], false);
  assert.equal(t.stored.settings["files.path"], "");
  assert.equal(t.stored.debug.debugActive, false);
  t.listeners[0]({ settings: { oldValue: {}, newValue: { "filters.currentTemplate": "domain" } } }, "local");
  assert.equal(t.p.get("filters.currentTemplate"), "domain");
  assert.equal(t.updates.at(-1)["filters.currentTemplate"], "domain");
  t.listeners[0]({ settings: { oldValue: { "filters.currentTemplate": "domain" }, newValue: { "filters.currentTemplate": null } } }, "local");
  assert.equal(t.updates.at(-1)["filters.currentTemplate"], "from");

  t = await setup({ settings: { "filters.currentTemplate": "custom", "refreshHeaders.wait": 0 }, debug: {} }, { "filters.currentTemplate": "from" });
  await t.p.init();
  assert.equal(t.p.get("filters.currentTemplate"), "custom");
  assert.equal(t.p.get("refreshHeaders.wait"), 0);
  for (const failures of [{ reads: 2 }, { writes: 2 }]) {
    t = await setup({ settings: {}, debug: {} }, {}, failures);
    assert.equal((await t.p.init()).status, "delayed");
    assert.equal(t.listeners.length, 1);
  }
  t = await setup({ settings: {}, debug: {} }, {}, { reads: 10 });
  assert.equal((await t.p.init()).status, "failed");
  assert.equal(t.counts().reads, 6);
  assert.equal(t.p._ready, false);
  t = await setup({ settings: {}, debug: {} }, { "debug.storage.forceFailure": true });
  assert.equal((await t.p.init()).ok, false);
  assert.deepEqual(t.counts(), { reads: 0, writes: 0 });
  t = await setup({ settings: {}, debug: {} });
  browser.storage.local.get = () => new Promise(() => {});
  const timeoutResult = await t.p.init();
  assert.equal(timeoutResult.status, "failed");
  assert.equal(timeoutResult.error.name, "TimeoutError");
  assert.equal(timeoutResult.attempts, 1);
  assert.equal(t.p._ready, false);
  console.log("Preference migration, repair, live sync, and startup tests passed.");
} finally {
  globalThis.setTimeout = originalTimeout;
}
