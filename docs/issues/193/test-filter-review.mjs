import assert from "node:assert/strict";
import test from "node:test";
import { createFilterWarningPanel } from "../../scripts/filter-review/warning-panel.mjs";

test("shared review accepts caller wording and descriptions with a delete-only action", () => {
  const nodes = [];
  const el = (tag, className = "", textContent = "") => {
    const node = { tag, className, textContent, children: [], events: {},
      append(...items) { this.children.push(...items); },
      replaceChildren(...items) { this.children = items; },
      setAttribute() {}, addEventListener(name, callback) { this.events[name] = callback; },
      querySelector() { return null; },
      classList: { add() {}, remove() {}, toggle() {} },
    };
    nodes.push(node); return node;
  };
  let deleted;
  const view = createFilterWarningPanel({ el,
    text: key => `review:${key}`,
    accounts: [{ id: "a", name: "Account" }],
    warnings: [{ token: "exact-filter", accountId: "a", filterName: "Example", description: "Troubleshooter diagnosis", details: "Details from caller" }],
    panelId: "troubleshooter-review", title: "Troubleshooter results",
    deletedLabel: "Removed by user", onDelete(token) { deleted = token; },
  });
  assert.equal(view.panel.id, "troubleshooter-review");
  const row = nodes.find(node => node.tag === "tbody").children[0];
  assert.equal(row.children[2].textContent, "Troubleshooter diagnosis");
  assert.equal(row.children[4].children.length, 1);
  assert.equal(row.children[4].children[0].textContent, "review:delete");
  row.children[4].children[0].events.click();
  assert.equal(deleted, "exact-filter");
  view.markDeleted(deleted);
  assert.equal(row.children[4].children[0].textContent, "Removed by user");
  assert.equal(nodes.find(node => node.tag === "tbody").children.length, 1);
});
