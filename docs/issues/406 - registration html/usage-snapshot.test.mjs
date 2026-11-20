import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";

test("snapshot does not consume uses and reports an active same-day restore session", async () => {
  const context = vm.createContext({ console });
  vm.runInContext(readFileSync(new URL("../../../scripts/premium/usage-policy.js", import.meta.url), "utf8"), context);
  vm.runInContext(readFileSync(new URL("../../../scripts/premium/usage-store.js", import.meta.url), "utf8"), context);
  const values = new Map([["extensions.quickFilters.usage.loadFilters", 3], ["extensions.quickFilters.usage.saveFilters", 2]]);
  let writes = 0;
  const prefs = {
    getIntPref: (key, fallback) => values.get(key) ?? fallback,
    setIntPref: (key, value) => { writes++; values.set(key, value); },
  };
  const storage = { get: async () => ({ featureSession: { loadFilters: { used: 3, sessionId: "old", lastUsedDate: "2026-11-20" } } }) };
  const store = context.quickFiltersPremium.createUsageStore(prefs, undefined, { storage, sessionId: "new", now: () => new Date(2026, 10, 20) });
  const restore = await store.snapshot("loadFilters");
  assert.equal(restore.remaining, 0);
  assert.equal(restore.activeSession, true);
  const backup = await store.snapshot("saveFilters");
  assert.equal(backup.remaining, 8);
  assert.equal(backup.isSessionCount, true);
  assert.equal(writes, 0);
});

test("backup uses one session across repeated uses and a restart on the same day", async () => {
  const context = vm.createContext({ console });
  vm.runInContext(readFileSync(new URL("../../../scripts/premium/usage-policy.js", import.meta.url), "utf8"), context);
  vm.runInContext(readFileSync(new URL("../../../scripts/premium/usage-store.js", import.meta.url), "utf8"), context);
  const values = new Map();
  let stored = {};
  const prefs = {
    getIntPref: (key, fallback) => values.get(key) ?? fallback,
    setIntPref: (key, value) => values.set(key, value),
  };
  const storage = {
    get: async () => stored,
    set: async (value) => { stored = { ...stored, ...value }; },
  };
  const makeStore = (sessionId, day) => context.quickFiltersPremium.createUsageStore(
    prefs, undefined, { storage, sessionId, now: () => new Date(2026, 10, day) }
  );
  const first = makeStore("first", 20);
  assert.equal((await first.consume("saveFilters")).remaining, 9);
  assert.equal((await first.consume("saveFilters")).remaining, 9);
  assert.equal((await makeStore("restart", 20).consume("saveFilters")).remaining, 9);
  assert.equal((await makeStore("next-day", 21).consume("saveFilters")).remaining, 8);
});
