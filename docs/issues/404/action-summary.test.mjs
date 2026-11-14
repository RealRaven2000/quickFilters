import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";

const root = new URL("../../../", import.meta.url);
const source = readFileSync(new URL("chrome/content/api/filtersAPI/action-summary.js", root), "utf8");
const assistantSource = readFileSync(new URL("html/assistant-dlg.js", root), "utf8");
const apiSource = readFileSync(new URL("chrome/content/api/filtersAPI/implementation.js", root), "utf8");

function experiment({ failSummary = false, missingLocalization = false } = {}) {
  const loaded = [];
  let summaryInitializations = 0;
  class NativeLocalization {}
  const folder = { server: { key: "server1" }, getEditableFilterList: () => ({ filterCount: 1,
    getFilterAt: () => ({ filterName: "Merge target", enabled: true }) }) };
  const win = { Localization: missingLocalization ? undefined : NativeLocalization,
    quickFilters: { Util: { getMsgFolderFromUri: () => folder, logDebug() {} },
    Preferences: { getBoolPref: () => false } } };
  const scope = vm.createContext({
    console: { log() {}, warn() {} }, IOUtils: {},
    Components: { interfaces: { nsMsgFilterAction: {} } },
    Services: {
      wm: { getMostRecentWindow: () => win }, prefs: {},
      scriptloader: { loadSubScriptWithOptions(path, { target }) {
        loaded.push(path);
        if (path.endsWith("usage-store.js")) target.quickFiltersPremium.createUsageStore = () => ({});
        if (path.endsWith("troubleshooter.js")) target.createTroubleshooterAPI = () => ({});
        if (path.endsWith("action-summary.js")) {
          if (failSummary) throw new Error("Summary initialization failed");
          target.createFilterActionSummary = ({ Localization }) => {
            summaryInitializations++;
            assert.equal(Localization, NativeLocalization);
            return async () => ({ actions: [] });
          };
        }
      } } },
    ChromeUtils: { importESModule(path) {
      if (path.endsWith("ExtensionCommon.sys.mjs")) return { ExtensionCommon: { ExtensionAPI: class {} } };
      assert.equal(path, "resource:///modules/MailServices.sys.mjs");
      return { MailServices: {} };
    } },
  });
  vm.runInContext(apiSource, scope);
  const api = new scope.FiltersAPI().getAPI({ extension: { rootURI: { resolve: path => path },
    localeData: { localizeMessage: key => key } } }).FiltersAPI;
  return { api, loaded, get summaryInitializations() { return summaryInitializations; } };
}

test("failed summary initialization cannot prevent discovery of merge targets", async () => {
  const { api, loaded } = experiment({ failSummary: true });
  assert.ok(!loaded.some(path => path.endsWith("action-summary.js")));
  assert.equal((await api.getFilters("imap://example"))[0].filterName, "Merge target");
  await assert.rejects(api.getFilterActionText({ accountId: "server1", filterName: "Example" }), /Summary initialization failed/);
  assert.equal((await api.getFilters("imap://example"))[0].filterName, "Merge target");
});

test("summary initialization reuses the mail window Localization constructor without a sandbox", async () => {
  const fixture = experiment();
  const { api } = fixture;
  await api.getFilterActionText({ accountId: "server1", filterName: "Example" });
  await api.getFilterActionText({ accountId: "server1", filterName: "Example" });
  assert.equal(fixture.summaryInitializations, 1);
});

test("missing window Localization affects only summaries, not merge discovery", async () => {
  const { api } = experiment({ missingLocalization: true });
  await assert.rejects(api.getFilterActionText({ accountId: "server1", filterName: "Example" }), /Localization unavailable/);
  assert.equal((await api.getFilters("imap://example"))[0].filterName, "Merge target");
});

function service(actions, { duplicate = false } = {}) {
  const FA = { MoveToFolder: 1, ChangePriority: 2, MarkRead: 4, AddTag: 17, Custom: 20 };
  const filter = { filterName: "Example", enabled: false, actionCount: actions.length, getActionAt: i => actions[i] };
  const list = { filterCount: duplicate ? 2 : 1, getFilterAt: () => filter };
  const resources = [];
  const requests = [];
  const scope = vm.createContext({});
  vm.runInContext(source, scope);
  const get = scope.createFilterActionSummary({
    Components: { interfaces: { nsMsgFilterAction: FA, nsMsgPriority: { high: 5 } } },
    MailServices: {
      accounts: { accounts: [{ key: "account1", incomingServer: { key: "server1", serverURI: "imap://example",
        canHaveFilters: true, rootMsgFolder: { getEditableFilterList: () => list } } }] },
      tags: { getTagForKey: () => "Localized tag" },
      filters: { getCustomAction: id => id === "present" ? { name: "Provider action" } : null },
    },
    ChromeUtils: { importESModule(path) {
      assert.equal(path, "resource:///modules/MailUtils.sys.mjs");
      return { MailUtils: { getExistingFolder: uri => uri === "missing" ? null :
        { prettyName: "Inbox", parent: { prettyName: "Account", parent: null } } } };
    } },
    Localization: class {
        constructor(files) { resources.push(...files); }
        async formatMessages([{ id }]) {
          requests.push(id);
          return [{ attributes: [{ name: "label", value: `native:${id}` }] }];
        }
    },
    t: key => key,
  });
  return { get, resources, requests };
}

test("uses native localized labels with folder paths, tags and priority values in stored order", async () => {
  const { get, resources, requests } = service([
    { type: 1, targetFolderUri: "imap://destination" }, { type: 4 },
    { type: 17, strValue: "$label1" }, { type: 2, priority: 5 },
  ]);
  const result = await get({ accountId: "server1", filterName: "Example" });
  assert.equal(result.enabled, false);
  assert.deepEqual(Array.from(result.actions), ["native:rule-action-move: Account » Inbox", "native:rule-action-read",
    "native:rule-action-tag: Localized tag", "native:rule-action-priority: native:rule-priority-high"]);
  assert.ok(resources.includes("messenger/searchWidgets.ftl"));
  assert.ok(requests.includes("rule-action-read"));
});

test("keeps missing destinations and custom provider IDs visible, without dropping subsequent actions", async () => {
  const { get } = service([{ type: 1, targetFolderUri: "missing" },
    { type: 20, customId: "absent", strValue: "value" },
    { type: 20, customId: "present", strValue: "value" }, { type: 999 }, { type: 4 }]);
  const result = await get({ accountId: "account1", filterName: "Example" });
  assert.deepEqual(Array.from(result.actions), ["native:rule-action-move: missing", "absent: value",
    "Provider action: value", "assistant.merge.actionsUnavailable", "native:rule-action-read"]);
});

test("rejects missing or ambiguous filters instead of summarizing an arbitrary target", async () => {
  const { get } = service([]);
  await assert.rejects(get({ accountId: "absent", filterName: "Example" }), /account unavailable/);
  await assert.rejects(get({ accountId: "server1", filterName: "absent" }), /unavailable/);
  await assert.rejects(service([], { duplicate: true }).get({ accountId: "server1", filterName: "Example" }), /ambiguous/);
});

function assistant() {
  const elements = new Map();
  const element = () => ({ textContent: "", children: [], hidden: true, checked: true,
    classList: { toggle(name, value) { this[name] = value; } },
    replaceChildren() { this.children = []; }, appendChild(child) { this.children.push(child); } });
  const document = { getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    createElement: element };
  const pending = [];
  const scope = vm.createContext({ quickFilters: {}, document, console,
    messenger: { i18n: { getMessage: key => key }, FiltersAPI: { getFilterActionText: () =>
      new Promise((resolve, reject) => pending.push({ resolve, reject })) } } });
  vm.runInContext(assistantSource, scope);
  const api = scope.quickFilters.Assistant;
  api.mergeCandidates = [{ accountId: "server1", filterName: "First" }, { accountId: "server1", filterName: "Second" }];
  api.MatchedFilters.selectedIndex = 0;
  return { api, pending, node: id => document.getElementById(id) };
}

test("Cancel sends immediately without debug awaits, and closes only after acknowledgement", async () => {
  const events = [];
  let acknowledge;
  const scope = vm.createContext({ quickFilters: {}, console,
    window: { close() { events.push("close"); } },
    browser: { runtime: { sendMessage(data) {
      events.push(data.result);
      return new Promise(resolve => { acknowledge = resolve; });
    } } },
  });
  vm.runInContext(assistantSource, scope);
  const api = scope.quickFilters.Assistant;
  const cancel = api.cancelTemplate();
  assert.deepEqual(events, ["cancelled"]);
  await api.cancelTemplate(true);
  assert.deepEqual(events, ["cancelled"]);
  acknowledge();
  await cancel;
  assert.deepEqual(events, ["cancelled", "close"]);
});

test("an earlier response cannot replace the newly selected filter summary", async () => {
  const { api, pending, node } = assistant();
  const first = api.updateMergeActionSummary();
  api.MatchedFilters.selectedIndex = 1;
  const second = api.updateMergeActionSummary();
  pending[1].resolve({ filterName: "Second", actions: ["Second action"] });
  await second;
  pending[0].resolve({ filterName: "First", actions: ["First action"] });
  await first;
  assert.equal(node("mergeSelectedName").textContent, "Second");
  assert.equal(node("mergeSelectedActions").children[0].textContent, "Second action");
});

test("create-new keeps the selected summary dimmed even when its request is still pending", async () => {
  const { api, pending, node } = assistant();
  const loading = api.updateMergeActionSummary();
  api.selectCreateNew({ checked: true });
  pending[0].resolve({ filterName: "First", actions: ["Retained action"] });
  await loading;
  assert.equal(node("mergeActionSummary").hidden, false);
  assert.equal(node("mergeActionSummary").classList.inactive, true);
  assert.equal(node("mergeSelectedActions").children[0].textContent, "Retained action");
  assert.equal(node("mergeActionStatus").textContent, "");
});
