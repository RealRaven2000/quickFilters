/* Shared backup/restore UI. File-browser previews retain the example data. */
(() => {
  "use strict";
  if (new URLSearchParams(window.location.search).get("mode") === "backup") {
    document.body.dataset.mode = "backup";
    document
      .querySelector("main")
      .replaceWith(document.querySelector("#backup-view").content.cloneNode(true));
    document.title = "Back up filters — quickFilters prototype";
  } else if (new URLSearchParams(window.location.search).get("mode") === "restore") {
    document.body.dataset.mode = "restore";
  }
  // Keep Thunderbird's content-tab keyboard shortcuts out of filename editing.
  // Do not preventDefault: the text input must still insert the space normally.
  const filenameInput = document.querySelector("#filename");
  if (filenameInput) {
    for (const type of ["keydown", "keypress", "keyup"]) {
      filenameInput.addEventListener(type, (event) => {
        if (event.key === " ") {
          event.stopPropagation();
        }
      });
    }
  }
  const sources = [
    {
      id: "personal",
      name: "Personal",
      type: "IMAP",
      user: "alice@example.com",
      host: "imap.example.com",
      count: 18,
    },
    {
      id: "work",
      name: "Work (old server)",
      type: "IMAP",
      user: "alice@company.example",
      host: "old.company.example",
      count: 12,
    },
    { id: "local", name: "Local Folders", type: "Local", user: "", host: "", count: 8 },
    {
      id: "club",
      name: "Club",
      type: "POP3",
      user: "secretary@club.example",
      host: "pop.club.example",
      count: 4,
    },
  ];
  const targets = [
    {
      id: "t-personal",
      name: "Personal mail",
      type: "IMAP",
      user: "alice@example.com",
      host: "imap.example.com",
    },
    {
      id: "t-work",
      name: "Work (new server)",
      type: "IMAP",
      user: "alice@company.example",
      host: "mail.company.example",
    },
    { id: "t-local", name: "Local Folders", type: "Local", user: "", host: "" },
    {
      id: "t-project",
      name: "Projects",
      type: "IMAP",
      user: "alice@projects.example",
      host: "imap.projects.example",
    },
  ];
  const rows = document.querySelector("#rows");
  const all = document.querySelector("#all");
  let mappings, selected, dragged;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text) {
      node.textContent = text;
    }
    return node;
  };
  function accountText(account) {
    const box = el("div");
    box.append(
      el("span", "name", account.name),
      el("span", "meta", [account.type, account.user, account.host].filter(Boolean).join(" · "))
    );
    return box;
  }
  function announce(message) {
    document.querySelector("#notice").textContent = message;
  }
  if (document.body.dataset.mode === "restore" && window.location.protocol === "moz-extension:") {
    document.querySelector("#restore").disabled = true;
    document.querySelector("#all").disabled = true;
    import("../scripts/backup/restore-page.mjs")
      .then((module) => module.initRestorePage({ el, accountText }))
      .catch((error) =>
        announce(browser.i18n.getMessage("backup.startup.cannotOpenRestore", [error.message]))
      );
    return;
  }
  if (document.body.dataset.mode === "backup" && window.location.protocol === "moz-extension:") {
    document.querySelector("#save").disabled = true;
    document.querySelector("#all").disabled = true;
    import("../scripts/backup/backup-page.mjs")
      .then((module) => module.initBackupPage({ el, accountText }))
      .catch((error) =>
        announce(browser.i18n.getMessage("backup.startup.cannotOpenBackup", [error.message]))
      );
    return;
  }
  if (document.body.dataset.mode === "backup") {
    const accounts = targets.map((target, index) => ({ ...target, count: sources[index].count }));
    const filename = document.querySelector("#filename");
    const save = document.querySelector("#save");
    let editedFilename = false;
    function updateBackup() {
      const checked = accounts.filter((account) => selected.has(account.id));
      all.checked = checked.length === accounts.length;
      all.indeterminate = checked.length > 0 && checked.length < accounts.length;
      document.querySelector("#summary").textContent =
        `${checked.length} of ${accounts.length} accounts selected · ${checked.reduce((sum, account) => sum + account.count, 0)} filters`;
      if (!editedFilename) {
        const prefix = checked.length === 1 ? checked[0].name : "MainProfile";
        filename.value = `${prefix} - 2026-10-30 14-35.json`;
      }
      save.disabled = !checked.length || !filename.value.trim();
      document.querySelector("#validation").textContent = !checked.length
        ? "Select at least one account."
        : !filename.value.trim()
          ? "Enter a backup filename."
          : "Selected accounts will be saved together in one file.";
    }
    function renderBackup() {
      rows.replaceChildren();
      for (const account of accounts) {
        const row = el("div", "mapping-row");
        const label = el("label", "source");
        const checkbox = el("input");
        checkbox.type = "checkbox";
        checkbox.checked = selected.has(account.id);
        checkbox.setAttribute("aria-label", `Back up filters from ${account.name}`);
        checkbox.addEventListener("change", () => {
          checkbox.checked ? selected.add(account.id) : selected.delete(account.id);
          updateBackup();
        });
        const text = accountText(account);
        text.append(el("span", "badge", `${account.count} filters`));
        label.append(checkbox, text);
        row.append(label);
        rows.append(row);
      }
      updateBackup();
    }
    function resetBackup() {
      selected = new Set(accounts.map((account) => account.id));
      editedFilename = false;
      renderBackup();
      announce("Prototype only. No filters are read and no file is saved.");
    }
    all.addEventListener("change", () => {
      selected = new Set(all.checked ? accounts.map((account) => account.id) : []);
      renderBackup();
    });
    filename.addEventListener("input", () => {
      editedFilename = true;
      updateBackup();
    });
    document.querySelector("#reset").addEventListener("click", resetBackup);
    save.addEventListener("click", () =>
      announce(`Demo: Save As would open with “${filename.value.trim()}”. No file was saved.`)
    );
    resetBackup();
    return;
  }
  function assign(targetId, sourceId, viaDrag = false) {
    for (const [oldSource, target] of mappings) {
      if (target === targetId) {
        mappings.delete(oldSource);
        selected.delete(oldSource);
      }
    }
    if (sourceId) {
      if (mappings.has(sourceId)) {
        selected.delete(sourceId);
      }
      mappings.set(sourceId, targetId);
      if (viaDrag) {
        selected.add(sourceId);
      }
    }
    render();
    announce(
      sourceId
        ? `Destination assigned to ${sources.find((s) => s.id === sourceId).name}.${viaDrag ? " Source selected." : " Select its checkbox to include its filters."}`
        : "Account moved to Accounts left unchanged. Its previous source is unchecked."
    );
  }
  function dropZone(node, sourceId) {
    node.addEventListener("dragover", (event) => {
      if (!dragged) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      node.classList.add("drag-over");
    });
    node.addEventListener("dragleave", (event) => {
      if (!node.contains(event.relatedTarget)) {
        node.classList.remove("drag-over");
      }
    });
    node.addEventListener("drop", (event) => {
      event.preventDefault();
      node.classList.remove("drag-over");
      if (dragged && targets.some((t) => t.id === dragged)) {
        assign(dragged, sourceId, true);
      }
      dragged = null;
    });
  }
  function targetCard(target, assigned) {
    const card = el("div", "target");
    card.draggable = true;
    card.append(accountText(target));
    card.addEventListener("dragstart", (event) => {
      dragged = target.id;
      event.dataTransfer.setData("text/plain", target.id);
      event.dataTransfer.effectAllowed = "move";
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => {
      dragged = null;
      card.classList.remove("dragging");
      document.querySelectorAll(".drag-over").forEach((n) => n.classList.remove("drag-over"));
    });
    if (assigned) {
      const remove = el("button", "", "Remove assignment");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove assignment for ${target.name}`);
      remove.addEventListener("click", () => {
        assign(target.id, null);
        document.querySelector(`#choose-${assigned}`).focus();
      });
      card.append(remove);
    }
    return card;
  }
  function updateSelection() {
    all.checked = selected.size === sources.length;
    all.indeterminate = selected.size > 0 && selected.size < sources.length;
    const missing = sources.filter((s) => selected.has(s.id) && !mappings.has(s.id));
    const count = sources.filter((s) => selected.has(s.id)).reduce((sum, s) => sum + s.count, 0);
    document.querySelector("#summary").textContent =
      `${selected.size} of 4 accounts selected · ${count} filters`;
    document.querySelector("#validation").textContent = missing.length
      ? `Choose a destination for: ${missing.map((s) => s.name).join(", ")}.`
      : "Same-name filters are replaced; new filters are added; other filters remain.";
    document.querySelector("#restore").disabled = !selected.size || !!missing.length;
  }
  function render() {
    rows.replaceChildren();
    for (const source of sources) {
      const row = el("div", "mapping-row");
      const label = el("label", "source");
      const checkbox = el("input");
      checkbox.type = "checkbox";
      checkbox.checked = selected.has(source.id);
      checkbox.setAttribute("aria-label", `Restore filters from ${source.name}`);
      checkbox.addEventListener("change", () => {
        checkbox.checked ? selected.add(source.id) : selected.delete(source.id);
        updateSelection();
      });
      const text = accountText(source);
      text.append(el("span", "badge", `${source.count} filters`));
      label.append(checkbox, text);
      const destination = el("div");
      const slot = el("div", "slot");
      slot.setAttribute("aria-label", `Destination slot for ${source.name}`);
      const target = targets.find((t) => t.id === mappings.get(source.id));
      slot.append(
        target ? targetCard(target, source.id) : el("div", "empty", "Drop a target here")
      );
      dropZone(slot, source.id);
      const chooser = el("details", "destination-picker");
      const trigger = el("summary", "destination-trigger");
      const indicator = el("span", "destination-indicator", "▶");
      indicator.setAttribute("aria-hidden", "true");
      trigger.append(indicator);
      trigger.id = `choose-${source.id}`;
      trigger.setAttribute(
        "aria-label",
        `Select account for ${source.name} (you can also drag accounts to a slot)`
      );
      trigger.title = "Select account (you can also drag accounts to a slot)";
      const popup = el("div", "destination-popup");
      popup.append(
        el("strong", "popup-title", "Select account (you can also drag accounts to a slot)")
      );
      for (const t of targets) {
        const owner = [...mappings].find(([s, id]) => id === t.id && s !== source.id);
        const option = el("button", "destination-option");
        option.type = "button";
        option.append(accountText(t));
        if (owner) {
          option.append(
            el(
              "span",
              "meta",
              `Assigned to ${sources.find((s) => s.id === owner[0]).name} — move here`
            )
          );
        }
        if (target?.id === t.id) {
          option.append(el("span", "badge", "Current destination"));
        }
        option.addEventListener("click", () => {
          if (mappings.get(source.id) !== t.id) {
            assign(t.id, source.id);
          } else {
            chooser.open = false;
          }
          document.querySelector(`#choose-${source.id}`).focus();
        });
        popup.append(option);
      }
      chooser.append(trigger, popup);
      chooser.addEventListener("toggle", () => {
        indicator.textContent = chooser.open ? "▼" : "▶";
        if (chooser.open) {
          document.querySelectorAll(".destination-picker").forEach((other) => {
            if (other !== chooser) {
              other.open = false;
            }
          });
        }
      });
      const sourceCell = el("div", "source-cell");
      sourceCell.append(label, chooser);
      destination.append(slot);
      row.append(sourceCell, destination);
      rows.append(row);
    }
    const unmatched = document.querySelector("#unmatched");
    unmatched.replaceChildren();
    const available = targets.filter((t) => ![...mappings.values()].includes(t.id));
    available.forEach((t) => unmatched.append(targetCard(t)));
    if (!available.length) {
      unmatched.append(el("div", "meta", "All targets are assigned."));
    }
    document.querySelector("#pool-count").textContent = `(${available.length})`;
    updateSelection();
  }
  function reset() {
    mappings = new Map([
      ["personal", "t-personal"],
      ["local", "t-local"],
    ]);
    selected = new Set(["personal", "local"]);
    render();
    announce(
      "Example reset. Personal and Local Folders match automatically. Work and Club need manual mapping."
    );
  }
  all.addEventListener("change", () => {
    selected = new Set(all.checked ? sources.map((s) => s.id) : []);
    render();
  });
  document.addEventListener("click", (event) => {
    document.querySelectorAll(".destination-picker[open]").forEach((picker) => {
      if (!picker.contains(event.target)) {
        picker.open = false;
      }
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.querySelectorAll(".destination-picker[open]").forEach((picker) => {
        picker.open = false;
        picker.querySelector("summary").focus();
        event.preventDefault();
      });
    }
  });
  dropZone(document.querySelector("#pool"), null);
  document.querySelector("#reset").addEventListener("click", reset);
  document
    .querySelector("#restore")
    .addEventListener("click", () =>
      announce(
        `Demo: ${selected.size} accounts would be restored. No filters were changed or mappings saved.`
      )
    );
  reset();
})();
