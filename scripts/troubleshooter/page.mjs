import { createFilterProblemTable } from "../filter-review/warning-panel.mjs";
import { createReviewState } from "./state.mjs";

const api = browser.FiltersAPI;
const common = { account: "account", filter: "filter", actions: "action", details: "details", edit: "editFilter", delete: "delete" };
const t = (key, values = []) => browser.i18n.getMessage(common[key] ? `backup.warnings.${common[key]}` : `troubleshooter.${key}`, values.map(String));
const $ = selector => document.querySelector(selector);
const el = (tag, className = "", text = "") => {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
};
const checks = ["runs", "folders", "addons", "conditions"];
const icons = {
  runs: "../chrome/content/skin/runFilters-selected.svg",
  folders: "../chrome/content/skin/folder-error.svg",
  addons: "../chrome/content/skin/extensions.svg",
  conditions: "../chrome/content/mixed-conditions.svg",
};
let session, accounts = [], busy = false, review = createReviewState();
function icon(category, decorative = false) {
  const node = el("img", "step-icon");
  node.src = icons[category];
  node.dataset.check = category;
  node.alt = decorative ? "" : t(`check.${category}`);
  if (!decorative) node.title = node.alt;
  return node;
}
function notice(message, error = false) {
  $("#notice").textContent = message;
  $("#notice").classList.toggle("error", error);
}
function setBusy(value) {
  busy = value;
  $("main").setAttribute("aria-busy", String(value));
  document.querySelectorAll(".check-button, #run-all, #open-log, #account, .problem-actions button").forEach(button => { button.disabled = value || !accounts.length; });
}
async function attempt(work) {
  if (busy) return;
  setBusy(true);
  try { await work(); }
  catch (error) { notice(error.message, true); }
  finally { setBusy(false); }
}
async function scan(categories, { refresh = false } = {}) {
  if (!refresh) {
    review = createReviewState();
    $("#search").value = "";
    $("#view").value = "remaining";
    render();
  }
  const result = await api.scanFilters(session, $("#account").value, categories);
  if (refresh) review.merge(result);
  else review.replace(result);
  const account = accounts.find(item => item.id === result.accountId);
  if (account) account.count = result.count;
  render();
  return result;
}
function renderDetails(item) {
  const node = el("div");
  if (["missing-action", "missing-term"].includes(item.reason)) {
    const identifier = el("p", "custom-identifier", `${t("customId")}: `);
    identifier.append(el("code", "", item.customId || t("missingIdentifier")));
    node.append(identifier);
    return node;
  }
  node.append(el("p", "", t(`explain.${item.reason}`)));
  for (const value of [item.targetFolderUri, item.customId, item.details].filter(Boolean)) node.append(el("code", "", value));
  return node;
}
function actions(item) {
  if (["resolved", "deleted"].includes(item.state)) return [];
  const result = [];
  const add = (label, run, danger = false) => result.push({ label: t(label), run: () => attempt(run), danger });
  add("viewConditions", () => showConditions(item));
  if (item.category === "addons") add("openAddons", async () => {
    try { await browser.tabs.create({ url: "about:addons" }); }
    catch { await api.openFilterAddons(); } // Privileged about: URLs may be rejected by the standard API.
  });
  if (item.reason === "no-run-method") add("enableIncoming", () => remedy(item, "enableIncoming"));
  if (item.canEdit) add("edit", () => remedy(item, "edit"));
  if (item.enabled) add("disable", () => remedy(item, "disable"));
  add("delete", () => remedy(item, "delete"), true);
  return result;
}
function render() {
  const values = [...review.findings.values()];
  const unresolved = values.filter(item => ["remaining", "disabled"].includes(item.state));
  const filters = new Set(unresolved.map(item => item.token)).size;
  $("#summary").textContent = t("summary", [filters, values.filter(item => ["resolved", "deleted"].includes(item.state)).length, review.checks.size]);
  $("#account-summary").textContent = t("filterCount", [accounts.find(item => item.id === $("#account").value)?.count || 0]);
  for (const category of checks) {
    const count = new Set(unresolved.filter(item => item.category === category).map(item => item.token)).size;
    $(`[data-status="${category}"]`).textContent = !review.checks.has(category) ? t("notRun") : count ? t("needsReviewCount", [count]) : t("noProblems");
  }
  const visible = review.visible($("#search").value, $("#view").value);
  $("#results").replaceChildren(visible.length ? createFilterProblemTable({
    el, problems: visible, text: t,
    renderCheck: item => icon(item.category), renderDetails, getActions: actions,
  }) : el("p", "empty", t(review.checks.size ? "empty" : "start")));
}
async function remedy(item, action) {
  const result = await api.remedyFilter(session, item.token, action);
  if (!result.changed) return;
  if (action === "delete") review.deleted(item.token);
  // Refresh the current action's checks after a remedy, preserving its resolved/deleted rows.
  try { await scan([...review.checks], { refresh: true }); }
  catch (error) { render(); throw error; }
  notice(t("changed"));
}
async function showConditions(item) {
  const data = await api.getFilterConditionText(session, item.token);
  $("#conditions-name").textContent = item.filterName;
  $("#condition-text").textContent = data.text;
  $("#term-structure").replaceChildren();
  if (data.terms.length) {
    const table = el("table", "term-table"), head = el("thead"), heading = el("tr"), body = el("tbody");
    for (const key of ["operator", "groupStart", "term", "groupEnd", "searchTermId"]) {
      const cell = el("th", "", t(key)); cell.scope = "col"; heading.append(cell);
    }
    head.append(heading);
    data.terms.forEach(term => {
      const row = el("tr");
      for (const value of [
        term.matchAll ? "ALL" : term.booleanAnd ? "AND" : "OR",
        "(".repeat(Math.max(0, term.beginsGrouping)),
        term.text,
        ")".repeat(Math.max(0, term.endsGrouping)),
      ]) row.append(el("td", "", value));
      const id = el("td", term.isCustom && !term.customAvailable ? "invalid-custom-term" : "");
      if (term.isCustom && !term.customAvailable) id.title = t("reason.missing-term");
      if (term.isCustom) id.append(el("code", "", term.customId || t("missingIdentifier")));
      row.append(id);
      body.append(row);
    });
    table.append(head, body); $("#term-structure").append(table);
  }
  $("#edit-conditions").hidden = !data.canEdit;
  $("#edit-conditions").onclick = () => {
    $("#conditions").close();
    attempt(() => remedy(item, "edit"));
  };
  $("#conditions").showModal();
}
function buildChecks() {
  for (const category of checks) {
    const section = el("div", "check"), button = el("button", "check-button", t(`check.${category}`));
    button.type = "button"; button.dataset.check = category; button.disabled = true;
    button.prepend(icon(category, true));
    button.addEventListener("click", () => attempt(async () => {
      await scan([category]);
      notice(t("completed"));
    }));
    const description = el("div", "check-description");
    const help = el("details", "check-help"), toggle = el("summary");
    toggle.setAttribute("aria-label", t("help", [t(`check.${category}`)]));
    const helpIcon = el("img"); helpIcon.src = "../chrome/content/skin/help.svg"; helpIcon.alt = ""; toggle.append(helpIcon);
    const explanation = el("div", "help-text", t(`help.${category}`));
    if (category === "conditions") {
      const link = el("a", "", "Bug 297852");
      link.href = "https://bugzilla.mozilla.org/show_bug.cgi?id=297852"; link.target = "_blank"; link.rel = "noopener noreferrer";
      explanation.append(" ", link);
    }
    help.append(toggle, explanation);
    help.addEventListener("toggle", () => { if (help.open) document.querySelectorAll(".check-help").forEach(other => { if (other !== help) other.open = false; }); });
    description.append(el("small", "", t(`description.${category}`)), help);
    const status = el("div", "check-status"); status.dataset.status = category;
    section.append(button, description, status); $("#checks").append(section);
  }
}
async function init() {
  document.documentElement.lang = browser.i18n.getUILanguage();
  document.documentElement.dir = browser.i18n.getMessage("@@bidi_dir") || "ltr";
  document.title = t("title");
  document.querySelectorAll("[data-i18n]").forEach(node => { node.textContent = t(node.dataset.i18n); });
  $("#account").setAttribute("aria-label", t("account"));
  $("#view").setAttribute("aria-label", t("resultStatus"));
  $("#search").placeholder = t("find"); $("#search").setAttribute("aria-label", t("find"));
  buildChecks(); render();
  $("#run-all").onclick = () => attempt(async () => { await scan(checks); notice(t("completed")); });
  $("#open-log").onclick = () => attempt(() => api.openFilterLog($("#account").value));
  $("#search").oninput = render; $("#view").onchange = render;
  $("#account").onchange = () => attempt(async () => {
    await api.endTroubleshooting(session); session = await api.beginTroubleshooting();
    review = createReviewState(); $("#search").value = ""; $("#view").value = "remaining"; render(); notice("");
  });
  $("#close-conditions").onclick = () => $("#conditions").close();
  $("#copy-conditions").onclick = async () => {
    try {
      // execCommand uses the user's copy gesture and needs no extra clipboard permission.
      const selection = window.getSelection(), range = document.createRange();
      range.selectNodeContents($("#condition-text")); selection.removeAllRanges(); selection.addRange(range);
      if (!document.execCommand("copy")) throw new Error(t("copyManually"));
      selection.removeAllRanges(); notice(t("copied"));
    } catch (error) { notice(error.message, true); }
  };
  document.addEventListener("click", event => document.querySelectorAll(".check-help[open]").forEach(help => { if (!help.contains(event.target)) help.open = false; }));
  document.addEventListener("keydown", event => { if (event.key === "Escape") document.querySelectorAll(".check-help[open]").forEach(help => { help.open = false; help.querySelector("summary").focus(); }); });
  await attempt(async () => {
    const host = await api.getTroubleshooterInfo();
    if (host.supportsMixedConditions) {
      const note = el("p", "host-note");
      note.append(el("em", "", t("mixedConditionsSupported")));
      $('[data-status="conditions"]').before(note);
    }
    const mx = await browser.accounts.list(false);
    const info = await api.getBackupInfo(mx.map(item => item.id));
    accounts = info.accounts;
    for (const account of accounts) { const option = el("option", "", account.name); option.value = account.id; $("#account").append(option); }
    const requested = new URLSearchParams(location.search).get("account");
    if (accounts.some(item => item.id === requested)) $("#account").value = requested;
    session = await api.beginTroubleshooting();
    render();
    if (!accounts.length) notice(t("noAccounts"));
  });
}
window.addEventListener("pagehide", () => { if (session) api.endTroubleshooting(session).catch(console.warn); }, { once: true });
init().catch(error => notice(error.message, true));
