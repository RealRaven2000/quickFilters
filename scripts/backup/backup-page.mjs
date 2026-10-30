import { createBackup, sanitizeFilename, suggestedFilename } from "./backup-format.mjs";
import { getBackupStorage, rememberBackupSelection, recordRecentFile } from "./backup-storage.mjs";
import { createWarningPanel } from "./warning-table.mjs";

export async function initBackupPage({ el, accountText }) {
  const rows = document.querySelector("#rows");
  const all = document.querySelector("#all");
  const filename = document.querySelector("#filename");
  const save = document.querySelector("#save");
  const notice = document.querySelector("#notice");
  const summary = document.querySelector("#summary");
  const validation = document.querySelector("#validation");
  const announce = text => { notice.textContent = text; };
  let busy = false;
  let editedFilename = false;
  let accounts = [];
  let profileName = "";
  let selected = new Set();
  const savedAccounts = new Map();
  let warningView;

  document.querySelector("#reset").hidden = true;
  save.textContent = "Save backup…";
  document.querySelector(".eyebrow").textContent = "quickFilters";
  announce("Loading accounts and filter counts…");
  document.querySelector(".file-info strong").textContent = "Current profile";
  document.querySelector(".file-info span").textContent = "Loading…";
  const back = el("button", "", "Return to Message Filters");
  back.type = "button";
  document.querySelector(".actions").prepend(back);
  back.addEventListener("click", async () => {
    back.disabled = true;
    try {
      const token = new URLSearchParams(window.location.search).get("origin") || "";
      await browser.Utilities.returnToFilterList(token);
    } catch (error) {
      announce(`Could not return to the filter list: ${error.message}`);
    } finally {
      back.disabled = busy;
    }
  });

  function chosen() {
    return accounts.filter(account => selected.has(account.id));
  }
  function update() {
    const checked = chosen();
    all.checked = accounts.length > 0 && checked.length === accounts.length;
    all.indeterminate = checked.length > 0 && checked.length < accounts.length;
    if (!editedFilename) {
      filename.value = suggestedFilename(checked, profileName);
    }
    const cleanName = sanitizeFilename(filename.value);
    const hasError = checked.some(account => account.error);
    save.disabled = busy || !checked.length || !cleanName || hasError;
    filename.disabled = busy;
    all.disabled = busy || !accounts.length;
    back.disabled = busy;
    rows.querySelectorAll("input").forEach(input => { input.disabled = busy; });
    summary.textContent = `${checked.length} of ${accounts.length} accounts selected · ${checked.reduce((sum, account) => sum + account.count, 0)} filters`;
    validation.textContent = !checked.length ? "Select at least one account." : hasError ? "Uncheck accounts whose filters could not be read, or reopen this page to retry." : !cleanName ? "Enter a backup filename." : "Selected accounts will be saved together in one file.";
  }
  function render() {
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
        update();
      });
      const text = accountText(account);
      text.append(el("span", "badge", `${account.count} filters`));
      label.append(checkbox, text);
      if (account.error) {
        const badge = el("span", "status-badge status-error", "Cannot read filters");
        badge.title = account.error;
        label.append(badge);
      }
      const saved = savedAccounts.get(account.id);
      const accountRow = el("div", "backup-account-row");
      accountRow.append(label);
      if (saved) {
        const badge = el("span", "status-badge status-success", "filters saved");
        badge.title = `Saved to ${saved.path}`;
        label.append(badge);
        if (saved.warnings) {
          const warningButton = el("button", "status-badge status-warning", `${saved.warnings} warning${saved.warnings === 1 ? "" : "s"}`);
          warningButton.type = "button";
          warningButton.title = `Highlight warnings for ${account.name}`;
          warningButton.setAttribute("aria-label", `Highlight ${saved.warnings} warnings for ${account.name}`);
          warningButton.setAttribute("aria-controls", "backup-warnings");
          warningButton.addEventListener("click", () => warningView?.highlightAccount(account.id));
          accountRow.append(warningButton);
        }
      }
      row.append(accountRow);
      rows.append(row);
    }
    update();
  }

  all.addEventListener("change", () => {
    selected = new Set(all.checked ? accounts.map(account => account.id) : []);
    render();
  });
  filename.addEventListener("input", () => {
    editedFilename = true;
    update();
  });
  save.addEventListener("click", async () => {
    if (save.disabled) {
      return;
    }
    busy = true;
    savedAccounts.clear();
    warningView?.panel.remove();
    warningView = null;
    render();
    let location;
    try {
      announce("Preparing filter backup…");
      const checked = chosen();
      const exported = await browser.Utilities.exportBackupAccounts(checked.map(account => account.id));
      if (!exported) {
        announce("Backup was not saved.");
        return;
      }
      const data = createBackup(exported, profileName, browser.runtime.getManifest().version);
      let name = sanitizeFilename(filename.value);
      if (!name.toLowerCase().endsWith(".json")) {
        name += ".json";
      }
      filename.value = name;
      location = await getBackupStorage().write({ filename: name, data });
      if (!location) {
        announce("Save cancelled. No backup was written.");
        return;
      }
      const count = exported.accounts.reduce((sum, account) => sum + account.filters.length, 0);
      for (const account of exported.accounts) {
        savedAccounts.set(account.id, {
          path: location.path,
          warnings: exported.warnings.filter(warning => warning.accountId === account.id).length,
        });
      }
      render();
      announce(`Saved ${count} filters from ${checked.length} accounts to ${location.path}. Use Return to Message Filters to return.`);
      if (exported.warnings.length) {
        warningView = createWarningPanel({ el, accounts: exported.accounts, warnings: exported.warnings });
        notice.after(warningView.panel);
      }
      try {
        await rememberBackupSelection(checked.map(account => account.id));
        await recordRecentFile(location, "backup");
      } catch (error) {
        announce(`Backup saved to ${location.path}, but preferences could not be saved: ${error.message}`);
      }
    } catch (error) {
      announce(location ? `Backup saved, but finishing the operation failed: ${error.message}` : `Backup failed: ${error.message}`);
    } finally {
      busy = false;
      // Keep the exact chosen name after saving or cancelling the picker.
      editedFilename = true;
      update();
    }
  });

  try {
    // MX supplies the account order; the experiment adds details absent from MX.
    const mxAccounts = await browser.accounts.list(false);
    const info = await browser.Utilities.getBackupInfo(mxAccounts.map(account => account.id));
    profileName = info.profileName;
    const byId = new Map(info.accounts.map(account => [account.id, account]));
    accounts = mxAccounts.filter(account => byId.has(account.id)).map(account => {
      const native = byId.get(account.id);
      return { ...native, name: account.name || native.name, user: native.username, host: native.hostname };
    });
    const stored = await browser.storage.local.get("backup.selectedAccountIds");
    const saved = stored["backup.selectedAccountIds"];
    selected = new Set(Array.isArray(saved) ? saved.filter(id => byId.has(id)) : accounts.map(account => account.id));
    const banner = document.querySelector(".file-info");
    banner.querySelector("strong").textContent = profileName || "Current profile";
    banner.querySelector("span").textContent = `${accounts.length} accounts · ${accounts.reduce((sum, account) => sum + account.count, 0)} filters`;
    render();
    announce(accounts.length ? "Choose accounts and a filename, then save your backup." : "No accounts supporting filters were found.");
    // Retain the generated default as a useful browser tooltip when edited.
    filename.title = filename.value;
  } catch (error) {
    save.disabled = true;
    all.disabled = true;
    announce(`Cannot load accounts: ${error.message}`);
  }
}
