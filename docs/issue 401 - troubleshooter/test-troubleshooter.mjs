import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { createReviewState } from "../../scripts/troubleshooter/state.mjs";
import { createFilterProblemTable } from "../../scripts/filter-review/warning-panel.mjs";

const source = await readFile(new URL("../../chrome/content/api/filtersAPI/troubleshooter.js", import.meta.url), "utf8");
function setup(appName = "Thunderbird", sessionValues = {}, licensed = true) {
  let used = 0;
  const types = { Incoming: 3, Periodic: 4, Manual: 8, InboxRule: 1, NewsRule: 2, PostOutgoing: 16, Archive: 32, PostPlugin: 64 };
  const actions = { MoveToFolder: 1, CopyToFolder: 2, Custom: 3 };
  const terms = [{ termAsString: "subject,contains,invoice", booleanAnd: true, beginsGrouping: false, endsGrouping: false }];
  const makeFilter = (name, values = {}) => ({
    filterName: name, enabled: true, filterType: types.Incoming, searchTerms: structuredClone(terms),
    actionCount: 0, getActionAt(index) { return this.actions[index]; }, ...values,
  });
  const filters = [
    makeFilter("No run settings", { filterType: 0 }),
    makeFilter("Manual only", { filterType: types.Manual }),
    makeFilter("Missing destination", { actionCount: 1, actions: [{ type: actions.MoveToFolder, targetFolderUri: "imap://mail/Missing" }] }),
    makeFilter("Missing provider", { actionCount: 1, actions: [{ type: actions.Custom, customId: "provider#action" }], searchTerms: [{ ...terms[0], attrib: -2, customId: "provider#term" }] }),
    makeFilter("Mixed", { searchTerms: [terms[0], { ...terms[0], booleanAnd: false, beginsGrouping: true }] }),
    makeFilter("Empty", { searchTerms: [] }),
  ];
  let writes = 0, dialogs = 0, nextId = 0, confirmed = true, failWrite = false;
  let editChoice = 1, rememberEdit = false, editWarnings = 0;
  const list = {
    get filterCount() { return filters.length; }, getFilterAt: index => filters[index],
    removeFilterAt(index) { filters.splice(index, 1); }, insertFilterAt(index, filter) { filters.splice(index, 0, filter); },
    saveToDefaultFile() { writes++; if (failWrite) { failWrite = false; throw Error("write failed"); } },
  };
  const account = { incomingServer: { type: "imap", canHaveFilters: true, rootMsgFolder: { getEditableFilterList: () => list } } };
  const main = { quickFilters: { Util: { getMsgFolderFromUri: () => null, hasPremiumLicense: () => true } }, openDialog() { dialogs++; } };
  const context = vm.createContext({
    ChromeUtils: { importESModule: () => ({ MailServices: { accounts: { getAccount: id => id === "a" ? account : null }, filters: { getCustomAction() { throw Error("missing"); }, getCustomTerm() { return null; } } } }) },
    Components: { interfaces: { nsMsgFilterType: types, nsMsgFilterAction: actions, nsMsgSearchAttrib: { Custom: -2 } } },
    Services: { appinfo: { name: appName }, uuid: { generateUUID: () => String(++nextId) }, wm: { getMostRecentWindow: () => main, getEnumerator: () => [] }, prompt: {
      confirm: () => confirmed,
      BUTTON_POS_0: 1, BUTTON_POS_1: 256, BUTTON_TITLE_IS_STRING: 127, BUTTON_TITLE_CANCEL: 2, BUTTON_POS_1_DEFAULT: 0x1000000,
      confirmEx(win, title, message, flags, button, unused1, unused2, checkLabel, checked) {
        assert(flags & 0x1000000, "Cancel is the default");
        editWarnings++; checked.value = rememberEdit; return editChoice;
      },
    } },
    getSessionStorage: () => ({
      get: async key => ({ [key]: sessionValues[key] }),
      set: async values => Object.assign(sessionValues, values),
    }),
    isTroubleshooterLicensed: () => licensed,
    consumeTroubleshooterUsage: () => {
      const allowed = used < 8;
      if (allowed) used++;
      return { allowed, used, remaining: 8 - used, maximum: 8 };
    },
    t: key => key, console,
  });
  vm.runInContext(source, context);
  const session = context.beginTroubleshooting();
  return { api: context, session, filters, list, types, counts: () => ({ writes, dialogs }), confirm: value => { confirmed = value; }, failSave: () => { failWrite = true; },
    editConsent(choice, remember = false) { editChoice = choice; rememberEdit = remember; },
    editWarningCount: () => editWarnings,
  };
}
const checks = ["runs", "folders", "addons", "conditions"];
test("Betterbird omits mixed-condition warnings but still checks for missing conditions", () => {
  const env = setup("Betterbird");
  assert.equal(env.api.getTroubleshooterInfo().supportsMixedConditions, true);
  for (const selection of [["conditions"], checks]) {
    const findings = env.api.scanFilters(env.session, "a", selection).findings;
    assert(!findings.some(item => item.reason === "mixed-conditions"));
    assert(findings.some(item => item.reason === "missing-conditions"));
  }
  assert.deepEqual(env.counts(), { writes: 0, dialogs: 0 });
});
test("scans report all four categories without writes; manual-only filters are not repaired", () => {
  const env = setup();
  const result = env.api.scanFilters(env.session, "a", checks);
  assert.equal(result.findings.length, 6);
  assert(!result.findings.some(item => item.filterName === "Manual only"));
  assert.equal(result.findings.filter(item => item.category === "addons").length, 2);
  assert.equal(result.findings.find(item => item.reason === "mixed-conditions").canEdit, true);
  assert.deepEqual(env.counts(), { writes: 0, dialogs: 0 });
});
test("mixed conditions use read-only termAsString; cancelling the warning does not open the editor", async () => {
  const env = setup(), mixed = env.api.scanFilters(env.session, "a", checks).findings.find(item => item.reason === "mixed-conditions");
  const conditions = env.api.getFilterConditionText(env.session, mixed.token);
  assert.equal(conditions.text, "AND (subject,contains,invoice) OR (subject,contains,invoice)");
  assert.equal(conditions.terms[1].beginsGrouping, 1);
  assert.equal((await env.api.remedyFilter(env.session, mixed.token, "edit")).changed, false);
  assert.deepEqual(env.counts(), { writes: 0, dialogs: 0 });
});
test("custom identifiers and availability are exposed independently of termAsString", () => {
  const env = setup(), findings = env.api.scanFilters(env.session, "a", ["addons"]).findings;
  const token = findings.find(item => item.reason === "missing-term").token;
  assert.equal(findings.find(item => item.reason === "missing-action").customId, "provider#action");
  env.filters[3].searchTerms[0].termAsString = ",contains";
  let term = env.api.getFilterConditionText(env.session, token).terms[0];
  assert.equal(term.customId, "provider#term");
  assert.equal(term.isCustom, true);
  assert.equal(term.customAvailable, false);
  env.filters[3].searchTerms[0].customId = "";
  term = env.api.getFilterConditionText(env.session, token).terms[0];
  assert.equal(term.customId, "");
  assert.equal(term.customAvailable, false);
});
test("only confirmed suppression is shared across review sessions; other confirmations remain active", async () => {
  const values = {}, env = setup("Thunderbird", values);
  const mixed = env.api.scanFilters(env.session, "a", checks).findings.find(item => item.reason === "mixed-conditions");
  env.editConsent(1, true);
  await env.api.remedyFilter(env.session, mixed.token, "edit");
  assert.deepEqual(values, {}, "Cancel cannot save the checkbox");
  env.editConsent(0, false);
  await env.api.remedyFilter(env.session, mixed.token, "edit");
  assert.deepEqual(values, {}, "Opening without checking cannot suppress warnings");
  env.editConsent(0, true);
  await env.api.remedyFilter(env.session, mixed.token, "edit");
  assert.equal(values["troubleshooter.skipMixedConditionsEditWarning"], true);
  const other = setup("Thunderbird", values);
  const token = other.api.scanFilters(other.session, "a", checks).findings.find(item => item.reason === "mixed-conditions").token;
  await other.api.remedyFilter(other.session, token, "edit");
  assert.equal(other.editWarningCount(), 0);
  assert.equal(other.counts().dialogs, 1);
  other.confirm(false);
  assert.equal(other.api.remedyFilter(other.session, token, "disable").changed, false);
  assert.equal(other.api.remedyFilter(other.session, token, "delete").changed, false);
  const restarted = setup();
  const restartedToken = restarted.api.scanFilters(restarted.session, "a", checks).findings.find(item => item.reason === "mixed-conditions").token;
  await restarted.api.remedyFilter(restarted.session, restartedToken, "edit");
  assert.equal(restarted.editWarningCount(), 1);
});
test("Betterbird and other named clients can edit mixed conditions without the Thunderbird warning", async () => {
  for (const name of ["Betterbird", "OtherMail"]) {
    const env = setup(name);
    env.filters[4].filterType = 0;
    const item = env.api.scanFilters(env.session, "a", ["runs"]).findings.find(item => item.filterName === "Mixed");
    await env.api.remedyFilter(env.session, item.token, "edit");
    assert.equal(env.editWarningCount(), 0);
    assert.equal(env.counts().dialogs, 1);
  }
});
test("disable requires confirmation and preserves terms; result remains review-needed", () => {
  const env = setup(), mixed = env.api.scanFilters(env.session, "a", checks).findings.find(item => item.reason === "mixed-conditions");
  const original = JSON.stringify(env.filters[4].searchTerms);
  env.confirm(false);
  assert.equal(env.api.remedyFilter(env.session, mixed.token, "disable").changed, false);
  assert.equal(env.filters[4].enabled, true);
  env.confirm(true);
  assert.equal(env.api.remedyFilter(env.session, mixed.token, "disable").changed, true);
  assert.equal(JSON.stringify(env.filters[4].searchTerms), original);
  assert.equal(env.api.scanFilters(env.session, "a", ["conditions"]).findings.find(item => item.token === mixed.token).state, "disabled");
});
test("incoming remedy never runs during a scan, requires confirmation, and refuses changed settings", () => {
  const env = setup(), finding = env.api.scanFilters(env.session, "a", checks).findings.find(item => item.category === "runs");
  env.confirm(false); env.api.remedyFilter(env.session, finding.token, "enableIncoming");
  assert.equal(env.filters[0].filterType, 0);
  env.confirm(true); env.api.remedyFilter(env.session, finding.token, "enableIncoming");
  assert.equal(env.filters[0].filterType, env.types.InboxRule);
  assert.throws(() => env.api.remedyFilter(env.session, finding.token, "enableIncoming"), /filterChanged/);
});
test("outgoing, archive and post-plugin filters already have a usable automatic trigger", () => {
  const env = setup();
  for (const type of [env.types.PostOutgoing, env.types.Archive, env.types.PostPlugin]) {
    env.filters[0].filterType = type;
    assert.equal(env.api.scanFilters(env.session, "a", ["runs"]).findings.length, 0);
  }
});
test("tokens reject removed/replaced filters, other sessions and expired sessions", () => {
  const env = setup(), finding = env.api.scanFilters(env.session, "a", checks).findings[0];
  const other = env.api.beginTroubleshooting();
  assert.throws(() => env.api.remedyFilter(other, finding.token, "disable"), /filterUnavailable/);
  env.filters[0] = { ...env.filters[0] };
  assert.throws(() => env.api.remedyFilter(env.session, finding.token, "disable"), /filterReplaced/);
  env.api.endTroubleshooting(env.session);
  assert.throws(() => env.api.scanFilters(env.session, "a", checks), /sessionExpired/);
  assert.equal(env.counts().writes, 0);
});
test("failed disable and delete saves restore the original in-memory state and file", () => {
  for (const remedy of ["disable", "delete"]) {
    const env = setup(), original = [...env.filters], finding = env.api.scanFilters(env.session, "a", checks).findings[0];
    env.failSave();
    assert.throws(() => env.api.remedyFilter(env.session, finding.token, remedy), /write failed/);
    assert.deepEqual(env.filters, original);
    assert.equal(env.filters[0].enabled, true);
    assert.equal(env.counts().writes, 2);
  }
});
test("inspection failures are reported rather than counted as a successful check", () => {
  const env = setup();
  Object.defineProperty(env.filters[0], "searchTerms", { get() { throw Error("broken terms"); } });
  assert(env.api.scanFilters(env.session, "a", ["conditions"]).findings.some(item => item.reason === "inspection-failed"));
});
test("new check actions replace results; remedy refresh distinguishes disabled, resolved and deleted findings", () => {
  const state = createReviewState();
  const a = { id: "a", token: "one", category: "conditions", state: "remaining", filterName: "Mixed" };
  state.replace({ checks: ["conditions", "folders", "addons", "runs"], findings: [a] });
  state.replace({ checks: ["folders"], findings: [] });
  assert.equal(state.findings.size, 0);
  assert.deepEqual([...state.checks], ["folders"]);
  state.replace({ checks: ["conditions"], findings: [a] });
  state.merge({ checks: ["conditions"], findings: [{ ...a, state: "disabled" }] });
  assert.equal(state.visible("", "remaining").length, 1);
  assert.equal(state.visible("", "resolved").length, 0);
  state.merge({ checks: ["conditions"], findings: [] });
  assert.equal(state.visible("", "resolved").length, 1);
  state.deleted("one");
  state.merge({ checks: ["conditions"], findings: [] });
  assert.equal(state.findings.get("a").state, "deleted");
});
test("shared compact table keeps remedies explicit and condition explanations expandable", () => {
  const nodes = [];
  const el = (tag, className = "", textContent = "") => {
    const node = { tag, className, textContent, children: [], dataset: {}, events: {},
      append(...children) { this.children.push(...children); },
      setAttribute(name, value) { this[name] = value; },
      addEventListener(name, callback) { this.events[name] = callback; },
    };
    nodes.push(node); return node;
  };
  let disabled = 0;
  const problem = { id: "mixed", filterName: "Mixed", reason: "mixed-conditions", state: "disabled" };
  createFilterProblemTable({
    el, problems: [problem], text: key => key,
    renderCheck: () => el("img"), renderDetails: () => el("p", "", "Explanation"),
    getActions: () => [{ label: "View conditions", run: () => {} }, { label: "Disable", run: () => disabled++ }],
  });
  assert.equal(disabled, 0, "rendering cannot apply a remedy");
  assert.equal(nodes.filter(node => node.tag === "details").length, 1);
  assert(nodes.some(node => node.textContent === "state.disabled"));
  assert(!nodes.some(node => node.tag === "button" && /Edit/.test(node.textContent)));
  nodes.find(node => node.tag === "button" && node.textContent === "Disable").events.click();
  assert.equal(disabled, 1);
});
test("live page messages and relative assets exist; ATN release notes use supported tags", async () => {
  const root = new URL("../../", import.meta.url);
  const page = await readFile(new URL("html/filter-troubleshooter.html", root), "utf8");
  const catalog = JSON.parse(await readFile(new URL("_locales/en/messages.json", root), "utf8"));
  const common = new Set(["account", "edit"]);
  for (const [, key] of page.matchAll(/data-i18n="([^"]+)"/g)) assert(common.has(key) || catalog[`troubleshooter.${key}`], key);
  for (const [, asset] of page.matchAll(/(?:src|href)="([^"]+)"/g)) await readFile(new URL(asset, new URL("html/filter-troubleshooter.html", root)));
  for (const asset of ["runFilters-selected.svg", "folder-error.svg", "extensions.svg"]) await readFile(new URL(`chrome/content/skin/${asset}`, root));
  const whitelist = new Set(["a", "abbr", "acronym", "b", "blockquote", "code", "em", "i", "li", "ol", "strong", "ul"]);
  const notes = await readFile(new URL("release-notes.html", root), "utf8");
  for (const [, tag] of notes.matchAll(/<\/?([a-z][\w-]*)\b/gi)) assert(whitelist.has(tag), tag);
});
test("troubleshooter localization respects locale scope and preserves placeholders", async () => {
  const base = new URL("../../_locales/", import.meta.url);
  const english = JSON.parse(await readFile(new URL("en/messages.json", base), "utf8"));
  const entries = Object.entries(english).filter(([key]) => key.startsWith("troubleshooter."));
  for (const locale of await readdir(base)) {
    const catalog = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readFile(new URL(`${locale}/messages.json`, base))));
    if (catalog._l10nstatus.message === "SPLASH") {
      assert(!Object.keys(catalog).some(key => key.startsWith("troubleshooter.")), locale);
      continue;
    }
    for (const [key, entry] of entries) {
      assert(catalog[key]?.message, `${locale}: missing ${key}`);
      assert(!/\uFFFD|\?{2,}|[\p{L}]\?[\p{L}]/u.test(catalog[key].message), `${locale}: damaged UTF-8 in ${key}`);
      assert.deepEqual(catalog[key].placeholders, entry.placeholders, `${locale}: ${key}`);
      assert.deepEqual([...catalog[key].message.matchAll(/\$\w+\$/g)].map(m => m[0]).sort(), [...entry.message.matchAll(/\$\w+\$/g)].map(m => m[0]).sort(), `${locale}: ${key}`);
    }
  }
});


test("eight trials count first check per tab; repeat checks remain allowed at zero", () => {
  const env = setup("Thunderbird", {}, false);
  assert.equal(env.api.getTroubleshooterInfo().licensed, false, "stale legacy license cache cannot bypass trials");
  env.api.endTroubleshooting(env.api.beginTroubleshooting());
  for (let index = 0; index < 8; index++) {
    const tab = env.api.beginTroubleshooting();
    assert.equal(env.api.scanFilters(tab, "a", ["runs"]).trial.remaining, 7 - index);
    for (const check of checks) {
      const result = env.api.scanFilters(tab, "a", [check]);
      assert.equal(result.trial.used, index + 1);
      assert.notEqual(result.allowed, false);
    }
    env.api.endTroubleshooting(tab);
  }
  assert.equal(env.api.scanFilters(env.session, "a", checks).allowed, false);
  assert.equal(env.api.scanFilters(env.session, "a", checks).trial.used, 8);
});

test("valid Pro license bypasses trial consumption", () => {
  const env = setup();
  for (let index = 0; index < 10; index++) {
    assert.equal(env.api.scanFilters(env.api.beginTroubleshooting(), "a", checks).trial, null);
  }
});
