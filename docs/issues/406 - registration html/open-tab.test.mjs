import assert from "node:assert/strict";
import test from "node:test";
import { openRegistrationTab } from "../../../html/registration/open-tab.mjs";

test("opens or reuses registration, preserves feature and focuses its window", async () => {
  for (const existing of [null, { id: 7, windowId: 3, url: "moz-extension://test/html/registration/registration.html?scenario=buy" }]) {
    const calls = [];
    const tab = { id: 7, windowId: 3 };
    const api = {
      runtime: { getURL: () => "moz-extension://test/html/registration/registration.html" },
      tabs: {
        query: async () => existing ? [existing] : [],
        update: async (id, opts) => { calls.push(["update", id, opts]); return tab; },
        create: async (opts) => { calls.push(["create", opts]); return tab; },
      },
      windows: { update: async (id, opts) => calls.push(["focus", id, opts]) },
    };
    assert.equal(await openRegistrationTab(api, { feature: "search & filters" }), tab);
    const opts = existing ? calls[0][2] : calls[0][1];
    const url = new URL(opts.url);
    assert.equal(url.searchParams.get("feature"), "search & filters");
    assert.equal(url.searchParams.has("scenario"), false);
    assert.deepEqual(calls[1], ["focus", 3, { focused: true }]);
  }
});

test("does not reuse another extension's registration page", async () => {
  let created = false;
  const api = {
    runtime: { getURL: () => "moz-extension://test/html/registration/registration.html" },
    tabs: {
      query: async () => [{ id: 1, url: "moz-extension://other/html/registration/registration.html" }],
      create: async () => { created = true; return { id: 2, windowId: 3 }; },
      update: async () => { throw new Error("wrong tab reused"); },
    },
    windows: { update: async () => {} },
  };
  await openRegistrationTab(api);
  assert.equal(created, true);
});
