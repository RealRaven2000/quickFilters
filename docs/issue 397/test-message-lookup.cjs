// Run with: node "docs/issue 397/test-message-lookup.cjs"
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "chrome/content/qFilters-worker.js"), "utf8");
new vm.Script(source);
const start = source.indexOf("  createFilterAsync: async function (");
const end = source.indexOf("  },\n\n  // deprecated Legacy wrapper", start);
assert.ok(start >= 0 && end > start, "Locate legacy function");
const method = source.slice(start, end) + "  }";
const calls = [], errors = [], alerts = [], failures = [];
const navigations = [];
let acceptPrompt = false;
const header = { messageId: "test-message" };
const quickFilters = {
  Util: {
    logDebug() {},
    logException(...args) { errors.push(args); },
    logWithOption(...args) { failures.push(args); },
    getBundleString(key, fallback) {
      const messages = JSON.parse(fs.readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
      assert.ok(messages[key], "English translation exists");
      return messages[key].message || fallback;
    },
    makeMessageListEntry(msgHeader) { return { messageId: msgHeader.messageId, msgHeader }; },
  },
  Preferences: { isDebugOption() { return false; } },
};
const worker = vm.runInNewContext("({" + method + "})", {
  quickFilters,
  window: { setTimeout(resolve) { resolve(); } },
  Services: { prompt: { confirm(...args) { alerts.push(args); return acceptPrompt; } } },
  // A recursive MailUtils lookup would fail this harness.
  ChromeUtils: { importESModule() { return { MailUtils: { displayFolderIn3Pane(uri) { navigations.push(uri); }, getMsgHdrForMsgId() { throw new Error("Unexpected broad search"); } } }; } },
});
quickFilters.Worker = worker;
worker.waitForCoreReady = async () => {};
worker.rebuildFolderSummary = async folder => { navigations.push(folder.URI); return true; };
worker.startFilterAssistant = async params => params;
function folder(URI, result) {
  return {
    URI, prettyName: URI,
    get msgDatabase() {
      calls.push(URI);
      if (result instanceof Error) { throw result; }
      return { getMsgHdrForMessageID() { return result; } };
    },
  };
}
function reset() {
  calls.length = errors.length = alerts.length = failures.length = 0;
}
async function run() {
  let result = await worker.createFilterAsync(folder("source", header), folder("target", header), ["test-message"]);
  assert.equal(calls.join(), "target");
  assert.equal(result.messageList[0].msgHeader, header);
  assert.equal(alerts.length, 0);
  reset();

  await worker.createFilterAsync(folder("source", header), folder("target", null), ["test-message"]);
  assert.equal(calls.join(), "target,source");
  reset();

  const same = folder("same", header);
  await worker.createFilterAsync(same, same, ["test-message"]);
  assert.equal(calls.join(), "same");
  reset();

  await worker.createFilterAsync(folder("source", header), folder("target", new Error("summary out of date")), ["test-message"]);
  assert.equal(calls.join(), "target,source");
  assert.equal(errors.length, 1);
  assert.ok(errors[0][0].includes("target"));
  assert.equal(alerts.length, 0);
  reset();

  result = await worker.createFilterAsync(folder("source", null), folder("Rumble", new Error("summary out of date")), ["test-message"]);
  assert.equal(result, null);
  assert.equal(calls.length, 40);
  assert.equal(errors.length, 20);
  assert.equal(failures.length, 1);
  assert.equal(alerts.length, 1);
  assert.ok(alerts[0][2].includes('"Rumble"'));
  assert.ok(alerts[0][2].includes("repair"));
  assert.equal(navigations.length, 0, "Cancel does not repair");
  reset();
  acceptPrompt = true;
  const repairTarget = folder("Rumble", null);
  repairTarget.server = { prettyName: "Test Account" };
  repairTarget.parent = { prettyName: "Social Networks", isServer: false };
  await worker.createFilterAsync(folder("source", null), repairTarget, ["test-message"], null, null, false, 20);
  assert.equal(alerts.length, 1);
  assert.ok(alerts[0][2].includes("Try to repair the folder now?"));
  assert.deepEqual(navigations, ["Rumble"]);
  assert.ok(alerts[0][2].includes("Test Account » Social Networks » Rumble"));
  console.log("Passed: target lookup, source fallback, duplicate folder, lookup exception, bounded retries, repair alert.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
