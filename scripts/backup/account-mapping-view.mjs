import { t } from "./i18n.mjs";
export function renderAccountMapping({ el, accountText, sources, targets, mappings, selected, statuses, busy, results, onSelect, onAssign, onWarning }) {
  const rows = document.querySelector("#rows");
  rows.replaceChildren();
  let dragged;
  const display = account => accountText({ ...account, user: account.username, host: account.hostname });
  function zone(node, sourceId) {
    node.addEventListener("dragover", event => {
      if (!dragged || busy) { return; }
      event.preventDefault(); event.dataTransfer.dropEffect = "move"; node.classList.add("drag-over");
    });
    node.addEventListener("dragleave", event => { if (!node.contains(event.relatedTarget)) { node.classList.remove("drag-over"); } });
    node.addEventListener("drop", event => {
      event.preventDefault(); node.classList.remove("drag-over");
      if (dragged && !busy) { onAssign(dragged, sourceId, true); }
      dragged = null;
    });
  }

  function card(target, owner, triggerId) {
    const node = el("div", "target");
    node.draggable = !busy;
    node.append(display(target));
    node.addEventListener("dragstart", event => {
      if (busy || event.target.closest("button")) {
        event.preventDefault();
        return;
      }
      dragged = target.id;
      event.dataTransfer.setData("text/plain", target.id);
      event.dataTransfer.effectAllowed = "move";
      node.classList.add("dragging");
    });
    node.addEventListener("dragend", () => {
      dragged = null; node.classList.remove("dragging");
      document.querySelectorAll(".drag-over").forEach(item => item.classList.remove("drag-over"));
    });
    if (owner) {
      const remove = el("button", "", t("backup.mapping.removeAssignment"));
      remove.type = "button"; remove.disabled = busy;
      remove.addEventListener("click", () => {
        onAssign(target.id, null);
        document.getElementById(triggerId)?.focus();
      });
      node.append(remove);
    }
    return node;
  }

  sources.forEach((source, index) => {
    const row = el("div", "mapping-row");
    const left = el("div", "source-cell");
    const label = el(Array.isArray(source.filters) ? "label" : "div", "source");
    if (Array.isArray(source.filters)) {
      const checkbox = el("input"); checkbox.type = "checkbox"; checkbox.checked = selected.has(source.id); checkbox.disabled = busy;
      checkbox.setAttribute("aria-label", t("backup.mapping.restoreFiltersFrom", [source.name]));
      checkbox.addEventListener("change", () => onSelect(source.id, checkbox.checked));
      label.append(checkbox);
    }
    const text = display(source);
    text.append(el("span", "badge", Array.isArray(source.filters) ? t("backup.mapping.filters", [source.filters.length, statuses.get(source.id) ? ` · ${statuses.get(source.id)}` : ""]) : t("backup.mapping.referencedAccountNoFiltersImported")));
    label.append(text); left.append(label);
    const result = results?.accounts.find(item => item.sourceId === source.id);
    if (result) {
      const message = result.error ? t("backup.mapping.restoreFailed") : result.added + result.replaced ? t("backup.mapping.filtersRestored") : t("backup.mapping.noFiltersRestored");
      left.append(el("span", `status-badge ${result.error ? "status-error" : result.added + result.replaced ? "status-success" : "status-warning"}`, message));
      const count = results.warnings.filter(warning => warning.accountId === source.id).length;
      if (count) {
        const warnings = el("button", "status-badge status-warning", t("backup.mapping.warnings", [count]));
        warnings.type = "button"; warnings.disabled = busy;
        warnings.addEventListener("click", () => onWarning(source.id)); left.append(warnings);
      }
    }
    const chooser = el("details", "destination-picker");
    const triggerId = `mapping-trigger-${index}`;
    const trigger = el("summary", "destination-trigger", "▶"); trigger.id = triggerId;
    trigger.setAttribute("aria-label", t("backup.mapping.selectAccountFor", [source.name]));
    const popup = el("div", "destination-popup");
    popup.append(el("strong", "popup-title", t("backup.mapping.selectAccountYouCanAlsoDragAccountsTo")));
    for (const target of targets) {
      const button = el("button", "destination-option"); button.type = "button"; button.disabled = busy;
      button.append(display(target));
      const owner = sources.find(item => item.id !== source.id && mappings.get(item.id) === target.id);
      if (owner) { button.append(el("span", "meta", t("backup.mapping.assignedToMoveHere", [owner.name]))); }
      button.addEventListener("click", () => {
        if (mappings.get(source.id) !== target.id) { onAssign(target.id, source.id, false); }
        else { chooser.open = false; }
        document.getElementById(triggerId)?.focus();
      });
      popup.append(button);
    }
    chooser.append(trigger, popup);
    chooser.addEventListener("toggle", () => {
      trigger.textContent = chooser.open ? "▼" : "▶";
      if (chooser.open) { document.querySelectorAll(".destination-picker").forEach(other => { if (other !== chooser) { other.open = false; } }); }
    });
    left.append(chooser);
    const slot = el("div", "slot");
    const target = targets.find(item => item.id === mappings.get(source.id));
    slot.append(target ? card(target, source.id, triggerId) : el("div", "empty", t("backup.mapping.dropATargetHere")));
    zone(slot, source.id); row.append(left, slot); rows.append(row);
  });

  const pool = document.querySelector("#pool");
  const unmatched = document.querySelector("#unmatched"); unmatched.replaceChildren();
  const unused = targets.filter(target => ![...mappings.values()].includes(target.id));
  unused.forEach(target => unmatched.append(card(target)));
  if (!unused.length) {
    unmatched.append(el("div", "meta", t("backup.mapping.allAccountsAreAssigned")));
  }
  document.querySelector("#pool-count").textContent = `(${unused.length})`;
  // Replace handlers on the persistent pool to avoid accumulating listeners.
  pool.ondragover = (event) => {
    if (dragged && !busy) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; pool.classList.add("drag-over"); }
  };
  pool.ondragleave = (event) => {
    if (!pool.contains(event.relatedTarget)) {
      pool.classList.remove("drag-over");
    }
  };
  pool.ondrop = (event) => {
    event.preventDefault();
    pool.classList.remove("drag-over");
    if (dragged && !busy) {
      onAssign(dragged, null);
    }
    dragged = null;
  };
}