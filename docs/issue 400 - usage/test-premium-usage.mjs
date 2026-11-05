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
    getIntPref(key, fallback) { const value = values.has(key) ? values.get(key) : fallback; if (!Number.isInteger(value)) { throw new Error("Invalid integer"); } return value; },
    setIntPref(key, value) { values.set(key, value); },
    getBoolPref: (key, fallback) => values.has(key) ? values.get(key) : fallback,
    setBoolPref(key, value) { values.set(key, value); },
  };
  return { values, prefs, store: createUsageStore(prefs, USAGE_LIMITS, { policy: {} }) };
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

test("old countdowns are ignored and Config Editor Reset restores a full allowance", () => {
  const { values, store } = profile();
  values.set(PREFIX + "loadFilters.countDown", 0);
  values.set("extensions.quickfilters.restrictions.loadFilters.countDown", 0);
  values.set(PREFIX + "saveFilters", 4);
  store.initialize();
  assert.equal(store.consume("loadFilters").remaining, 2);
  assert.equal(store.consume("saveFilters").used, 5);
  store.consume("loadFilters"); store.consume("loadFilters");
  assert.equal(store.consume("loadFilters").allowed, false);
  values.delete(PREFIX + "loadFilters"); // Config Editor Reset clears the user value.
  store.initialize();
  assert.equal(values.has(PREFIX + "loadFilters"), false);
  assert.equal(store.consume("loadFilters").remaining, 2);
});

test("counts survive a fresh API instance and changing limits does not rewrite history", () => {
  const { values, prefs, store } = profile();
  store.initialize();
  store.consume("loadFilters"); store.consume("loadFilters");
  const reinstalled = createUsageStore(prefs, { ...USAGE_LIMITS, loadFilters: 5 }, { policy: {} });
  reinstalled.initialize();
  assert.equal(values.get(PREFIX + "loadFilters"), 2);
  assert.equal(reinstalled.consume("loadFilters").remaining, 2);
  const fresh = profile();
  createUsageStore(fresh.prefs, { ...USAGE_LIMITS, loadFilters: 5 }, { policy: {} }).initialize();
  assert.equal(fresh.store.consume("loadFilters").used, 1);
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


test("negative usage is normalized to zero and cannot increase the trial allowance", () => {
  const { values, store } = profile();
  values.set(PREFIX + "loadFilters", -100);
  store.initialize();
  assert.equal(values.get(PREFIX + "loadFilters"), 0);
  for (let used = 1; used <= USAGE_LIMITS.loadFilters; used++) {
    const result = store.consume("loadFilters");
    assert.equal(result.allowed, true);
    assert.equal(result.used, used);
  }
  assert.equal(store.consume("loadFilters").allowed, false);
  values.set(PREFIX + "loadFilters", -1);
  assert.equal(store.consume("loadFilters").used, 1);
});


test("session allowance survives reload, midnight and same-day restart, then exhausts after three virtual sessions", async () => {
  const { prefs, values } = profile();
  let date = new Date(2026, 10, 5, 23, 59), sessionId = "first", data = {};
  const queue = { pending: Promise.resolve() };
  const storage = { async get(defaults) { return structuredClone({ ...defaults, ...data }); },
    async set(patch) { data = structuredClone({ ...data, ...patch }); } };
  const make = () => createUsageStore(prefs, USAGE_LIMITS, { storage, sessionId, queue, now: () => date });
  let store = make();
  const first = await Promise.all([store.consume("loadFilters"), make().consume("loadFilters")]);
  assert(first.every(result => result.allowed && result.used === 1 && result.isSessionCount));
  date = new Date(2026, 10, 6, 0, 1);
  assert.equal((await make().consume("loadFilters")).used, 1); // Same process across midnight.
  sessionId = "second";
  assert.equal((await make().consume("loadFilters")).used, 1); // Restart on same day.
  date = new Date(2026, 10, 7); sessionId = "third";
  assert.equal((await make().consume("loadFilters")).used, 2);
  date = new Date(2026, 10, 8); sessionId = "fourth";
  store = make();
  assert.equal((await store.consume("loadFilters")).remaining, 0);
  assert.equal((await store.consume("loadFilters")).allowed, true); // Final session stays active.
  date = new Date(2026, 10, 9); sessionId = "fifth";
  store = make();
  assert.equal((await store.consume("loadFilters")).allowed, false);
  values.delete(PREFIX + "loadFilters");
  assert.equal((await store.consume("loadFilters")).used, 1); // Config Editor Reset.
  assert.equal(store.consume("saveFilters").used, 1); // Unflagged features count attempts.
  assert.equal(store.consume("saveFilters").used, 2);
});

test("failed session persistence does not consume a trial or poison the request queue", async () => {
  const { prefs, values } = profile(); let fail = true;
  const store = createUsageStore(prefs, USAGE_LIMITS, { sessionId: "test", storage: {
    async get(defaults) { return defaults; },
    async set() { if (fail) throw new Error("Storage failure"); },
  } });
  await assert.rejects(store.consume("loadFilters"), /Storage failure/);
  assert.equal(values.get(PREFIX + "loadFilters"), 0);
  fail = false;
  assert.equal((await store.consume("loadFilters")).used, 1);
});


test("session notifications distinguish an active final session from exhausted trials", async () => {
  const body = source.match(/popupProFeature: async function \(featureName, isRegister, additionalText\) \{([\s\S]*?)\n  \},/)[1];
  let allowed = true, remaining = 2, label;
  const util = { hasPremiumLicense: () => false,
    consumeProFeatureUsage: async () => ({ allowed, remaining, isSessionCount: true }),
    getMail3PaneWindow: () => ({ specialTabs: { msgNotificationBar: {
      getNotificationWithValue: () => null,
      appendNotification: async (_key, options) => { label = options.label; },
    } } }),
    getBundleString: (_key, fallback) => fallback, licenseInfo: {}, logDebug() {},
    logException(_text, error) { throw error; },
  };
  const gate = vm.runInNewContext(`(async function(featureName, isRegister, additionalText) { ${body} })`, { quickFilters: { Util: util } });
  assert.equal(await gate("loadFilters", true), true);
  assert.match(label, /Free trial active for this session/);
  assert.match(label, /2 additional trial sessions remaining/);
  remaining = 0;
  assert.equal(await gate("loadFilters", true), true);
  assert.match(label, /Free trial active for this session/);
  assert.doesNotMatch(label, /remaining|used all/);
  allowed = false;
  assert.equal(await gate("loadFilters", true), false);
  assert.match(label, /used all free trial sessions/);
  assert.doesNotMatch(label, /active for this session/);
});
