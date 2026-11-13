import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

test("FiltersAPI owns backup/restore methods and loads fresh scopes for unpacked and packaged installs", async () => {
  const base = new URL("../../chrome/content/api/", import.meta.url);
  const source = await readFile(new URL("filtersAPI/implementation.js", base), "utf8");
  const schema = JSON.parse(await readFile(new URL("filtersAPI/schema.json", base), "utf8"))[0];
  const utilities = JSON.parse(await readFile(new URL("Utilities/schema.json", base), "utf8"))[0];
  const loads = [];
  const context = vm.createContext({
    Services: { scriptloader: { loadSubScriptWithOptions(url, options) {
      loads.push({ url, options });
      if (url.endsWith("backup.js")) {
        options.target.exportBackupAccounts = (ids, register, token) => register({ ids, token });
      } else {
        options.target.registerReviewFilter = value => value;
      }
    } } },
    ChromeUtils: { importESModule: () => ({ ExtensionCommon: { ExtensionAPI: class {} }, MailServices: {} }) },
    Components: {}, IOUtils: {}, console,
  });
  vm.runInContext(source, context);
  const api = new context.FiltersAPI();
  const results = [];
  for (const root of ["file:///temporary-addon/", "jar:file:///profile/quickFilters.xpi!/"]) {
    results.push(api.getAPI({ extension: {
      rootURI: { resolve: path => root + path },
      localeData: { localizeMessage: key => key },
    } }).FiltersAPI);
  }
  for (const method of schema.functions) assert.equal(typeof results[0][method.name], "function", method.name);
  assert.equal(utilities.functions.some(method => method.name === "restoreFilters"), false);
  assert.equal(loads.length, 6);
  for (const [index, { url, options }] of loads.entries()) {
    assert(url.startsWith(index < 3 ? "file:///temporary-addon/" : "jar:file:///profile/quickFilters.xpi!/"));
    assert(url.endsWith(`filtersAPI/${["backup", "restore", "troubleshooter"][index % 3]}.js`));
    assert.equal(options.charset, "UTF-8");
    assert.equal(options.ignoreCache, true);
    assert.equal(options.allowUnsafeURL, true);
    assert.equal(options.target.t("example"), "example");
  }
  assert.notEqual(loads[0].options.target, loads[3].options.target);
  assert.notEqual(loads[1].options.target, loads[4].options.target);
  assert.deepEqual(await results[0].exportBackupAccounts(["a"], "selection"), { ids: ["a"], token: "selection" });
});
