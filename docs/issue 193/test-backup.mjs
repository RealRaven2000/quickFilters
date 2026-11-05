// Run with: node --test "docs/issue 193/test-backup.mjs"
import assert from "node:assert/strict";
import { getMessage } from "./test-i18n.mjs";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { createBackup, classifyBackup, suggestedFilename, sanitizeFilename } from "../../scripts/backup/backup-format.mjs";
import { getBackupStorage, rememberBackupSelection, recordRecentFile } from "../../scripts/backup/backup-storage.mjs";
import { initBackupPage } from "../../scripts/backup/backup-page.mjs";
import { createWarningPanel } from "../../scripts/backup/warning-table.mjs";

test("warning table highlights one account without hiding others and can clear highlights", () => {
  const nodes = [];
  const el = (tag, className, text) => {
    const classes = new Set();
    const node = { tag, className, textContent: text, children: [], events: {},
      append(...children) { this.children.push(...children); }, setAttribute() {},
      addEventListener(name, fn) { this.events[name] = fn; },
      scrollIntoView() { this.scrolled = true; },
      classList: { remove: name => classes.delete(name), toggle: (name, on) => on ? classes.add(name) : classes.delete(name) },
      classes,
    };
    nodes.push(node);
    return node;
  };
  const view = createWarningPanel({ el, accounts: [{ id: "a", name: "Personal" }, { id: "b", name: "Work" }], warnings: [
    { accountId: "a", filterName: "Archive", reason: "unknown-target-account", targetFolderUri: "imap://old/Archive" },
    { accountId: "b", filterName: "Custom", reason: "custom-action-unavailable", customId: "third-party", customName: "Example action" },
    { accountId: "b", filterName: "Missing folder", reason: "invalid-target-folder", targetFolderUri: "imap://work/Missing" },
  ] });
  const rows = nodes.filter(node => node.tag === "tbody")[0].children;
  assert.equal(rows[0].children[2].textContent, "Invalid target account");
  assert.equal(rows[2].children[2].textContent, "Invalid target folder");
  assert.equal(rows[1].children[3].children[0].textContent, "Example action");
  assert.equal(rows[1].children[3].children[1].textContent, "Custom action ID:");
  assert.equal(rows[1].children[3].children[2].tag, "code");
  assert.equal(rows[1].children[3].children[2].textContent, "third-party");
  view.highlightAccount("a");
  assert(view.panel.open);
  assert(rows[0].classes.has("warning-highlight"));
  assert(!rows[1].classes.has("warning-highlight"));
  assert(rows[0].scrolled);
  view.highlightAccount("b");
  assert(!rows[0].classes.has("warning-highlight"));
  assert(rows[1].classes.has("warning-highlight"));
  nodes.find(node => node.tag === "button").events.click();
  assert(rows.every(row => !row.classes.has("warning-highlight")));
  assert.equal(rows.length, 3);
});

test("live backup controller preserves edits, handles cancellation, and remembers only successful exports", async () => {
  class Node {
    constructor(tag = "div", text = "") { this.tag = tag; this.textContent = text; this.children = []; this.events = {}; this.value = ""; }
    append(...children) { this.children.push(...children); }
    prepend(child) { this.children.unshift(child); }
    replaceChildren(...children) { this.children = children; }
    setAttribute() {}
    addEventListener(name, fn) { this.events[name] = fn; }
    querySelectorAll(tag) { return this.children.flatMap(child => [...(child.tag === tag ? [child] : []), ...child.querySelectorAll(tag)]); }
  }
  const selectors = ["#rows", "#all", "#filename", "#save", "#notice", "#summary", "#validation", "#reset", ".eyebrow", ".actions", ".file-info strong", ".file-info span"];
  const nodes = Object.fromEntries(selectors.map(selector => [selector, new Node()]));
  nodes[".file-info"] = { querySelector: tag => nodes[`.file-info ${tag}`] };
  globalThis.document = { querySelector: selector => nodes[selector] || null };
  globalThis.window = { location: { search: "?mode=backup&origin=origin" } };
  const settings = {};
  let cancel = true;
  let savePreferencesFails = false;
  let returned = false;
  let expectedFilename = "Custom.json";
  const accounts = [
    { id: "a", name: "Personal", count: 1, username: "alice", hostname: "imap.example", type: "imap" },
    { id: "b", name: "Work", count: 2, username: "alice", hostname: "work.example", type: "imap" },
  ];
  globalThis.browser = {
    tabs: { getCurrent: async () => ({ id: 7 }), remove: async id => { assert.equal(id, 7); } },
    accounts: { list: async include => { assert.equal(include, false); return accounts; } },
    runtime: { getManifest: () => ({ version: "6.14.1pre0" }) },
    storage: { local: {
      get: async key => typeof key === "string" ? { [key]: settings[key] } : { ...key, ...settings },
      set: async patch => { if (savePreferencesFails) throw new Error("Settings error"); Object.assign(settings, patch); },
    } },
    FiltersAPI: {
      getBackupInfo: async () => ({ profileName: "Main", accounts }),
      exportBackupAccounts: async ids => ({ accounts: ids.map(id => ({ id, filters: [{}] })), referencedAccounts: [], warnings: [] }),
      saveBackupFile: async (filename, text) => {
        assert.equal(filename, expectedFilename);
        assert.equal(JSON.parse(text).accounts.length, 1);
        return cancel ? null : { backend: "local", path: "/backups/Renamed.json", name: "Renamed.json" };
      },
      returnToFilterList: async token => { assert.equal(token, "origin"); returned = true; },
    },
  };
  const el = (tag, className, text) => Object.assign(new Node(tag, text), { className });
  try {
    await initBackupPage({ el, accountText: () => new Node() });
    assert(nodes["#all"].checked);
    assert(nodes["#rows"].querySelectorAll("span").filter(node => node.className === "backup-selection-hint").every(node => node.hidden));
    assert.match(nodes["#filename"].value, /^Main - \d{4}-\d{2}-\d{2} \d{2}-\d{2}\.json$/);
    nodes["#all"].checked = false;
    nodes["#all"].events.change();
    assert(nodes["#save"].disabled);
    const checkbox = nodes["#rows"].querySelectorAll("input")[0];
    checkbox.checked = true;
    checkbox.events.change();
    assert(nodes["#all"].indeterminate);
    assert.equal(nodes["#rows"].querySelectorAll("span").filter(node => node.className === "backup-selection-hint" && !node.hidden).length, 1);
    const saveBackupFile = browser.FiltersAPI.saveBackupFile;
    browser.FiltersAPI.saveBackupFile = async filename => ({ backend: "local", path: `/different-folder/${filename}`, name: filename });
    const personalName = nodes["#filename"].value;
    await nodes["#save"].events.click();
    assert.equal(nodes["#filename"].value, personalName);
    let boxes = nodes["#rows"].querySelectorAll("input");
    boxes[0].checked = false; boxes[0].events.change();
    boxes = nodes["#rows"].querySelectorAll("input");
    boxes[1].checked = true; boxes[1].events.change();
    assert.match(nodes["#filename"].value, /^Work - /);
    await nodes["#save"].events.click();
    nodes["#all"].checked = true; nodes["#all"].events.change();
    assert.match(nodes["#filename"].value, /^Main - /);
    nodes["#all"].checked = false; nodes["#all"].events.change();
    boxes = nodes["#rows"].querySelectorAll("input");
    boxes[0].checked = true; boxes[0].events.change();
    assert.equal(nodes["#filename"].value, personalName);
    browser.FiltersAPI.saveBackupFile = saveBackupFile;
    delete settings["backup.selectedAccountIds"];
    nodes["#filename"].value = "Custom.json";
    nodes["#filename"].events.input();
    await nodes["#save"].events.click();
    assert.match(nodes["#notice"].textContent, /cancelled/);
    assert.equal(settings["backup.selectedAccountIds"], undefined);
    assert.equal(nodes["#rows"].querySelectorAll("span").filter(node => node.className?.includes("status-success")).length, 0);
    assert.equal(nodes["#filename"].value, "Custom.json");
    cancel = false;
    await nodes["#save"].events.click();
    assert.match(nodes["#notice"].textContent, /Saved 1 filters/);
    assert.equal(nodes["#filename"].value, "Renamed.json");
    expectedFilename = "Renamed.json";
    const badges = nodes["#rows"].querySelectorAll("span").filter(node => node.className?.includes("status-success"));
    assert.equal(badges.length, 1);
    assert.equal(badges[0].textContent, "filters saved");
    assert.deepEqual(settings["backup.selectedAccountIds"], ["a"]);
    assert.equal(settings["backup.recentFiles"][0].path, "/backups/Renamed.json");
    savePreferencesFails = true;
    await nodes["#save"].events.click();
    assert.match(nodes["#notice"].textContent, /Backup saved.*preferences could not be saved/);
    await nodes[".actions"].children[0].events.click();
    assert(returned);
    window.location.search = "?mode=backup&origin=selected&selection=1";
    nodes.h1 = new Node(); nodes["header p"] = new Node();
    nodes[".grid-heading"] = new Node();
    browser.FiltersAPI.getBackupSelection = async token => {
      assert.equal(token, "selected");
      return { accountId: "b", names: ["Only selected filter"] };
    };
    browser.FiltersAPI.exportBackupAccounts = async (ids, token) => {
      assert.deepEqual(ids, ["b"]); assert.equal(token, "selected");
      return { accounts: [{ id: "b", filters: [{}] }], referencedAccounts: [], warnings: [] };
    };
    browser.FiltersAPI.saveBackupFile = async filename => ({ backend: "local", path: `/backup/${filename}`, name: filename });
    savePreferencesFails = false;
    await initBackupPage({ el, accountText: () => new Node() });
    assert.equal(nodes.h1.textContent, "Back up selected filters");
    assert(nodes[".grid-heading"].hidden);
    const selectedAccount = nodes["#rows"].querySelectorAll("input")[0];
    assert(selectedAccount.checked);
    assert(selectedAccount.disabled);
    assert.match(nodes["#filename"].value, /^Work - selected filters - /);
    assert.match(nodes["#summary"].textContent, /1 of 1 accounts selected · 1 filters/);
    assert.equal(nodes["#rows"].querySelectorAll("li")[0].textContent, "Only selected filter");
    assert(nodes["#rows"].querySelectorAll("span").some(node => node.textContent === "1 of 2 filters selected"));
    await nodes["#save"].events.click();
    assert(nodes["#rows"].querySelectorAll("input")[0].disabled);
    assert.deepEqual(settings["backup.selectedAccountIds"], ["a"]);
  } finally {
    delete globalThis.browser; delete globalThis.document; delete globalThis.window;
  }
});

test("portable filename defaults follow selection and local timestamp", () => {
  const date = new Date(2026, 9, 30, 9, 5);
  assert.equal(suggestedFilename([{ name: "Personal" }], "Main", date), "Personal - 2026-10-30 09-05.json");
  assert.equal(suggestedFilename([{}, {}], "Axel New", date), "Axel New - 2026-10-30 09-05.json");
  assert.equal(suggestedFilename([{}, {}], "", date), "");
  assert.equal(sanitizeFilename('A/B:C?\u0001. '), "A_B_C__");
  assert.equal(sanitizeFilename("CON"), "_CON");
});

test("versioned envelope retains existing filter payloads and recognizes legacy input", () => {
  const filters = [{ filterName: "Archive", actionList: [{ type: 1, targetFolderUri: "imap://old/Archive" }] }];
  const exported = { accounts: [{ id: "account1", filters }], referencedAccounts: [{ id: "account2" }], warnings: [] };
  const data = createBackup(exported, "Main", "6.14.1pre0", new Date("2026-10-30T09:05:00Z"));
  assert.deepEqual(JSON.parse(JSON.stringify(data)).accounts[0].filters, filters);
  assert.equal(classifyBackup(data), "multi-account");
  assert.equal(classifyBackup({ filters: [] }), "legacy-single-account");
  assert.throws(() => classifyBackup({ ...data, formatVersion: 999 }), /Unsupported/);
});

test("storage writes, cancellation, bounded recent history and remembered selections", async () => {
  const values = {};
  globalThis.browser = {
    storage: { local: {
      get: async key => typeof key === "string" ? { [key]: values[key] } : { ...key, ...values },
      set: async patch => Object.assign(values, patch),
    } },
    FiltersAPI: { saveBackupFile: async (filename, text) => {
      assert.equal(filename, "backup.json");
      assert.equal(JSON.parse(text).formatVersion, 1);
      return null;
    } },
  };
  assert.equal(await getBackupStorage().write({ filename: "backup.json", data: { formatVersion: 1 } }), null);
  await rememberBackupSelection(["account1"]);
  assert.deepEqual(values["backup.selectedAccountIds"], ["account1"]);
  for (let index = 0; index < 25; index++) {
    await recordRecentFile({ backend: "local", path: `/backup-${index}.json` }, "backup");
  }
  await recordRecentFile({ backend: "local", path: "/backup-20.json" }, "restore");
  const recent = values["backup.recentFiles"];
  assert.equal(recent.length, 20);
  assert.equal(recent[0].operation, "restore");
  assert.equal(recent.filter(entry => entry.path === "/backup-20.json").length, 1);
  assert.throws(() => getBackupStorage("vfs"), /Unsupported/);
  delete globalThis.browser;
});

async function privileged() {
  const source = await readFile(new URL("../../chrome/content/api/filtersAPI/backup.js", import.meta.url), "utf8");
  let allowed = true;
  let result = 1;
  let failWrite = false;
  let pickerCount = 0;
  let focusCount = 0;
  let reopened = 0;
  const writes = [], removes = [];
  const folder = (uri) => ({ URI: uri });
  const account = (id, uri, filters) => ({ key: id, incomingServer: {
    canHaveFilters: true, prettyName: id, type: "imap", username: "alice", hostname: id,
    rootMsgFolder: folder(uri), getFilterList: () => ({ filterCount: filters.length, getFilterAt: index => filters[index] }),
  } });
  const accounts = [
    account("a", "imap://alice@a", [{ filterName: "Cross-account", actionList: [{ type: 1, targetFolderUri: "imap://alice@b/Archive" }] }]),
    account("b", "imap://alice@b", []),
    account("c", "imap://alice@c", [{ filterName: "Unknown", actionList: [{ type: 16, targetFolderUri: "imap://removed/Old" }] }]),
  ];
  const nativeWindow = {
    quickFilters: { Util: {
      popupProFeature: async () => allowed,
      getMsgFolderFromUri: uri => uri.endsWith("/Missing") ? null : { canFileMessages: true },
      serializeFilter: filter => { if (filter.fail) throw new Error("Serialization failed"); return structuredClone(filter); },
    }, backupOrigins: new Map() },
    browsingContext: {}, MsgFilters: () => reopened++,
  };
  const fp = { modeSave: 1, modeOpen: 2, returnOK: 1, returnReplace: 2,
    init() { pickerCount++; }, appendFilter() {}, open: callback => callback(result),
    file: { path: "/backups/filters.json", leafName: "filters.json" },
  };
  const context = vm.createContext({
    t: getMessage,
    Components: {
      classes: { "@mozilla.org/filepicker;1": { createInstance: () => fp }, "@mozilla.org/toolkit/profile-service;1": { getService: () => ({ profiles: [{ name: "Main", rootDir: { equals: () => true } }] }) } },
      interfaces: { nsMsgFilterAction: { MoveToFolder: 1, CopyToFolder: 16 } },
    },
    Services: { wm: { getMostRecentWindow: () => nativeWindow, getEnumerator: () => [nativeWindow] }, dirsvc: { get: () => ({}) }, uuid: { generateUUID: () => "unique" } },
    MailServices: { accounts: { accounts, getAccount: id => accounts.find(account => account.key === id), localFoldersServer: {} } },
    IOUtils: {
      writeUTF8: async (...args) => { if (failWrite) throw new Error("Disk full"); writes.push(args); },
      remove: async (...args) => removes.push(args), readUTF8: async () => '{"filters":[]}',
    }, console,
  });
  context.ChromeUtils = { importESModule: () => ({ MailServices: context.MailServices }) };
  vm.runInContext(source, context);
  return { api: context, accounts, nativeWindow, writes, removes, setAllowed: value => allowed = value,
    setResult: value => result = value, setFailWrite: value => failWrite = value,
    get pickerCount() { return pickerCount; }, get reopened() { return reopened; }, get focusCount() { return focusCount; },
    origin: { closed: false, focus: () => focusCount++ },
  };
}

test("privileged exporter captures referenced accounts without exporting their filters", async () => {
  const env = await privileged();
  assert.equal(env.api.getBackupInfo(["a", "b"]).profileName, "Main");
  assert.equal(env.api.getBackupInfo(["a"]).accounts[0].hostname, "a");
  const exported = await env.api.exportBackupAccounts(["a"]);
  assert.equal(exported.accounts.length, 1);
  assert.equal(exported.accounts[0].filters.length, 1);
  assert.equal(exported.referencedAccounts[0].id, "b");
  assert.equal(exported.referencedAccounts[0].filters, undefined);
  assert.equal((await env.api.exportBackupAccounts(["a", "b"])).referencedAccounts.length, 0);
  assert.equal((await env.api.exportBackupAccounts(["c"])).warnings[0].reason, "unknown-target-account");
  const original = env.accounts[0].incomingServer.getFilterList().getFilterAt(0);
  original.actionList.push({ type: 1, targetFolderUri: "imap://alice@b/Missing" }, { type: 16, targetFolderUri: "target imap folder" });
  const warnings = (await env.api.exportBackupAccounts(["a"])).warnings;
  assert.equal(warnings.length, 2);
  assert(warnings.every(warning => warning.reason === "invalid-target-folder"));
  await assert.rejects(() => env.api.exportBackupAccounts(["a", "a"]), /distinct/);
  await assert.rejects(() => env.api.exportBackupAccounts(["missing"]), /unavailable/);
  env.accounts[0].incomingServer.getFilterList().getFilterAt(0).fail = true;
  await assert.rejects(() => env.api.exportBackupAccounts(["a"]), /Serialization failed/);
  assert.equal(env.writes.length, 0);
  env.setAllowed(false);
  assert.equal(await env.api.exportBackupAccounts(["a"]), null);
});

test("native save cancellation and failure never remove the destination", async () => {
  const env = await privileged();
  const text = JSON.stringify({ format: "quickFilters-backup", formatVersion: 1, accounts: [] });
  await assert.rejects(env.api.saveBackupFile("../bad.json", text), /valid filename/);
  assert.equal(env.pickerCount, 0);
  env.setResult(0);
  assert.equal(await env.api.saveBackupFile("backup.json", text), null);
  assert.equal(env.writes.length, 0);
  env.setResult(1);
  const saved = await env.api.saveBackupFile("backup.json", text);
  assert.equal(saved.path, "/backups/filters.json");
  assert.equal(env.writes[0][2].mode, "create");
  assert.equal(env.writes[0][2].flush, true);
  assert.equal(env.writes[0][2].tmpPath, "/backups/filters.json.unique.tmp");
  env.setResult(2);
  await env.api.saveBackupFile("backup.json", text);
  assert.equal(env.writes[1][2].mode, "overwrite");
  env.setFailWrite(true);
  await assert.rejects(env.api.saveBackupFile("backup.json", text), /Disk full/);
  assert(env.removes.every(([path]) => path.endsWith(".tmp")));
  assert.equal(JSON.parse((await env.api.readBackupFile()).text).filters.length, 0);
});

test("return focuses original filter list and reopens it only when needed", async () => {
  const env = await privileged();
  env.nativeWindow.quickFilters.backupOrigins.set("origin", { deref: () => env.origin });
  env.api.returnToFilterList("origin");
  env.api.returnToFilterList("origin");
  assert.equal(env.focusCount, 2);
  assert.equal(env.reopened, 0);
  env.origin.closed = true;
  env.api.returnToFilterList("origin");
  assert.equal(env.reopened, 1);
});

test("toolbar opens the extension origin rather than the unpacked install directory", async () => {
  const source = await readFile(new URL("../../chrome/content/qFilters-list.js", import.meta.url), "utf8");
  const body = source.match(/openBackupTab: function \(mode = "backup"\) \{([\s\S]*?)\n  \},/)[1];
  let opened;
  const origin = {};
  const main = {
    quickFilters: {},
    document: { getElementById: () => ({ openTab: (_type, options) => { opened = options.url; } }) },
    focus() {},
  };
  vm.runInNewContext(`(function (mode = "backup") { ${body} })()`, {
    Services: { wm: { getMostRecentWindow: () => main }, uuid: { generateUUID: () => "origin" } },
    quickFilters: { Util: { extension: {
      baseURI: { resolve: path => `moz-extension://test/${path}` },
      rootURI: { resolve: () => { throw new Error("Physical install URL must not be used"); } },
    } } },
    window: origin, WeakRef, Map, encodeURIComponent,
  });
  assert.equal(opened, "moz-extension://test/html/filter-backup.html?mode=backup&origin=origin");
  assert.equal(main.quickFilters.backupOrigins.get("origin").deref(), origin);
});

test("backup directory persists across picker calls and cancellation leaves it unchanged", async () => {
  const { withBackupDirectory } = await import("../../scripts/backup/storage-local.mjs");
  const previous = globalThis.browser;
  const values = {};
  globalThis.browser = { storage: { local: {
    async get(defaults) { return { ...defaults, ...values }; },
    async set(update) { Object.assign(values, update); },
  } } };
  try {
    await withBackupDirectory(async directory => {
      assert.equal(directory, "");
      return { directory: "E:/Backups" };
    });
    await withBackupDirectory(async directory => {
      assert.equal(directory, "E:/Backups");
      return null;
    });
    assert.equal(values["backup.lastDirectory"], "E:/Backups");
    await withBackupDirectory(async directory => {
      assert.equal(directory, "E:/Backups");
      return { directory: "E:/Restores" };
    });
    assert.equal(values["backup.lastDirectory"], "E:/Restores");
  } finally {
    globalThis.browser = previous;
  }
});

test("backup review retains rows with edited/deleted badges and strikes deleted names", () => {
  const nodes = [];
  function el(tag, className = "", textContent = "") {
    const classes = new Set(className.split(" "));
    const node = { tag, className, textContent, children: [], events: {},
      append(...items) { for (const item of items) { item.parent = this; this.children.push(item); } },
      replaceChildren(...items) { this.children = []; this.append(...items); },
      remove() { this.parent.children = this.parent.children.filter(item => item !== this); },
      querySelector(selector) { return this.children.find(item => item.className.split(" ").includes(selector.slice(1))) || this.children.map(item => item.querySelector(selector)).find(Boolean); },
      setAttribute() {}, addEventListener(type, fn) { this.events[type] = fn; },
      classList: { add(value) { classes.add(value); }, remove(value) { classes.delete(value); }, toggle() {} }, classes,
    };
    nodes.push(node); return node;
  }
  const warnings = ["first", "second"].map(filterName => ({ accountId: "a", filterName, reason: "invalid-target-folder", reviewToken: "same-filter" }));
  const view = createWarningPanel({ el, accounts: [{ id: "a", name: "Account" }], warnings, backupReview: true, onEdit() {}, onDelete() {} });
  const rows = nodes.find(node => node.tag === "tbody").children;
  assert.equal(rows[0].children[4].children.length, 2);
  view.markEdited("same-filter");
  assert.equal(rows[0].children[3].children.length, 1);
  assert.equal(rows[0].children[3].children[0].textContent, "Edited by User");
  assert(rows[0].children[2].classes.has("warning-outdated"));
  assert.match(rows[0].children[2].title, /has not been checked again/);
  assert.equal(rows[0].children[1].children.length, 0);
  view.markDeleted("same-filter");
  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert(row.children[1].classes.has("filter-deleted-name"));
    assert.equal(row.children[4].children[0].textContent, "Item deleted");
    assert.match(row.children[4].children[0].title, /remember to backup again/);
    assert.equal(row.children[1].children.length, 0);
  }
});

test("return prompts for backup changes; Yes stays, No returns then closes only the current tab", async () => {
  const { returnToMessageFilters } = await import("../../scripts/backup/return-to-filters.mjs");
  const previous = { browser: globalThis.browser, window: globalThis.window };
  const calls = [];
  let yes = true, fail = false;
  globalThis.window = { location: { search: "?origin=test-origin" } };
  globalThis.browser = {
    tabs: { getCurrent: async () => ({ id: 42 }), remove: async id => calls.push(["close", id]) },
    FiltersAPI: {
      confirmBackupChanges: async () => { calls.push(["prompt"]); return yes; },
      returnToFilterList: async token => { if (fail) throw new Error("Cannot open"); calls.push(["return", token]); },
    },
  };
  try {
    assert.equal(await returnToMessageFilters(true), false);
    assert.deepEqual(calls, [["prompt"]]);
    calls.length = 0; yes = false;
    assert.equal(await returnToMessageFilters(true), true);
    assert.deepEqual(calls, [["prompt"], ["return", "test-origin"], ["close", 42]]);
    calls.length = 0;
    await returnToMessageFilters(false);
    assert.deepEqual(calls, [["return", "test-origin"], ["close", 42]]);
    calls.length = 0; fail = true;
    await assert.rejects(returnToMessageFilters(false), /Cannot open/);
    assert.deepEqual(calls, []);
  } finally { globalThis.browser = previous.browser; globalThis.window = previous.window; }
});

test("delete confirmation suppression lasts only for its controller and requires an accepted deletion", async () => {
  const { createDeleteConfirmation } = await import("../../scripts/backup/delete-confirmation.mjs");
  const previous = globalThis.browser;
  let confirmed = false, calls = 0;
  globalThis.browser = { FiltersAPI: { confirmFilterDeletion: async () => { calls++; return { confirmed, doNotAskAgain: true }; } } };
  try {
    const confirm = createDeleteConfirmation();
    assert.equal(await confirm("First"), false);
    confirmed = true;
    assert.equal(await confirm("First"), true);
    assert.equal(calls, 2);
    assert.equal(await confirm("Second"), true);
    assert.equal(calls, 2);
    await createDeleteConfirmation()("New session");
    assert.equal(calls, 3);
  } finally { globalThis.browser = previous; }
});

test("selected backup exports exact captured objects in list order, never the entire account", async () => {
  const env = await privileged();
  const first = { filterName: "Same name", actionList: [] };
  const second = { filterName: "Same name", actionList: [{ type: 1, targetFolderUri: "imap://alice@b/Archive" }] };
  const filters = [first, second];
  env.accounts[0].incomingServer.key = "server-a";
  env.accounts[0].incomingServer.getFilterList = () => ({ filterCount: filters.length, getFilterAt: index => filters[index] });
  env.nativeWindow.quickFilters.backupSelections = new Map([["selected", { serverKey: "server-a", filters: [second] }]]);
  assert.equal(env.api.getBackupSelection("selected").accountId, "a");
  assert.equal(env.api.getBackupSelection("selected").names.length, 1);
  const exported = await env.api.exportBackupAccounts(["a"], undefined, "selected");
  assert.equal(exported.accounts[0].filters.length, 1);
  assert.equal(exported.accounts[0].filters[0].actionList.length, 1);
  assert.equal(exported.referencedAccounts[0].id, "b");
  await assert.rejects(() => env.api.exportBackupAccounts(["b"], undefined, "selected"), /original account/);
  filters.pop();
  assert.equal(env.api.getBackupSelection("selected").names.length, 0);
  await assert.rejects(() => env.api.exportBackupAccounts(["a"], undefined, "selected"), /remaining selected filter/);
  assert.throws(() => env.api.getBackupSelection("missing"), /no longer available/);
});

test("Utilities loads package scripts without chrome registrations into fresh private scopes", async () => {
  const source = await readFile(new URL("../../chrome/content/api/Utilities/implementation.js", import.meta.url), "utf8");
  const loads = [];
  const premiumSources = Object.fromEntries(await Promise.all(["usage-policy.js", "usage-store.js"].map(async name => [name, await readFile(new URL(`../../scripts/premium/${name}`, import.meta.url), "utf8")])));
  const values = new Map();
  const prefs = {
    prefHasUserValue: key => values.has(key), getIntPref: (key, fallback) => values.get(key) ?? fallback,
    setIntPref(key, value) { values.set(key, value); },
    getBoolPref: (key, fallback) => values.get(key) ?? fallback,
    setBoolPref(key, value) { values.set(key, value); },
  };
  const context = vm.createContext({
    Services: { prefs, wm: { getMostRecentWindow: () => ({}) }, scriptloader: {
      loadSubScriptWithOptions(url, options) {
        loads.push({ url, options });
        const name = url.split("/").at(-1);
        if (premiumSources[name]) {
          // Subscript target and globalThis need not be the same object in Gecko.
          vm.runInNewContext(premiumSources[name], {
            quickFiltersPremium: options.target.quickFiltersPremium, globalThis: {},
          });
        }
      },
    } },
    ChromeUtils: { importESModule: uri => {
      assert(uri.startsWith("resource:"), "system modules require a trusted scheme");
      return { ExtensionCommon: { ExtensionAPI: class {} }, MailServices: {} };
    } },
    Components: {}, IOUtils: {}, console: { log() {} },
  });
  vm.runInContext(source, context);
  const api = new context.Utilities();
  const apis = [];
  for (const root of ["file:///temporary-addon/", "jar:file:///profile/quickFilters.xpi!/"]) {
    apis.push(api.getAPI({ extension: { rootURI: { resolve: path => root + path }, localeData: { localizeMessage: getMessage } } }));
  }
  assert.equal(loads.length, 4);
  await apis[0].Utilities.initializeProFeatureUsage();
  await apis[0].Utilities.consumeProFeatureUsage("loadFilters");
  await apis[0].Utilities.consumeProFeatureUsage("loadFilters");
  const [last, exhausted] = await Promise.all([
    apis[0].Utilities.consumeProFeatureUsage("loadFilters"),
    apis[1].Utilities.consumeProFeatureUsage("loadFilters"),
  ]);
  assert.equal(last.allowed, true);
  assert.equal(exhausted.allowed, false);
  assert.equal(exhausted.used, 3);
  for (const [index, load] of loads.entries()) {
    assert(load.url.startsWith(index < 2 ? "file:///temporary-addon/" : "jar:file:///profile/quickFilters.xpi!/"));
    assert(load.url.endsWith(["premium/usage-policy.js", "premium/usage-store.js"][index % 2]));
    assert.equal(load.options.charset, "UTF-8");
    assert.equal(load.options.ignoreCache, true);
    assert.equal(load.options.allowUnsafeURL, true);
    if (index % 2 === 0) assert.equal(load.options.target, loads[index + 1].options.target);
  }
});

test("backup waits for the async Pro gate and neither exports nor writes when denied", async () => {
  const env = await privileged();
  let resolveGate, serializations = 0;
  env.nativeWindow.quickFilters.Util.serializeFilter = filter => { serializations++; return structuredClone(filter); };
  env.nativeWindow.quickFilters.Util.popupProFeature = feature => {
    assert.equal(feature, "saveFilters");
    return new Promise(resolve => { resolveGate = resolve; });
  };
  const pending = env.api.exportBackupAccounts(["a"]);
  assert.equal(serializations, 0);
  resolveGate(false);
  assert.equal(await pending, null);
  assert.equal(serializations, 0);
  assert.equal(env.writes.length, 0);
  env.nativeWindow.quickFilters.Util.popupProFeature = async () => true;
  assert.equal((await env.api.exportBackupAccounts(["a"])).accounts.length, 1);
  assert.equal(serializations, 1);
  env.nativeWindow.quickFilters.Util.popupProFeature = async () => { throw new Error("License check failed"); };
  await assert.rejects(env.api.exportBackupAccounts(["a"]), /License check failed/);
  assert.equal(serializations, 1);
});
