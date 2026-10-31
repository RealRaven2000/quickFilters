import assert from "node:assert/strict";
import { getMessage } from "./test-i18n.mjs";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { accountFromUri, accountIdentity, canonicalHost, normalizeBackup, initialMappings, rememberedMappings } from "../../scripts/backup/restore-format.mjs";

const rule = (name, actions = [], terms = []) => ({ filterName: name, filterDesc: "Saved description", filterType: 17, temporary: false, enabled: true, actionList: actions, searchTerms: terms });
const source = { id: "source-a", name: "Old personal", type: "imap", username: "alice@example.com", hostname: "old.example", rootUri: "imap://alice%40example.com@old.example", localFolders: false };
const reference = { id: "source-b", name: "Old archive", type: "imap", username: "archive", hostname: "archive.old", rootUri: "imap://archive@archive.old", localFolders: false };
const envelope = accounts => ({ format: "quickFilters-backup", formatVersion: 1, accounts, referencedAccounts: [] });

test("legacy adapter decodes URI components once and recovers referenced accounts", () => {
  const file = { accountName: source.rootUri, rootFolderURL: "file:///not-a-portable-server", filters: [rule("Move", [{ type: 1, targetFolderUri: reference.rootUri + "/Archive" }])] };
  const normalized = normalizeBackup(file);
  assert.equal(normalized.kind, "legacy-single-account");
  assert.equal(normalized.accounts[0].username, "alice@example.com");
  assert.equal(normalized.accounts[0].hostname, "old.example");
  assert.equal(normalized.referencedAccounts.length, 1);
  assert.equal(normalized.referencedAccounts[0].username, "archive");
  assert.equal(normalized.referencedAccounts[0].filters, undefined);
  assert.equal(accountFromUri("imap://a%2540b+tag@EXAMPLE.COM/Folder").username, "a%40b+tag");
  assert.equal(accountFromUri("mailbox://nobody@Local%20Folders/Archive").localFolders, true);
  assert.equal(accountFromUri("file:///path/to/profile"), null);
  assert.equal(accountFromUri("imap://bad%ZZ@example.com/Folder"), null);
});

test("new metadata is raw; hostname canonicalization does not rewrite usernames", () => {
  const account = { ...source, username: "literal%40+Case", hostname: "BÜCHER.example" };
  const normalized = normalizeBackup(envelope([{ ...account, filters: [rule("Keep")] }]));
  assert.equal(normalized.accounts[0].username, "literal%40+Case");
  assert.equal(canonicalHost(account.hostname), "xn--bcher-kva.example");
  assert.equal(accountIdentity(account), accountIdentity({ ...account, name: "Renamed", id: "another-id", hostname: "xn--bcher-kva.example" }));
  assert.notEqual(accountIdentity(account), accountIdentity({ ...account, username: "literal%40+case" }));
  const early = normalizeBackup(envelope([{ ...source, hostname: "", filters: [] }]));
  assert.equal(early.accounts[0].hostname, source.hostname);
});

test("bad versions, duplicate account identifiers and malformed filters are rejected before restore", () => {
  assert.throws(() => normalizeBackup({ ...envelope([]), formatVersion: 9 }), /Unsupported/);
  assert.throws(() => normalizeBackup(envelope([{ ...source, filters: [] }, { ...source, filters: [] }])) , /Duplicate account/);
  assert.throws(() => normalizeBackup(envelope([{ ...source, filters: [{ filterName: "Bad" }] }])), /Invalid filter/);
});

test("matching requires type, username and host, preserves remembered choices and detects missing destinations", () => {
  const backup = normalizeBackup(envelope([{ ...source, filters: [rule("A")] }]));
  const target = { ...source, id: "target-a", name: "Arbitrary destination name", hostname: "OLD.EXAMPLE" };
  const matched = initialMappings(backup, [target]);
  assert.equal(matched.mappings.get(source.id), target.id);
  assert(matched.selected.has(source.id));
  assert.equal(initialMappings(backup, [{ ...target, hostname: "different" }]).mappings.size, 0);
  assert.equal(initialMappings(backup, [target, { ...target, id: "duplicate-target" }]).mappings.size, 0);
  const manualTarget = { ...target, hostname: "new.example" };
  const saved = rememberedMappings(backup, [manualTarget], new Map([[source.id, manualTarget.id]]), new Set());
  const remembered = initialMappings(backup, [manualTarget], saved);
  assert.equal(remembered.mappings.get(source.id), manualTarget.id);
  assert(!remembered.selected.has(source.id));
  const gone = initialMappings(backup, [{ ...manualTarget, id: "replacement-id" }], saved);
  assert.equal(gone.mappings.size, 0);
  assert.equal(gone.statuses.get(source.id), "Destination missing");
  const unassigned = rememberedMappings(backup, [target], new Map(), new Set());
  const next = initialMappings(backup, [target], unassigned);
  assert.equal(next.mappings.size, 0);
  assert.equal(next.statuses.get(source.id), "Choose destination");
});

test("remembered mappings have priority over automatic matches; Local Folders matches specially", () => {
  const a = { ...source, filters: [] };
  const b = { ...reference, filters: [] };
  const backup = normalizeBackup(envelope([a, b]));
  const target = { ...source, id: "target-a" };
  const saved = [{ sourceIdentity: accountIdentity(b), targetId: target.id, targetIdentity: accountIdentity(target), selected: true }];
  const initial = initialMappings(backup, [target], saved);
  assert.equal(initial.mappings.get(b.id), target.id);
  assert(!initial.mappings.has(a.id));
  const local = { id: "local", name: "Local Folders", localFolders: true, filters: [] };
  assert.equal(initialMappings({ accounts: [local], referencedAccounts: [] }, [{ ...local, id: "destination-local" }]).mappings.get("local"), "destination-local");
});

async function nativeRestore() {
  const script = await readFile(new URL("../../chrome/content/api/Utilities/restore.js", import.meta.url), "utf8");
  const folders = new Map(), lists = new Map();
  const customActions = new Set(), customTerms = new Set();
  let serial = 0, refreshed = 0, edited;
  function filter(name) {
    return { filterName: name, actionList: [], searchTerms: [],
      createAction: () => ({ get customAction() { throw new Error("Must not access a missing implementation"); } }),
      appendAction(action) { this.actionList.push(action); },
      createTerm: () => ({ value: {}, beginsGrouping: 0, endsGrouping: 0 }),
      appendTerm(term) { this.searchTerms.push(term); },
    };
  }
  function list(initial) {
    return { filters: initial, saved: [...initial], saves: 0, failSaves: 0,
      get filterCount() { return this.filters.length; },
      getFilterAt(index) { return this.filters[index]; },
      createFilter: filter,
      removeFilterAt(index) { this.filters.splice(index, 1); },
      insertFilterAt(index, item) { this.filters.splice(index, 0, item); },
      saveToDefaultFile() {
        this.saves++;
        if (this.failSaves > 0) { this.failSaves--; throw new Error("Disk write failed"); }
        this.saved = [...this.filters];
      },
    };
  }
  function folder(uri, children = {}) {
    const node = { URI: uri, canFileMessages: true, children, getChildNamed(name) { if (!this.children[name]) { throw new Error("Folder not found"); } return this.children[name]; } };
    folders.set(uri, node);
    return node;
  }
  const archive = folder("imap://new-archive@new.example/Archive");
  archive.children["Café"] = folder("imap://new-archive@new.example/Archive/Caf%C3%A9");
  const rootA = folder("imap://new-personal@new.example");
  const rootB = folder("imap://new-archive@new.example", { Archive: archive });
  const keep = filter("Untouched"), replace = filter("Replace");
  lists.set("target-a", list([keep, replace])); lists.set("target-b", list([]));
  rootA.getEditableFilterList = () => lists.get("target-a"); rootB.getEditableFilterList = () => lists.get("target-b");
  const accounts = new Map([["target-a", { incomingServer: { canHaveFilters: true, rootMsgFolder: rootA } }], ["target-b", { incomingServer: { canHaveFilters: true, rootMsgFolder: rootB } }]]);
  const win = { quickFilters: { Util: { popupProFeature: async () => true, getMsgFolderFromUri: uri => folders.get(uri) || null } },
    openDialog(_url, _name, _options, args) { edited = args.filter; args.refresh = true; },
  };
  const dialog = { quickFilters: { List: { rebuildFilterList: () => refreshed++ } } };
  const context = vm.createContext({
    t: getMessage,
    Services: { wm: { getMostRecentWindow: () => win, getEnumerator: type => type === "mailnews:filterlist" ? [dialog] : [win] }, uuid: { generateUUID: () => String(++serial) }, io: { newURI: value => ({ asciiHost: new URL(value).hostname }) } },
    Components: { interfaces: { nsMsgFilterAction: { MoveToFolder: 1, CopyToFolder: 16, Custom: 20 }, nsMsgSearchAttrib: { Custom: 99 } } },
    ChromeUtils: { importESModule: () => ({ MailServices: {
      accounts: { getAccount: id => accounts.get(id) },
      filters: { getTempFilterList: () => list([]), getCustomAction: id => customActions.has(id) ? { id } : null, getCustomTerm: id => customTerms.has(id) ? { id } : null },
    } }) }, console,
  });
  vm.runInContext(script, context);
  return { api: context, setLicenseGate: gate => { win.quickFilters.Util.popupProFeature = gate; }, lists, customActions, customTerms, original: [keep, replace], get refreshed() { return refreshed; }, get edited() { return edited; } };
}

function request(filters) {
  return { backup: { accounts: [{ ...source, filters }], referencedAccounts: [reference] }, mappings: [[source.id, "target-a"], [reference.id, "target-b"]], selected: [source.id] };
}

test("restore replaces in place, adds new filters, preserves others and skips only later duplicate names", async () => {
  const env = await nativeRestore();
  const first = rule("New"), duplicate = rule("New", [{ type: 17, strValue: "different" }]);
  const result = await env.api.restoreFilters(request([rule("Replace"), first, duplicate]));
  assert.equal(result.added, 1); assert.equal(result.replaced, 1); assert.equal(result.skipped, 1);
  const list = env.lists.get("target-a");
  assert.deepEqual(list.filters.map(filter => filter.filterName), ["New", "Untouched", "Replace"]);
  assert.equal(list.filters[1], env.original[0]);
  assert.notEqual(list.filters[2], env.original[1]);
  assert.equal(list.filters[0].actionList.length, 0);
  assert.equal(result.warnings[0].reason, "duplicate-filter-name");
  assert.equal(result.warnings[0].importedToken, undefined);
  assert.deepEqual(result.warnings[0].sourceFilter, duplicate);
  assert.equal(list.saves, 1); assert(env.refreshed > 0);
});

test("cross-account folder mapping resolves real folders and decodes each path segment once", async () => {
  const env = await nativeRestore();
  const action = { type: 1, targetFolderUri: reference.rootUri + "/Archive/Caf%C3%A9" };
  const input = request([rule("Cross account", [action])]);
  const before = JSON.stringify(input);
  const result = await env.api.restoreFilters(input);
  assert.equal(result.warnings.length, 0);
  assert.equal(env.lists.get("target-a").filters[0].actionList[0].targetFolderUri, "imap://new-archive@new.example/Archive/Caf%C3%A9");
  assert.equal(JSON.stringify(input), before);
  assert.equal(env.lists.get("target-b").filterCount, 0);
});

test("missing folders and unmapped target accounts import original actions with editable warnings", async () => {
  const env = await nativeRestore();
  const missing = reference.rootUri + "/Missing";
  const unknown = "imap://removed@old.example/Archive";
  const result = await env.api.restoreFilters(request([rule("Replace", [{ type: 1, targetFolderUri: missing }, { type: 16, targetFolderUri: unknown }])]));
  assert.equal(result.replaced, 1); assert.equal(result.skipped, 0);
  assert.equal(result.warnings.length, 2);
  assert.equal(result.warnings[0].reason, "invalid-target-folder");
  assert.equal(result.warnings[1].reason, "unknown-target-account");
  const imported = env.lists.get("target-a").filters.find(filter => filter.filterName === "Replace");
  assert.equal(imported.actionList[0].targetFolderUri, missing);
  assert.equal(imported.actionList[1].targetFolderUri, unknown);
  assert.equal(imported.enabled, true);
  env.api.editImportedFilter(result.warnings[0].importedToken);
  assert.equal(env.edited, imported);
});

test("missing custom action and term retain IDs, values, enabled state and duplicate condition structure", async () => {
  const env = await nativeRestore();
  const term = { attrib: 99, op: 0, customId: "missing-term", value: { attrib: 99, str: "original value" }, booleanAnd: false, beginsGrouping: 2, endsGrouping: 0 };
  const saved = rule("Custom", [{ type: 20, customId: "missing-action", strValue: "payload" }], [term, { ...term, beginsGrouping: 0, endsGrouping: 2 }]);
  const result = await env.api.restoreFilters(request([saved]));
  assert.equal(result.added, 1); assert.equal(result.skipped, 0);
  const imported = env.lists.get("target-a").filters[0];
  assert.equal(imported.actionList[0].customId, "missing-action"); assert.equal(imported.actionList[0].strValue, "payload");
  assert.equal(imported.searchTerms.length, 2); assert.equal(imported.searchTerms[0].customId, "missing-term");
  assert.equal(imported.searchTerms[0].value.str, "original value"); assert.equal(imported.searchTerms[0].op, 0);
  assert.equal(imported.searchTerms[0].beginsGrouping, 2); assert.equal(imported.searchTerms[1].endsGrouping, 2);
  assert.equal(imported.enabled, true);
  assert(result.warnings.some(warning => warning.reason === "custom-action-unavailable" && warning.customId === "missing-action"));
  assert(result.warnings.some(warning => warning.reason === "custom-term-unavailable" && warning.customId === "missing-term"));
  assert(result.warnings.every(warning => warning.importedToken));
  env.lists.get("target-a").filters.shift();
  assert.throws(() => env.api.editImportedFilter(result.warnings[0].importedToken), /removed or replaced/);
});

test("bad mappings do not write; failed save restores the original list and reports failure", async () => {
  const env = await nativeRestore();
  const invalid = request([rule("New")]); invalid.mappings[1][1] = "target-a";
  await assert.rejects(() => env.api.restoreFilters(invalid), /distinct destination/);
  assert.equal(env.lists.get("target-a").saves, 0);
  env.lists.get("target-a").failSaves = 1;
  const result = await env.api.restoreFilters(request([rule("Replace"), rule("New")]));
  assert.equal(result.success, false); assert.equal(result.failed, 1); assert.equal(result.added, 0); assert.equal(result.replaced, 0);
  assert.deepEqual(env.lists.get("target-a").filters, env.original);
  assert.deepEqual(env.lists.get("target-a").saved, env.original);
  assert.equal(result.warnings[0].reason, "account-restore-failed");
});

test("an unserializable filter is skipped without replacing its existing namesake", async () => {
  const env = await nativeRestore();
  const invalid = { ...rule("Replace"), unparseable: true };
  const result = await env.api.restoreFilters(request([invalid]));
  assert.equal(result.skipped, 1); assert.equal(result.replaced, 0);
  assert.equal(env.lists.get("target-a").filters[1], env.original[1]);
  assert.equal(env.lists.get("target-a").saves, 0);
});

test("new match-all metadata is preserved without changing operator zero", async () => {
  const env = await nativeRestore();
  const term = { attrib: 0, op: 0, value: { attrib: 0, str: "" }, matchAll: true, booleanAnd: true };
  const result = await env.api.restoreFilters(request([rule("All mail", [], [term])]));
  assert.equal(result.added, 1);
  assert.equal(env.lists.get("target-a").filters[0].searchTerms[0].matchAll, true);
});

test("Local Folders URI remains mappable despite its non-DNS hostname", async () => {
  const env = await nativeRestore();
  const input = request([rule("Local destination", [{ type: 1, targetFolderUri: "mailbox://nobody@Local%20Folders/Archive" }])]);
  input.backup.referencedAccounts[0] = { ...reference, rootUri: "mailbox://nobody@Local%20Folders" };
  const result = await env.api.restoreFilters(input);
  assert.equal(result.warnings.length, 0);
  assert.equal(env.lists.get("target-a").filters[0].actionList[0].targetFolderUri, "imap://new-archive@new.example/Archive");
});

test("installed custom features produce no missing-feature warnings", async () => {
  const env = await nativeRestore();
  env.customActions.add("installed-action"); env.customTerms.add("installed-term");
  const result = await env.api.restoreFilters(request([rule("Installed", [{ type: 20, customId: "installed-action", strValue: "value" }], [{ attrib: 99, customId: "installed-term", value: { attrib: 99, str: "condition" } }])]));
  assert.equal(result.added, 1);
  assert.equal(result.warnings.length, 0);
});

test("multi-account save failure reports partial completion without losing another account's successful restore", async () => {
  const env = await nativeRestore();
  const input = request([rule("Personal addition")]);
  input.backup.accounts.push({ ...reference, filters: [rule("Archive addition")] });
  input.backup.referencedAccounts = [];
  input.selected.push(reference.id);
  env.lists.get("target-b").failSaves = 1;
  const result = await env.api.restoreFilters(input);
  assert.equal(result.success, false); assert.equal(result.failed, 1); assert.equal(result.added, 1);
  assert.equal(env.lists.get("target-a").saved[0].filterName, "Personal addition");
  assert.equal(env.lists.get("target-b").saved.length, 0);
});

test("missing folder under mapped Local Folders is a folder warning, not an account warning", async () => {
  const env = await nativeRestore();
  const uri = "mailbox://nobody@Local%20Folders/testLocal";
  const input = request([rule("Missing local folder", [{ type: 1, targetFolderUri: uri }])]);
  input.backup.referencedAccounts[0] = { ...reference, rootUri: "mailbox://nobody@Local%20Folders" };
  const result = await env.api.restoreFilters(input);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].reason, "invalid-target-folder");
  assert.match(result.warnings[0].details, /testLocal/);
  assert.equal(env.lists.get("target-a").filters[0].actionList[0].targetFolderUri, uri);
});

test("delete removes only the exact imported filter and invalidates its review token", async () => {
  const env = await nativeRestore();
  const result = await env.api.restoreFilters(request([rule("Custom", [{ type: 20, customId: "missing" }])]));
  const token = result.warnings[0].importedToken;
  assert.equal(env.api.deleteImportedFilter(token), true);
  assert.deepEqual(env.lists.get("target-a").filters, env.original);
  assert.deepEqual(env.lists.get("target-a").saved, env.original);
  assert.throws(() => env.api.deleteImportedFilter(token), /no longer available/);
});

test("delete refuses a stale filter and restores the list if saving fails", async () => {
  const env = await nativeRestore();
  const result = await env.api.restoreFilters(request([rule("Custom", [{ type: 20, customId: "missing" }])]));
  const token = result.warnings[0].importedToken;
  const list = env.lists.get("target-a");
  const original = [...list.filters];
  const save = list.saveToDefaultFile;
  list.saveToDefaultFile = () => { throw new Error("Disk full"); };
  assert.throws(() => env.api.deleteImportedFilter(token), /Disk full/);
  assert.deepEqual(list.filters, original);
  list.saveToDefaultFile = save;
  list.filters.shift();
  assert.throws(() => env.api.deleteImportedFilter(token), /removed or replaced/);
});

test("overwrite off keeps existing native filters and imports only new names", async () => {
  const env = await nativeRestore();
  const input = request([rule("Replace", [{ type: 20, customId: "missing" }]), rule("New")]);
  input.overwriteExisting = false;
  const result = await env.api.restoreFilters(input);
  assert.equal(result.kept, 1);
  assert.equal(result.accounts[0].kept, 1);
  assert.equal(result.added, 1);
  assert.equal(result.replaced, 0);
  assert.equal(result.warnings.length, 0);
  assert.equal(env.lists.get("target-a").filters[2], env.original[1]);
});

test("backup review can register an existing filter for the same exact-object edit/delete helpers", async () => {
  const env = await nativeRestore();
  const token = env.api.registerReviewFilter(env.original[0], "target-a");
  assert.equal(env.api.editImportedFilter(token), true);
  assert.equal(env.edited, env.original[0]);
  assert.equal(env.api.deleteImportedFilter(token), true);
  assert.equal(env.lists.get("target-a").filters.length, 1);
  assert.equal(env.lists.get("target-a").filters[0], env.original[1]);
});

test("restore waits for the async Pro gate and cannot change filters when denied", async () => {
  const env = await nativeRestore();
  let resolveGate;
  env.setLicenseGate(feature => {
    assert.equal(feature, "loadFilters");
    return new Promise(resolve => { resolveGate = resolve; });
  });
  const pending = env.api.restoreFilters(request([rule("New")]));
  assert.equal(env.lists.get("target-a").saves, 0);
  resolveGate(false);
  assert.equal(await pending, null);
  assert.deepEqual(env.lists.get("target-a").filters, env.original);
  assert.equal(env.lists.get("target-a").saves, 0);
  env.setLicenseGate(async () => { throw new Error("License check failed"); });
  await assert.rejects(env.api.restoreFilters(request([rule("New")])), /License check failed/);
  assert.equal(env.lists.get("target-a").saves, 0);
  env.setLicenseGate(async () => true);
  assert.equal((await env.api.restoreFilters(request([rule("New")]))).added, 1);
});
