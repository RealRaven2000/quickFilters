export function createWarningPanel({ el, accounts, warnings, title, onEdit, onDelete }) {
  const names = new Map(accounts.map(account => [account.id, account.name]));
  const panel = el("details");
  panel.id = "backup-warnings";
  panel.append(el("summary", "", title || `Backup saved with ${warnings.length} warnings`));
  const toolbar = el("div", "warning-toolbar");
  const status = el("span", "", "All warnings shown.");
  status.setAttribute("role", "status");
  const clear = el("button", "", "Clear highlight");
  clear.type = "button";
  clear.disabled = true;
  toolbar.append(status, clear);
  const container = el("div", "warning-table-container");
  const table = el("table", "warning-table");
  table.append(el("caption", "", onEdit ? "Restore warnings and skipped filters" : "Filter backup warnings"));
  const head = el("thead");
  const headings = el("tr");
  for (const title of ["Account", "Filter", "Warning", "Details", ...(onEdit ? ["Action"] : [])]) {
    const cell = el("th", "", title);
    cell.setAttribute("scope", "col");
    headings.append(cell);
  }
  head.append(headings);
  const body = el("tbody");
  const entries = warnings.map(warning => {
    const row = el("tr");
    const description = {
      "unknown-target-account": "Invalid target account",
      "invalid-target-folder": "Invalid target folder",
      "custom-action-unavailable": "Custom action unavailable",
      "custom-term-unavailable": "Custom search term unavailable",
      "duplicate-filter-name": "Duplicate name — skipped",
      "filter-import-failed": "Filter skipped",
      "account-restore-failed": "Account restore failed",
    }[warning.reason] || warning.reason;
    for (const value of [names.get(warning.accountId) || warning.accountId, warning.filterName, description]) {
      row.append(el("td", "", value));
    }
    const details = el("td");
    if (warning.customId) {
      if (warning.customName) {
        details.append(el("div", "custom-feature-name", warning.customName));
      }
      const label = warning.reason === "custom-action-unavailable" ? "Custom action ID:" : "Custom search term ID:";
      details.append(el("div", "custom-feature-label", label));
      details.append(el("code", "custom-feature-id", warning.customId));
      if (warning.details && warning.details !== warning.customId) {
        details.append(el("div", "", warning.details));
      }
    } else {
      details.textContent = [...new Set([warning.details, warning.targetFolderUri].filter(Boolean))].join(" — ");
    }
    row.append(details);
    if (onEdit) {
      const cell = el("td");
      if (warning.importedToken) {
        const edit = el("button", "", "Edit filter");
        edit.type = "button";
        edit.addEventListener("click", () => onEdit(warning.importedToken));
        cell.append(edit);
        if (onDelete) {
          const remove = el("button", "", "Delete");
          remove.type = "button";
          remove.addEventListener("click", () => onDelete(warning.importedToken, warning.filterName));
          cell.append(remove);
        }
      }
      row.append(cell);
    }
    body.append(row);
    return { row, accountId: warning.accountId, token: warning.importedToken };
  });
  table.append(head, body);
  container.append(table);
  panel.append(toolbar, container);
  clear.addEventListener("click", () => {
    entries.forEach(({ row }) => row.classList.remove("warning-highlight"));
    status.textContent = "All warnings shown.";
    clear.disabled = true;
  });
  return {
    panel,
    markDeleted(token) {
      for (const entry of entries.filter(item => item.token === token)) {
        const cell = entry.row.children[4];
        cell.replaceChildren(el("span", "", "Filter deleted"));
      }
    },
    highlightAccount(accountId) {
      panel.open = true;
      let first;
      for (const entry of entries) {
        const matches = entry.accountId === accountId;
        entry.row.classList.toggle("warning-highlight", matches);
        if (matches && !first) {
          first = entry.row;
        }
      }
      status.textContent = `Warnings for ${names.get(accountId) || accountId} highlighted. All warnings remain visible.`;
      clear.disabled = false;
      first?.scrollIntoView({ block: "center" });
    },
  };
}
