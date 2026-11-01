import assert from "node:assert/strict";
import "./test-i18n.mjs";
import test from "node:test";
import { initRestorePage } from "../../scripts/backup/restore-page.mjs";

test("restore page loads a real file, supports drag/menu selection, restores and opens the exact imported filter", async () => {
  class Node {
    constructor(tag, className = "", text = "") {
      this.tag = tag; this.className = className; this.textContent = text; this.children = []; this.events = {}; this.disabled = false;
      const classes = new Set(className.split(" ").filter(Boolean));
      this.classList = { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name), toggle: (name, flag) => flag ? classes.add(name) : classes.delete(name) };
    }
    append(...nodes) { nodes.forEach(node => { node.parent = this; this.children.push(node); }); }
    prepend(node) { node.parent = this; this.children.unshift(node); }
    replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
    remove() { if (this.parent) { this.parent.children = this.parent.children.filter(node => node !== this); } }
    after(node) { this.parent.append(node); }
    setAttribute(name, value) { this[name] = value; }
    addEventListener(name, fn) { this.events[name] = fn; }
    focus() { this.focused = true; }
    scrollIntoView() { this.scrolled = true; }
    closest(tag) { return this.tag === tag ? this : this.parent?.closest(tag); }
    matches(selector) {
      const open = selector.endsWith("[open]");
      if (open && !this.open) { return false; }
      selector = selector.replace("[open]", "");
      return selector.startsWith("#") ? this.id === selector.slice(1) : selector.startsWith(".") ? this.className.split(" ").includes(selector.slice(1)) : this.tag === selector;
    }
    querySelectorAll(selector) {
      const selectors = selector.split(",").map(part => part.trim());
      return this.children.flatMap(child => [...(selectors.some(part => child.matches(part)) ? [child] : []), ...child.querySelectorAll(selector)]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  }
  const el = (tag, className, text) => new Node(tag, className, text);
  const root = el("main");
  const id = (tag, name) => Object.assign(el(tag), { id: name });
  const banner = el("section", "file-info"); banner.append(el("strong"), el("span"));
  const actions = el("div", "actions"); actions.append(id("button", "reset"), id("button", "restore"));
  const pool = id("section", "pool"); pool.append(id("span", "pool-count"), id("div", "unmatched"));
  root.append(el("div", "eyebrow"), banner, id("input", "all"), id("div", "rows"), pool, id("strong", "summary"), id("p", "validation"), actions, id("p", "notice"));
  globalThis.document = {
    querySelector: selector => selector === "main > details" ? null : root.querySelector(selector),
    querySelectorAll: selector => root.querySelectorAll(selector),
    getElementById: name => root.querySelector(`#${name}`),
    addEventListener() {},
  };
  globalThis.window = { location: { search: "?mode=restore&origin=origin" } };
  const source = { id: "source", name: "Personal", type: "imap", username: "alice", hostname: "mail.example", rootUri: "imap://alice@mail.example", filters: [{ filterName: "Custom", actionList: [], searchTerms: [] }] };
  const reference = { id: "reference", name: "Archive", type: "imap", username: "archive", hostname: "mail.example", rootUri: "imap://archive@mail.example" };
  const targets = [{ ...source, id: "target" }, { ...reference, id: "target-reference" }];
  const settings = {};
  let cancelled = false, edited, restored = false, savedReport;
  globalThis.browser = {
    accounts: { list: async () => targets },
    storage: { local: {
      get: async key => typeof key === "string" ? { [key]: settings[key] } : { ...key, ...settings },
      set: async patch => Object.assign(settings, patch),
    } },
    FiltersAPI: {
      getBackupInfo: async () => ({ accounts: targets }),
      readBackupFile: async () => cancelled ? null : { backend: "local", path: "/backup.json", name: "backup.json", text: JSON.stringify({ format: "quickFilters-backup", formatVersion: 1, accounts: [source], referencedAccounts: [reference] }) },
      restoreFilters: async request => {
        assert.deepEqual(request.selected, [source.id]);
        assert.deepEqual(new Map(request.mappings), new Map([[source.id, "target"], [reference.id, "target-reference"]]));
        restored = true;
        return { success: true, added: 1, replaced: 0, skipped: 0, failed: 0, accounts: [{ sourceId: source.id, targetId: "target", added: 1, replaced: 0, skipped: 0 }], warnings: [{ accountId: source.id, filterName: "Custom", reason: "custom-action-unavailable", customId: "missing", importedToken: "exact-filter-token" }] };
      },
      editImportedFilter: async token => { edited = token; },
      saveRestoreReport: async text => { savedReport = JSON.parse(text); return { path: "/report.json" }; },
      returnToFilterList: async () => true,
    },
  };
  const accountText = account => {
    const box = el("div"); box.append(el("span", "name", account.name)); return box;
  };
  try {
    await initRestorePage({ el, accountText });
    const restore = root.querySelector("#restore");
    const open = banner.querySelector("button");
    assert(restore.disabled); assert(!open.disabled);
    await open.events.click();
    assert.equal(root.querySelector("#rows").children.length, 2);
    assert(root.querySelector("#all").checked);
    assert(!restore.disabled);
    assert.equal(settings["restore.accountMappings"], undefined);
    // Drag an assigned destination away: source is unchecked, mapping removed.
    const card = root.querySelector(".target");
    card.events.dragstart({ target: card, dataTransfer: { setData() {} }, preventDefault() {} });
    pool.ondrop({ preventDefault() {} });
    assert(restore.disabled);
    assert(!root.querySelector("#all").checked);
    // Menu assignment does not automatically select the source.
    root.querySelector(".destination-option").events.click();
    assert(restore.disabled);
    const checkbox = root.querySelector("#rows").querySelector("input");
    checkbox.checked = true; checkbox.events.change();
    assert(!restore.disabled);
    await restore.events.click();
    assert(restored);
    assert.equal(settings["restore.accountMappings"].length, 2);
    assert.equal(settings["backup.recentFiles"][0].operation, "restore");
    const panel = root.querySelector("#backup-warnings"); assert(panel.open);
    const badge = root.querySelector("button.status-warning") || root.querySelectorAll("button").find(node => node.className.includes("status-warning"));
    badge.events.click();
    assert(panel.querySelector("tbody").children[0].classList.contains("warning-highlight"));
    const edit = panel.querySelectorAll("button").find(node => node.textContent === "Edit filter");
    await edit.events.click(); assert.equal(edited, "exact-filter-token");
    const report = panel.querySelectorAll("button").find(node => node.textContent === "Save report…");
    await report.events.click(); assert.equal(savedReport.format, "quickFilters-restore-report");
    cancelled = true;
    await open.events.click();
    assert.match(root.querySelector("#notice").textContent, /previous backup remains loaded/);
  } finally {
    delete globalThis.browser; delete globalThis.document; delete globalThis.window;
  }
});
