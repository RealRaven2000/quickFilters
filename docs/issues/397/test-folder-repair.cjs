// Run with: node "docs/issue 397/test-folder-repair.cjs"
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const source = fs.readFileSync(path.resolve(__dirname, "../../chrome/content/qFilters-worker.js"), "utf8");
new vm.Script(source);
const start = source.indexOf("  rebuildFolderSummary: async function (folder)");
const end = source.indexOf("  /** legacy function", start);
const events = [];
const msgWindow = {};
const worker = vm.runInNewContext("({" + source.slice(start, end) + "})", {
  window: {},
  quickFilters: { Util: {
    getMail3PaneWindow() { return { msgWindow }; },
    logException() { events.push("exception"); },
    logWithOption(tag, message) { assert.equal(tag, "createFilter"); assert.equal(message, "Repair requested for Vodafone » _Social Networks » Rumble"); events.push("requested"); },
    getBundleString(key, fallback) { return fallback; },
  } },
  IOUtils: { async remove() { events.push("remove"); } },
  ChromeUtils: { importESModule() { return { MailServices: { mfn: {
    notifyFolderReindexTriggered() { events.push("notify"); },
  } } }; } },
  Services: { prompt: { alert() { events.push("alert"); } } },
});
function folder(options = {}) {
  return Object.assign({
    URI: "target", prettyName: "Rumble", server: { prettyName: "Vodafone" }, parent: { prettyName: "_Social Networks", isServer: false }, locked: false, supportsOffline: false, filePath: { path: "mock-store" },
    msgDatabase: { summaryValid: true },
    throwAlertMsg() { events.push("busy"); },
    closeAndBackupFolderDB() { events.push("backup"); },
    ForceDBClosed() { events.push("force-close"); },
    updateFolder(win) { assert.equal(win, msgWindow); events.push("update"); },
  }, options);
}
async function run() {
  let target = folder();
  assert.equal(await worker.rebuildFolderSummary(target), true);
  assert.equal(target.msgDatabase.summaryValid, false);
  assert.deepEqual(events.splice(0), ["notify", "backup", "update", "requested"]);
  assert.equal(await worker.rebuildFolderSummary(folder({ locked: true })), false);
  assert.deepEqual(events.splice(0), ["busy"]);
  target = folder({ closeAndBackupFolderDB() { throw Error("bad summary"); } });
  Object.defineProperty(target, "msgDatabase", { get() { throw Error("out of date"); } });
  assert.equal(await worker.rebuildFolderSummary(target), true);
  assert.deepEqual(events.splice(0), ["notify", "exception", "force-close", "update", "requested"]);
  assert.equal(await worker.rebuildFolderSummary(folder({ supportsOffline: true })), true);
  assert.deepEqual(events.splice(0), ["remove", "notify", "backup", "update", "requested"]);
  assert.equal(await worker.rebuildFolderSummary(folder({ updateFolder() { throw Error("busy"); } })), false);
  assert.deepEqual(events.splice(0), ["notify", "backup", "exception", "alert"]);
  console.log("Passed: rebuild request, lock guard, stale summary, backup fallback, offline removal, failure alert.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
