import assert from "node:assert/strict";
import test from "node:test";
import { createAssistantLifecycle } from "../../../html/assistant-lifecycle.mjs";

function fixture() {
  let removed;
  let win = { id: 42, state: "normal", left: 10, top: 20, width: 800, height: 600 };
  const writes = [], results = [], cleared = [], closed = [], ticks = [];
  const api = createAssistantLifecycle({
    browser: {
      windows: { onRemoved: { addListener(callback) { removed = callback; } },
        async get() { if (!win) throw new Error("closed"); return win; } },
      storage: { local: { async set(data) { writes.push(data); },
        async get() { return { "assistant.window.bounds": { left: 99, top: 88, width: 700, height: 500 } }; } } },
    },
    async resolveAssistant(id, result, params) { results.push({ id, result, params }); },
    isDebug: () => false,
    onWindowClosed: id => closed.push(id),
    startTimer(callback) { ticks.push(callback); return 123; },
    stopTimer: timer => cleared.push(timer),
  });
  return { api, writes, results, cleared, closed, ticks,
    remove: id => removed(id), setWindow(value) { win = value; },
    async track(requestId = "assistant_test") {
      api.trackWindow(win, requestId);
      await new Promise(setImmediate);
    } };
}

test("X-close cancels once and clears bounds tracking without a page message", async () => {
  const f = fixture();
  await f.track();
  await f.remove(99);
  assert.equal(f.results.length, 0);
  await f.remove(42);
  await f.remove(42);
  assert.deepEqual(f.results, [{ id: "assistant_test", result: "cancelled",
    params: { answer: false, mergeFilter: null, selectedMergedFilterIndex: -1 } }]);
  assert.deepEqual(f.cleared, [123]);
  const writes = f.writes.length;
  await f.ticks[0]();
  assert.equal(f.writes.length, writes);
});

test("acknowledged Cancel/Next result prevents a second cancellation when the window closes", async () => {
  for (const result of ["cancelled", "success", "merge"]) {
    const f = fixture();
    await f.track();
    await f.api.handleResult({ requestId: "assistant_test", result,
      params: { answer: result !== "cancelled", template: "from", mergeFilter: { index: 0 } } },
    { tab: { windowId: 42 } });
    await f.remove(42);
    assert.equal(f.results.length, 1);
    assert.equal(f.results[0].result, result);
    assert.equal(f.results[0].params.selectedMergedFilterIndex, 0);
    assert.deepEqual(f.cleared, [123]);
  }
});

test("bounds restore and changed normal bounds persist; minimized or destroyed windows do not overwrite them", async () => {
  const f = fixture();
  assert.deepEqual(await f.api.readSavedBounds(), { left: 99, top: 88, width: 700, height: 500 });
  await f.track();
  await f.api.saveBounds(42);
  assert.equal(f.writes.length, 1);
  f.setWindow({ state: "normal", left: 50, top: 20, width: 800, height: 600 });
  await f.ticks[0]();
  assert.equal(f.writes.length, 2);
  assert.equal(f.writes[1]["assistant.window.bounds"].left, 50);
  f.setWindow({ state: "minimized", width: 0 });
  await f.api.saveBounds(42);
  f.setWindow(null);
  await f.api.saveBounds(42);
  assert.equal(f.writes.length, 2);
});
