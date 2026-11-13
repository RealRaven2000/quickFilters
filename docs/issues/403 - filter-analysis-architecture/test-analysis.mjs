import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { analyzeSnapshot } from "../../../scripts/filter-analysis/index.mjs";

const fixture = JSON.parse(await readFile(new URL("./fixtures/live-snapshot.json", import.meta.url), "utf8"));
function freeze(value) {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
test("portable analysis is deterministic, immutable and does not share results between consumers", () => {
  const snapshot = freeze(structuredClone(fixture));
  const before = JSON.stringify(snapshot);
  const result = analyzeSnapshot(snapshot);
  assert.deepEqual(result.findings.map(item => item.reason), ["no-run-method", "missing-folder", "missing-action", "missing-term", "mixed-conditions"]);
  assert.deepEqual(analyzeSnapshot(snapshot), result);
  result.findings[0].state = "resolved";
  assert.equal(analyzeSnapshot(snapshot).findings[0].state, "remaining");
  assert.equal(JSON.stringify(snapshot), before);
  assert.equal(result.complete, true);
});
test("unavailable inspection is distinct from confirmed missing providers and does not suppress other checks", () => {
  const snapshot = structuredClone(fixture);
  snapshot.entries[0].errors = [{ category: "addons", code: "inspection-failed", details: "Registry unreadable" }];
  const result = analyzeSnapshot(snapshot);
  assert.equal(result.complete, false);
  assert.equal(result.diagnostics.length, 1);
  assert(result.findings.some(item => item.reason === "inspection-failed"));
  assert(!result.findings.some(item => item.reason === "missing-action" || item.reason === "missing-term"));
  assert(result.findings.some(item => item.reason === "missing-folder"));
});
test("unparseable entries never access partial native collections and produce review findings", () => {
  const snapshot = structuredClone(fixture);
  snapshot.entries[0].entity.unparseable = true;
  snapshot.entries[0].entity.actionList = [];
  snapshot.entries[0].entity.searchTerms = [];
  const result = analyzeSnapshot(snapshot);
  assert.equal(result.findings.length, 4);
  assert(result.findings.every(item => item.reason === "unparseable" && !item.canEdit));
});
test("capabilities and check selection are explicit inputs; matchAll is not a missing condition", () => {
  const snapshot = structuredClone(fixture);
  snapshot.checks = ["conditions", "conditions"];
  snapshot.capabilities.supportsMixedConditions = true;
  assert.equal(analyzeSnapshot(snapshot).findings.length, 0);
  snapshot.capabilities.supportsMixedConditions = false;
  snapshot.entries[0].entity.searchTerms = [{ matchAll: true, booleanAnd: true, beginsGrouping: 0, endsGrouping: 0 }];
  snapshot.entries[0].observations.terms = [{}];
  assert.equal(analyzeSnapshot(snapshot).findings.length, 0);
  assert.deepEqual(analyzeSnapshot(snapshot).checks, ["conditions"]);
});
test("unsupported and malformed boundary data is rejected before policy evaluation", () => {
  for (const mutate of [
    data => { data.schemaVersion = 999; },
    data => { data.checks = ["new-unsupported-rule"]; },
    data => { data.entries[0].entity.actionList[0].type = "move"; },
    data => { data.entries[0].observations.actions = []; },
    data => { data.entries[0].observations.actions[0] = {}; },
    data => { data.extra = () => {}; },
    data => { data.extra = new Map(); },
    data => { data.extra = data; },
  ]) {
    const snapshot = structuredClone(fixture); mutate(snapshot);
    assert.throws(() => analyzeSnapshot(snapshot), TypeError);
  }
});
test("denied acquisition passes trial feedback through without inventing successful findings", () => {
  const snapshot = structuredClone(fixture);
  snapshot.allowed = false;
  snapshot.entries = [];
  snapshot.trial = { allowed: false, used: 8, remaining: 0, maximum: 8 };
  assert.deepEqual(analyzeSnapshot(snapshot), { allowed: false, trial: snapshot.trial });
  const result = analyzeSnapshot(snapshot);
  result.trial.remaining = 99;
  assert.equal(snapshot.trial.remaining, 0, "consumer mutations cannot change input trial state");
});
test("experimental API wires the factory without implicit dependencies for file and XPI installs", async () => {
  const root = new URL("../../../", import.meta.url);
  const implementation = await readFile(new URL("chrome/content/api/filtersAPI/implementation.js", root), "utf8");
  const nativeSource = await readFile(new URL("chrome/content/api/filtersAPI/troubleshooter.js", root), "utf8");
  const schema = JSON.parse(await readFile(new URL("chrome/content/api/filtersAPI/schema.json", root), "utf8"))[0];
  const loads = [];
  let id = 0;
  const context = vm.createContext({
    console, Components: { interfaces: {} }, IOUtils: {},
    ChromeUtils: { importESModule: () => ({ ExtensionCommon: { ExtensionAPI: class {} }, MailServices: {}, MailUtils: {} }) },
    Services: {
      prefs: {}, uuid: { generateUUID: () => String(++id) },
      scriptloader: { loadSubScriptWithOptions(url, options) {
        loads.push({ url, options });
        if (url.endsWith("troubleshooter.js")) {
          assert.deepEqual(Object.keys(options.target), [], "factory loader has no injected helpers");
          vm.runInNewContext(nativeSource, options.target);
        } else if (url.endsWith("usage-store.js")) {
          options.target.quickFiltersPremium.createUsageStore = () => ({});
        }
      } },
    },
  });
  vm.runInContext(implementation, context);
  const experiment = new context.FiltersAPI();
  const apis = ["file:///addon/", "jar:file:///profile/addon.xpi!/"].map(prefix => experiment.getAPI({ extension: {
    rootURI: { resolve: path => prefix + path }, localeData: { localizeMessage: key => key },
  } }).FiltersAPI);
  for (const api of apis) for (const method of schema.functions) assert.equal(typeof api[method.name], "function", method.name);
  const session = await apis[0].beginTroubleshooting();
  await assert.rejects(apis[1].getFilterSnapshot(session, "a", ["runs"]), /sessionExpired/);
  for (const { options } of loads) {
    assert.equal(options.ignoreCache, true);
    assert.equal(options.allowUnsafeURL, true);
  }
});
