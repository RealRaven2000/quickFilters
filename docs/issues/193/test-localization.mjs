import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { getMessage, messages } from "./test-i18n.mjs";
import { t, localizeDocument } from "../../scripts/backup/i18n.mjs";

test("all backup translations preserve UTF-8, placeholders and substitution definitions", async () => {
  const root = new URL("../../_locales/", import.meta.url);
  const entries = Object.entries(messages).filter(([key]) => key.startsWith("backup."));
  const tokens = text => [...text.matchAll(/\$[\w]+\$/g)].map(match => match[0]).sort();
  for (const locale of await readdir(root)) {
    const bytes = await readFile(new URL(`${locale}/messages.json`, root));
    const catalog = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (catalog._l10nstatus?.message === "SPLASH") {
      assert(!Object.keys(catalog).some(key => key.startsWith("backup.")), `${locale}: backup UI should use English fallback`);
      continue;
    }
    const orderedKeys = Object.keys(catalog);
    assert(orderedKeys.indexOf("backup.backup.title") < orderedKeys.indexOf("btn-extend-license"), `${locale}: backup block order`);
    for (const [key, source] of entries) {
      const entry = catalog[key];
      assert(entry?.message?.trim(), `${locale}: missing ${key}`);
      assert(!entry.message.includes("\uFFFD"), `${locale}/${key}: replacement character`);
      assert(!Object.keys(entry.placeholders || {}).some(name => /^value\d+$/.test(name)), `${locale}/${key}: generic placeholder`);
      if (locale !== "en") {
        assert(!("description" in entry), `${locale}/${key}: unnecessary description`);
        assert(!Object.values(entry.placeholders || {}).some(value => "example" in value), `${locale}/${key}: unnecessary example`);
      }
      assert.deepEqual(tokens(entry.message), tokens(source.message), `${locale}/${key}: placeholders`);
      const definitions = placeholders => Object.fromEntries(Object.entries(placeholders || {}).map(([name, value]) => [name, value.content]));
      assert.deepEqual(definitions(entry.placeholders), definitions(source.placeholders), `${locale}/${key}: substitution definitions`);
      if (source.message.includes("▶")) assert(entry.message.includes("▶"), `${locale}/${key}: menu icon`);
    }
  }
});

test("backup UI references exist in the English catalog and placeholders are declared", async () => {
  const directory = new URL("../../scripts/backup/", import.meta.url);
  const files = (await readdir(directory)).filter(name => name.endsWith(".mjs")).map(name => new URL(name, directory));
  files.push(...["html/filter-backup.html", "html/filter-backup.js", "chrome/content/api/filtersAPI/backup.js", "chrome/content/api/filtersAPI/restore.js", "chrome/content/api/Utilities/implementation.js", "chrome/content/api/filtersAPI/implementation.js"].map(path => new URL(`../../${path}`, import.meta.url)));
  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/["'](backup\.[\w.]+)["']/g)) {
      // These are storage keys, not UI messages.
      if (["backup.lastDirectory", "backup.selectedAccountIds", "backup.recentFiles"].includes(match[1])) { continue; }
      assert(messages[match[1]], `${file.pathname}: missing ${match[1]}`);
    }
  }
  for (const [key, entry] of Object.entries(messages).filter(([key]) => key.startsWith("backup."))) {
    assert(!entry.message.includes("? This profile"));
    getMessage(key, ["one", "two", "three", "four", "five", "six"]);
  }
  const shared = await readFile(new URL("../../scripts/filter-review/warning-panel.mjs", import.meta.url), "utf8");
  for (const match of shared.slice(shared.indexOf("export function createFilterWarningPanel")).matchAll(/text\("([\w]+)"/g)) {
    assert(messages[`backup.warnings.${match[1]}`], `Missing shared review message: ${match[1]}`);
  }
});

test("localization translates text and attributes safely, supports RTL and reordered values", () => {
  const previous = globalThis.browser;
  const text = { textContent: "", getAttribute: () => "backup.backup.title" };
  const tooltip = { title: "", getAttribute: () => "backup.backup.filenameHint" };
  const label = { getAttribute: () => "backup.restore.mappingLabel", setAttribute(name, value) { this[name] = value; } };
  const root = { documentElement: {}, querySelectorAll(selector) {
    return selector === "[data-backup-i18n]" ? [text] : selector === "[data-backup-title]" ? [tooltip] : [label];
  } };
  globalThis.browser = { i18n: {
    getUILanguage: () => "ar",
    getMessage(key, values) {
      if (key === "@@bidi_dir") { return "rtl"; }
      if (key === "backup.test.reorder") { return `${values[1]} / ${values[0]}`; }
      return `<translated ${key}>`;
    },
  } };
  try {
    localizeDocument(root);
    assert.equal(text.textContent, "<translated backup.backup.title>");
    assert.equal(tooltip.title, "<translated backup.backup.filenameHint>");
    assert.equal(label["aria-label"], "<translated backup.restore.mappingLabel>");
    assert.equal(root.documentElement.lang, "ar");
    assert.equal(root.documentElement.dir, "rtl");
    assert.equal(t("backup.test.reorder", [3, "account"]), "account / 3");
  } finally { globalThis.browser = previous; }
});
