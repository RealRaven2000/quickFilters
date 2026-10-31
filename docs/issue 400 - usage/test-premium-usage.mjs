import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { createUsageStore } from "../../scripts/premium/usage-store.mjs";
import { USAGE_LIMITS } from "../../scripts/premium/usage-limits.mjs";

const PREFIX = "extensions.quickFilters.usage.";
const source = await readFile(new URL("../../chrome/content/qFilters-utils.js", import.meta.url), "utf8");

test("usage defaults are executable declarations, outside the legacy reference comment", async () => {
  const defaultsSource = await readFile(new URL("../../chrome/content/scripts/quickFilter-prefs.js", import.meta.url), "utf8");
  const active = new Map();
  vm.runInNewContext(defaultsSource, { pref: (name, value) => active.set(name, value) });
  for (const feature of Object.keys(USAGE_LIMITS)) {
    assert.equal(active.get(PREFIX + feature), 0, `Missing active default: ${feature}`);
  }
  assert.equal(active.get(PREFIX + "wasLicensed"), false);
  assert.equal(active.has("extensions.quickfilters.restrictions.loadFilters.countDown"), false);
});

function profile() {
  const values = new Map();
  const prefs = {
    prefHasUserValue: key => values.has(key),
    getIntPref(key) { const value = values.get(key); if (!Number.isInteger(value)) { throw new Error("Invalid integer"); } return value; },
    setIntPref(key, value) { values.set(key, value); },
    getBoolPref: (key, fallback) => values.has(key) ? values.get(key) : fallback,
    setBoolPref(key, value) { values.set(key, value); },
  };
  return { values, prefs, store: createUsageStore(prefs) };
}

test("count-up consumption allows exactly the configured limit and denied calls do not increment", () => {
  const { store, values } = profile();
  store.initialize();
  for (let used = 1; used <= USAGE_LIMITS.loadFilters; used++) {
    assert.deepEqual(store.consume("loadFilters"), { allowed: true, used, remaining: USAGE_LIMITS.loadFilters - used, maximum: USAGE_LIMITS.loadFilters });
  }
  assert.equal(store.consume("loadFilters").allowed, false);
  assert.equal(store.consume("loadFilters").used, 3);
  assert.equal(values.get(PREFIX + "loadFilters"), 3);
  assert.equal(store.consume("saveFilters").used, 1);
  assert.throws(() => store.consume("../invalid"), /Unknown premium feature/);
});

test("migration prioritizes count-up prefs, then profile countdowns, local storage, and legacy prefs", () => {
  const { values, store } = profile();
  values.set(PREFIX + "loadFilters.countDown", 1);
  values.set("extensions.quickfilters.restrictions.sortFilters.countDown", 15);
  store.initialize({ loadFilters: 3, saveFilters: 7 });
  assert.equal(values.get(PREFIX + "loadFilters"), 2);
  assert.equal(values.get(PREFIX + "saveFilters"), 3);
  assert.equal(values.get(PREFIX + "sortFilters"), 5);
  store.initialize({ loadFilters: 3, saveFilters: 10 });
  assert.equal(values.get(PREFIX + "loadFilters"), 2);
  values.set(PREFIX + "duplicatesFinder.countDown", -9);
  values.delete(PREFIX + "duplicatesFinder");
  store.initialize();
  assert.equal(values.get(PREFIX + "duplicatesFinder"), USAGE_LIMITS.duplicatesFinder);
});

test("counts survive a fresh API instance and changing limits does not rewrite history", () => {
  const { values, prefs, store } = profile();
  store.initialize();
  store.consume("loadFilters"); store.consume("loadFilters");
  const reinstalled = createUsageStore(prefs, { ...USAGE_LIMITS, loadFilters: 5 });
  reinstalled.initialize();
  assert.equal(values.get(PREFIX + "loadFilters"), 2);
  assert.equal(reinstalled.consume("loadFilters").remaining, 2);
  const fresh = profile();
  createUsageStore(fresh.prefs, { ...USAGE_LIMITS, loadFilters: 5 }).initialize({ loadFilters: 3 });
  assert.equal(fresh.values.get(PREFIX + "loadFilters"), 0);
});

test("only an invalid-to-valid license transition resets usage", () => {
  const { store, values } = profile();
  store.initialize(); store.consume("loadFilters");
  assert.equal(store.updateLicenseState(false), false);
  assert.equal(values.get(PREFIX + "loadFilters"), 1);
  assert.equal(store.updateLicenseState(true), true);
  assert.equal(values.get(PREFIX + "loadFilters"), 0);
  assert.equal(values.get(PREFIX + "wasLicensed"), true);
  store.consume("loadFilters"); // Simulate existing usage to prove repeated validation does not reset.
  assert.equal(store.updateLicenseState(true), false);
  assert.equal(values.get(PREFIX + "loadFilters"), 1);
  store.updateLicenseState(false);
  assert.equal(values.get(PREFIX + "loadFilters"), 1);
  assert.equal(store.updateLicenseState(true), true);
  assert.equal(values.get(PREFIX + "loadFilters"), 0);
});

test("actual Pro gate awaits atomic API results and valid licenses bypass consumption", async () => {
  const body = source.match(/popupProFeature: async function \(featureName, isRegister, additionalText\) \{([\s\S]*?)\n  \},/)[1];
  const { store } = profile(); store.initialize();
  let licensed = false, errors = 0, calls = 0;
  const util = { hasPremiumLicense: () => licensed,
    async consumeProFeatureUsage(feature) { calls++; return store.consume(feature); },
    getMail3PaneWindow: () => ({ specialTabs: { msgNotificationBar: { getNotificationWithValue: () => null, appendNotification: async () => undefined } } }),
    getBundleString: (_key, fallback) => fallback, licenseInfo: { isExpired: false }, logDebug() {}, logException() { errors++; },
  };
  const gate = vm.runInNewContext(`(async function (featureName, isRegister, additionalText) { ${body}\n})`, { quickFilters: { Util: util } });
  assert.equal(await gate("loadFilters", true), true);
  assert.equal(await gate("loadFilters", true), true);
  assert.equal(await gate("loadFilters", true), true);
  assert.equal(await gate("loadFilters", true), false);
  licensed = true;
  assert.equal(await gate("loadFilters", true), true);
  assert.equal(calls, 4);
  licensed = false;
  assert.equal(await gate("Advanced search (type=condition)", true), true);
  util.consumeProFeatureUsage = async () => { throw new Error("Cannot write usage"); };
  assert.equal(await gate("saveFilters", true), false);
  assert.equal(errors, 1);
});

test("legacy consume helper invokes the explicit Utilities API through the existing context", async () => {
  const body = source.match(/consumeProFeatureUsage: async function \(featureName\) \{([\s\S]*?)\n  \},/)[1];
  const result = { allowed: true, used: 1, remaining: 2 };
  const consume = vm.runInNewContext(`(async function (featureName) { ${body}\n})`, {
    quickFilters: { Storage: { _context: { apiCan: { async asyncFindAPIPath(name) {
      assert.equal(name, "Utilities.consumeProFeatureUsage");
      return async feature => { assert.equal(feature, "loadFilters"); return result; };
    } } } } },
  });
  assert.equal(await consume("loadFilters"), result);
});

test("background synchronizes license transitions after startup, updates, timer and account validation", async () => {
  const background = await readFile(new URL("../../qFi-background.js", import.meta.url), "utf8");
  assert.match(background, /await newLicense\.validate\(\);[\s\S]*?currentLicense = newLicense;\s*await syncProFeatureUsageLicenseState\(\);/);
  assert.match(background, /await currentLicense\.updateLicenseDates\(\);\s*await syncProFeatureUsageLicenseState\(\);/);
  assert.equal([...background.matchAll(/await currentLicense\.validate\(\);\s*await syncProFeatureUsageLicenseState\(\);/g)].length, 2);
  const body = background.match(/async function syncProFeatureUsageLicenseState\(\) \{([\s\S]*?)\n\}/)[1];
  const { store, values } = profile(); store.initialize(); store.consume("loadFilters");
  const currentLicense = { info: { status: "Expired" } };
  const sync = vm.runInNewContext(`(async function () { ${body}\n})`, {
    currentLicense,
    messenger: { Utilities: { updateProFeatureUsageLicenseState: async valid => store.updateLicenseState(valid) } },
    console,
  });
  await sync();
  assert.equal(values.get(PREFIX + "loadFilters"), 1);
  currentLicense.info.status = "Valid";
  await sync();
  assert.equal(values.get(PREFIX + "loadFilters"), 0);
  store.consume("loadFilters");
  await sync();
  assert.equal(values.get(PREFIX + "loadFilters"), 1);
  currentLicense.info.status = "Expired"; await sync();
  currentLicense.info.status = "Valid"; await sync();
  assert.equal(values.get(PREFIX + "loadFilters"), 0);
});
