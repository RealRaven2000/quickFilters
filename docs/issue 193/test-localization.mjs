import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { getMessage, messages } from "./test-i18n.mjs";
import { t, localizeDocument } from "../../scripts/backup/i18n.mjs";

test("backup UI references exist in the English catalog and placeholders are declared", async () => {
  const directory = new URL("../../scripts/backup/", import.meta.url);
  const files = (await readdir(directory)).filter(name => name.endsWith(".mjs")).map(name => new URL(name, directory));
  files.push(...["html/filter-backup.html", "html/filter-backup.js", "chrome/content/api/Utilities/backup.js", "chrome/content/api/Utilities/restore.js", "chrome/content/api/Utilities/implementation.js"].map(path => new URL(`../../${path}`, import.meta.url)));
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
  for (const match of shared.matchAll(/text\("([\w]+)"/g)) {
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
