import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

test("filter sorting waits for permission before changing clipboard or order", async () => {
  const source = await readFile(new URL("../../chrome/content/qFilters-list.js", import.meta.url), "utf8");
  const body = source.match(/sort: async function \(_evt\) \{([\s\S]*?)\n  \} ,/)[1];
  let finish, moved = 0, copied = 0;
  const util = { popupProFeature(feature) {
    assert.equal(feature, "sortFilters");
    return new Promise(resolve => { finish = resolve; });
  } };
  const sort = vm.runInNewContext(`(async function (_evt) { ${body} })`, { quickFilters: { Util: util } });
  const list = { FilterListElement: {}, getSelectedCount: () => 2,
    pushSelectedToClipboard() { copied++; return true; }, pasteFilters() { moved++; },
  };
  const pending = sort.call(list);
  assert.equal(copied, 0); assert.equal(moved, 0);
  finish(false); await pending;
  assert.equal(copied, 0); assert.equal(moved, 0);
  util.popupProFeature = async () => true;
  await sort.call(list);
  assert.equal(copied, 1); assert.equal(moved, 1);
  assert.equal(list.clipboardPending, "sort");
});

test("condition sorting waits for permission before saving or reading conditions", async () => {
  const source = await readFile(new URL("../../chrome/content/qFilters-filterEditor.js", import.meta.url), "utf8");
  const body = source.match(/sortConditions: async function \(theFilter\) \{([\s\S]*?)\n    \},/)[1];
  let finish, saved = 0;
  const util = { hasPremiumLicense: () => false,
    popupProFeature(feature) {
      assert.equal(feature, "sortSearchTerms");
      return new Promise(resolve => { finish = resolve; });
    },
    logWarn() {},
  };
  const sort = vm.runInNewContext(`(async function (theFilter) { ${body} })`, {
    util, quickFilters: { Util: util, FilterEditor: { isDisabled: false } },
    saveFilter() { saved++; return false; },
  });
  const filter = { get searchTerms() { assert.fail("Conditions read before save/gate"); } };
  const pending = sort(filter);
  assert.equal(saved, 0);
  finish(false); await pending;
  assert.equal(saved, 0);
  util.popupProFeature = async () => true;
  await sort(filter);
  assert.equal(saved, 1);
});

test("advanced search waits for permission, falls back to name when denied, and keeps internal switches immediate", async () => {
  const source = await readFile(new URL("../../chrome/content/qFilters-list.js", import.meta.url), "utf8");
  const body = source.match(/toggleSearchType: async function \(type, interActive=false\) \{([\s\S]*?)\n  \} ,/)[1];
  let finish, rebuilt = 0, gates = 0, reset = false;
  const util = { popupProFeature(feature) {
    gates++;
    assert.equal(feature, "Advanced search (type=condition)");
    return new Promise(resolve => { finish = resolve; });
  }, logDebug() {} };
  const toggle = vm.runInNewContext(`(async function (type, interActive=false) { ${body}
  })`, {
    quickFilters: { Util: util },
    document: { getElementById: () => ({ firstChild: { setAttribute() { reset = true; } } }) },
  });
  const list = { searchType: "name", rebuildFilterList() { rebuilt++; } };
  const pending = toggle.call(list, "condition", true);
  assert.equal(list.searchType, "name"); assert.equal(rebuilt, 0);
  finish(false); await pending;
  assert.equal(list.searchType, "name"); assert(reset); assert.equal(rebuilt, 1);
  const allowed = toggle.call(list, "condition", true);
  finish(true); await allowed;
  assert.equal(list.searchType, "condition"); assert.equal(rebuilt, 2);
  const internal = toggle.call(list, "targetFolder");
  assert.equal(list.searchType, "targetFolder");
  assert.equal(gates, 2);
  await internal;
});

test("duplicate finder preserves existing results and avoids scanning while permission is pending or denied", async () => {
  const source = await readFile(new URL("../../chrome/content/qFilters-list.js", import.meta.url), "utf8");
  const body = source.match(/findDuplicates: async function \(\) \{([\s\S]*?)\n  \} ,/)[1];
  let finish, scanned = 0, cleared = 0;
  const util = { popupProFeature(feature) {
    assert.equal(feature, "duplicatesFinder");
    return new Promise(resolve => { finish = resolve; });
  } };
  const find = vm.runInNewContext(`(async function () { ${body} })`, {
    quickFilters: { Util: util }, Components: { interfaces: { nsMsgFilterAction: {} } },
    document: { getElementById: () => ({}) },
  });
  const terms = [], actions = [];
  const list = { duplicateTerms: terms, duplicateActions: actions,
    get FilterList() { scanned++; return { filterCount: 0 }; },
    clearDuplicatePopup() { cleared++; return {}; },
  };
  const pending = find.call(list);
  assert.equal(scanned, 0); assert.equal(list.duplicateTerms, terms);
  finish(false); await pending;
  assert.equal(scanned, 0); assert.equal(cleared, 0);
  assert.equal(list.duplicateActions, actions);
  const allowed = find.call(list);
  finish(true); await allowed;
  assert.equal(scanned, 1); assert.equal(cleared, 1);
});
