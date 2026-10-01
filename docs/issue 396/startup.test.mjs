import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const listenerSource = readFileSync(new URL("chrome/content/api/WindowListener/implementation.js", root), "utf8");
const paneSource = readFileSync(new URL("chrome/content/scripts/qFi-3pane.js", root), "utf8");

function listener(now) {
  const context = vm.createContext({
    console,
    Date: { now },
    Services: {},
    ChromeUtils: { importESModule: () => ({ ExtensionCommon: { ExtensionAPI: class {} } }) },
    Components: { utils: { reportError(error) { throw error; } } },
  });
  vm.runInContext(listenerSource, context);
  const instance = new context.WindowListener();
  instance.uniqueRandomID = "testScope";
  instance.registeredWindows = {};
  instance._loadIntoNestedBrowsers = () => {};
  return instance;
}

test("readiness survives a 28 second startup and caps the final sleep", async () => {
  let elapsed = 0;
  const instance = listener(() => elapsed);
  const target = { location: { href: "about:3pane" }, document: { readyState: "loading" } };
  const delays = [];
  instance.sleep = async delay => {
    delays.push(delay);
    elapsed += delay;
    if (elapsed >= 28000) { target.document.readyState = "complete"; }
  };
  let processed = 0;
  instance._loadIntoNestedBrowsers = () => processed++;
  await instance._loadIntoWindow(target, false);
  assert.equal(processed, 1);
  assert.deepEqual(delays.slice(0, 5), [250, 500, 1000, 1500, 2000]);

  elapsed = 0;
  target.document.readyState = "loading";
  instance.sleep = async delay => { elapsed += delay; };
  await instance._loadIntoWindow(target, false);
  assert.equal(elapsed, 60000);
  assert.equal(processed, 1);
});

test("readiness is checked after a timer arrives beyond the deadline", async () => {
  let elapsed = 0;
  const instance = listener(() => elapsed);
  const target = { location: { href: "about:3pane" }, document: { readyState: "loading" } };
  instance.sleep = async () => { elapsed = 65000; target.document.readyState = "complete"; };
  let processed = false;
  instance._loadIntoNestedBrowsers = () => { processed = true; };
  await instance._loadIntoWindow(target, false);
  assert.equal(processed, true);
});

test("a concurrent load waits for the existing document initialization", async () => {
  const instance = listener(() => 0);
  instance.sleep = async () => {};
  let finish;
  const target = {
    location: { href: "about:3pane" }, document: { readyState: "complete" },
    testScope: { onLoadPromise: new Promise(resolve => { finish = resolve; }) },
  };
  let completed = false;
  const pending = instance._loadIntoWindow(target, false).then(() => { completed = true; });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(completed, false);
  finish();
  await pending;
  assert.equal(completed, true);
});

test("3pane recovery preserves integrated buttons and recreates only missing elements", async () => {
  const elements = new Map();
  const toolbar = {};
  const win = {
    document: {
      getElementById: id => elements.get(id),
      createXULElement: () => {
        buttons++;
        return { setAttribute() {}, addEventListener() {} };
      },
    },
    quickFilters: {
      Preferences: { ensureReady: async () => {}, isDebugOption: () => false },
      Util: { getBundleString: key => key },
    },
  };
  const context = vm.createContext({ window: win, console });
  vm.runInContext(paneSource, context);
  let containers = 0;
  let buttons = 0;
  vm.runInContext("qFInjector.waitForElement = async () => {};", context);
  context.createContainer = () => {
    containers++;
    elements.set("quickFilters-injected", {
      ownerDocument: win.document,
      appendChild(element) {
        element.parentNode = this;
        elements.set(element.id, element);
      },
      insertBefore(element) { this.appendChild(element); },
    });
  };
  vm.runInContext("qFInjector.injectElements = createContainer;", context);
  await context.injectQuickFoldersNavigationBarElements(win);
  assert.equal(containers, 1);
  assert.equal(buttons, 4);
  for (const [id, element] of elements) {
    if (id.startsWith("quickfilters-current-")) { element.parentNode = toolbar; }
  }
  const original = elements.get("quickfilters-current-runbutton");
  await context.injectQuickFoldersNavigationBarElements(win);
  assert.equal(containers, 1);
  assert.equal(buttons, 4);
  assert.equal(original.parentNode, toolbar);
  elements.delete("quickFilters-injected");
  elements.delete("quickfilters-current-listbutton");
  await Promise.all([
    context.injectQuickFoldersNavigationBarElements(win),
    context.injectQuickFoldersNavigationBarElements(win),
  ]);
  assert.equal(containers, 2);
  assert.equal(buttons, 5);
  assert.equal(elements.get("quickfilters-current-runbutton"), original);
  assert.equal(original.parentNode, toolbar);
  const container = elements.get("quickFilters-injected");
  assert.equal(context.injectButton(container, "quickfilters-current-runbutton"), original);
  assert.equal(original.parentNode, container);
  assert.equal(buttons, 5);
});

test("the caller gates initialization and integration on QuickFolders being active", async () => {
  const background = readFileSync(new URL("qFi-background.js", root), "utf8");
  const start = background.indexOf('        if (message.command == "injectButtonsQFNavigationBar")');
  const end = background.indexOf("        break;", start);
  const calls = [];
  let active = false;
  const context = {
    message: { command: "injectButtonsQFNavigationBar" },
    QUICKFOLDERS_APPNAME: "quickfolders@curious.be",
    uiReadyPromise: Promise.resolve(),
    isAddonActive: async id => {
      assert.equal(id, "quickfolders@curious.be");
      return active;
    },
    messenger: {
      Utilities: {
        ensureQuickFoldersButtons: async () => { calls.push("integrate"); return { ok: true }; },
      },
      WindowListener: { ensureRegisteredWindows: async href => {
        assert.equal(href, "about:3pane");
        calls.push("initialize");
      } },
    },
  };
  const run = () => vm.runInNewContext(
    "(async () => {" + background.slice(start, end) + "})()", context
  );
  assert.equal((await run()).ok, false);
  assert.deepEqual(calls, []);
  active = true;
  assert.equal((await run()).ok, true);
  assert.deepEqual(calls, ["initialize", "integrate"]);
});

test("background checks installed and enabled state through the standard management API", async () => {
  const source = readFileSync(new URL("qFi-background.js", root), "utf8");
  const start = source.indexOf("async function isAddonActive(addonId)");
  const end = source.indexOf("// Wrapper that supports multiple args", start);
  let addon;
  const context = vm.createContext({
    messenger: { management: {
      get: async id => {
        assert.equal(id, "quickfolders@curious.be");
        if (!addon) { throw new Error("No such add-on"); }
        return addon;
      },
    } },
  });
  vm.runInContext(source.slice(start, end), context);
  for (const [value, expected] of [[null, false], [{ enabled: false }, false], [{ enabled: true }, true]]) {
    addon = value;
    assert.equal(await context.isAddonActive("quickfolders@curious.be"), expected);
  }
  const manifest = JSON.parse(readFileSync(new URL("manifest.json", root), "utf8").replace(/^\uFEFF/, ""));
  assert.ok(manifest.permissions.includes("management"));
});

test("generic WindowListener recovery initializes only matching registered documents", async () => {
  const start = listenerSource.indexOf("async ensureRegisteredWindows(windowHref)");
  const end = listenerSource.indexOf("async waitForMasterPassword()", start);
  const document = { getElementsByTagName: () => [] };
  const target = { location: { href: "about:3pane" }, document };
  const other = { location: { href: "about:message" }, document };
  const main = { location: { href: "chrome://messenger/content/messenger.xhtml" }, document };
  const calls = [];
  const self = {
    registeredWindows: { "about:3pane": "test.js" },
    getTabMail: win => win === main ? { tabInfo: [
      { chromeBrowser: { contentWindow: target } },
      { chromeBrowser: { contentWindow: other } },
    ] } : null,
    _loadIntoWindow: async win => calls.push(win),
  };
  const api = vm.runInNewContext("({" + listenerSource.slice(start, end) + "})", {
    self, Services: { wm: { getEnumerator: () => [main] } },
  });
  await api.ensureRegisteredWindows("about:3pane");
  assert.deepEqual(calls, [target]);
  await assert.rejects(api.ensureRegisteredWindows("about:unregistered"), /not registered/);
});

test("Utilities restores buttons and reports verified toolbar integration", async () => {
  const source = readFileSync(new URL("chrome/content/api/Utilities/implementation.js", root), "utf8");
  const start = source.indexOf("async ensureQuickFoldersButtons()");
  const end = source.indexOf("latestMainWindow:", start);
  const toolbar = {};
  let integrated = false;
  const calls = [];
  const target = {
    location: { href: "about:3pane" },
    document: { getElementById: id => id === "QuickFolders-CurrentFolderTools"
      ? toolbar : { parentNode: integrated ? toolbar : null } },
    AddOnNS1: { injectQuickFoldersNavigationBarElements: async () => calls.push("buttons") },
  };
  const main = {
    document: { getElementById: () => ({ tabInfo: [
      { mode: { name: "mail3PaneTab" }, chromeBrowser: { contentWindow: target } },
      { mode: { name: "mailMessageTab" } },
    ] }) },
    quickFilters: { toggleCurrentFolderButtons: async () => {
      calls.push("integrate"); integrated = true;
    } },
  };
  const api = vm.runInNewContext("({" + source.slice(start, end) + "})", {
    context: { extension: { instanceId: 1 } },
    Services: { wm: { getEnumerator: () => [main] } },
  });
  const result = await api.ensureQuickFoldersButtons();
  assert.equal(result.ok, true);
  assert.equal(result.initializedTabs, 1);
  assert.equal(result.integratedTabs, 1);
  assert.deepEqual(calls, ["buttons", "integrate"]);
  main.quickFilters.toggleCurrentFolderButtons = async () => {};
  integrated = false;
  assert.equal((await api.ensureQuickFoldersButtons()).ok, false);
});
