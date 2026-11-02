/** Presentation only. Callers supply text, warning data and action callbacks.
 * No file, storage or Thunderbird API access belongs in this component.
 */
// Compact review for diagnostics. The caller owns state and decides which
// remedies are safe for each finding; this renderer never opens an editor.
export function createFilterProblemTable({ el, problems, text, renderCheck, renderDetails, getActions }) {
  const panel = el("div", "warning-table-container");
  const table = el("table", "warning-table problem-table");
  table.append(el("caption", "", text("tableHint")));
  const head = el("thead"), headings = el("tr"), body = el("tbody");
  for (const key of ["check", "filter", "problem", "actions"]) {
    const cell = el("th", "", key === "check" ? "" : text(key));
    if (key === "check") cell.append(el("span", "visually-hidden", text(key)));
    cell.setAttribute("scope", "col");
    headings.append(cell);
  }
  head.append(headings);
  for (const problem of problems) {
    const row = el("tr");
    row.dataset.result = problem.id;
    const check = el("td");
    check.append(renderCheck(problem));
    const name = el("th", "", problem.filterName);
    name.setAttribute("scope", "row");
    const issue = el("td");
    issue.append(el("div", "problem-title", text(`reason.${problem.reason}`)));
    if (problem.state !== "remaining") issue.append(el("span", `status-badge state-${problem.state}`, text(`state.${problem.state}`)));
    const detail = el("details", "problem-detail");
    detail.append(el("summary", "", text("details")), renderDetails(problem));
    issue.append(detail);
    const actions = el("td"), buttons = el("div", "problem-actions");
    for (const action of getActions(problem)) {
      const button = el("button", action.danger ? "danger" : "", action.label);
      button.type = "button";
      button.addEventListener("click", action.run);
      buttons.append(button);
    }
    actions.append(buttons);
    row.append(check, name, issue, actions);
    body.append(row);
  }
  table.append(head, body);
  panel.append(table);
  return panel;
}

export function createFilterWarningPanel({
  el,
  accounts,
  warnings,
  title,
  onEdit,
  onDelete,
  text,
  panelId = "filter-warnings",
  deletedLabel,
  changeReminder,
}) {
  const names = new Map(accounts.map((account) => [account.id, account.name]));
  const hasActions = !!(onEdit || onDelete);
  const panel = el("details");
  panel.id = panelId;
  panel.className = "filter-warning-panel";
  panel.append(
    el("summary", "", title || text("warnings"))
  );
  const toolbar = el("div", "warning-toolbar");
  const status = el("span", "", text("allWarningsShown"));
  status.setAttribute("role", "status");
  const clear = el("button", "", text("clearHighlight"));
  clear.type = "button";
  clear.disabled = true;
  toolbar.append(status, clear);
  const container = el("div", "warning-table-container");
  const table = el("table", "warning-table");
  table.append(el("caption", "", text("warnings")));
  const head = el("thead");
  const headings = el("tr");
  for (const title of [
    text("account"),
    text("filter"),
    text("warning"),
    text("details"),
    ...(hasActions ? [text("action")] : []),
  ]) {
    const cell = el("th", "", title);
    cell.setAttribute("scope", "col");
    headings.append(cell);
  }
  head.append(headings);
  const body = el("tbody");
  const entries = warnings.map((warning) => {
    const token = warning.token;
    const row = el("tr");
    const description =
      warning.description || {
        "unknown-target-account": text("invalidTargetAccount"),
        "invalid-target-folder": text("invalidTargetFolder"),
        "custom-action-unavailable": text("customActionUnavailable"),
        "custom-term-unavailable": text("customSearchTermUnavailable"),
        "duplicate-filter-name": text("duplicateNameSkipped"),
        "filter-import-failed": text("filterSkipped"),
        "account-restore-failed": text("accountRestoreFailed"),
      }[warning.reason] || warning.reason;
    for (const value of [
      names.get(warning.accountId) || warning.accountId,
      warning.filterName,
      description,
    ]) {
      row.append(el("td", "", value));
    }
    const details = el("td");
    if (warning.customId) {
      if (warning.customName) {
        details.append(el("div", "custom-feature-name", warning.customName));
      }
      const label =
        warning.reason === "custom-action-unavailable"
          ? text("customActionID")
          : text("customSearchTermID");
      details.append(el("div", "custom-feature-label", label));
      details.append(el("code", "custom-feature-id", warning.customId));
      if (warning.details && warning.details !== warning.customId) {
        details.append(el("div", "", warning.details));
      }
    } else {
      details.textContent = [
        ...new Set([warning.details, warning.targetFolderUri].filter(Boolean)),
      ].join(" — ");
    }
    row.append(details);
    if (hasActions) {
      const cell = el("td");
      if (token) {
        if (onEdit) {
          const edit = el("button", "", text("editFilter"));
          edit.type = "button";
          edit.addEventListener("click", () => onEdit(token));
          cell.append(edit);
        }
        if (onDelete) {
          const remove = el("button", "", text("delete"));
          remove.type = "button";
          remove.addEventListener("click", () => onDelete(token, warning.filterName));
          cell.append(remove);
        }
      }
      row.append(cell);
    }
    body.append(row);
    return { row, accountId: warning.accountId, token };
  });
  table.append(head, body);
  container.append(table);
  panel.append(toolbar, container);
  clear.addEventListener("click", () => {
    entries.forEach(({ row }) => row.classList.remove("warning-highlight"));
    status.textContent = text("allWarningsShown");
    clear.disabled = true;
  });
  return {
    panel,
    markEdited(token) {
      for (const entry of entries.filter((item) => item.token === token)) {
        const badge = el(
          "span",
          "status-badge status-warning review-change review-status",
          text("editedByUser")
        );
        if (changeReminder) { badge.title = changeReminder; }
        entry.row.children[3].replaceChildren(badge);
        entry.row.children[2].classList.add("warning-outdated");
        entry.row.children[2].title = text("thisWarningWasRecordedBeforeTheFilterWas");
      }
    },
    markDeleted(token) {
      for (const entry of entries.filter((item) => item.token === token)) {
        const cell = entry.row.children[hasActions ? 4 : 3];
        const badge = el(
          "span",
          "status-badge status-warning review-status",
          deletedLabel || text("filterDeleted")
        );
        if (changeReminder) { badge.title = changeReminder; }
        entry.row.querySelector(".review-change")?.remove();
        entry.row.children[1].classList.add("filter-deleted-name");
        cell.replaceChildren(badge);
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
      status.textContent = text("warningsForHighlightedAllWarningsRemainVisible", [
        names.get(accountId) || accountId,
      ]);
      clear.disabled = false;
      first?.scrollIntoView({ block: "center" });
    },
  };
}
