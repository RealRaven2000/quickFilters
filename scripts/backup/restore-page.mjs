import { withBackupDirectory } from "./storage-local.mjs";
import { normalizeBackup, initialMappings, rememberedMappings } from "./restore-format.mjs";
import { getBackupStorage, recordRecentFile } from "./backup-storage.mjs";
import { renderAccountMapping } from "./account-mapping-view.mjs";
import { createWarningPanel } from "./warning-table.mjs";

export async function initRestorePage({ el, accountText }) {
  const all = document.querySelector("#all");
  const restore = document.querySelector("#restore");
  const notice = document.querySelector("#notice");
  const banner = document.querySelector(".file-info");
  const summary = document.querySelector("#summary");
  const validation = document.querySelector("#validation");
  const announce = text => { notice.textContent = text; };
  let backup, location, targets = [], mappings = new Map(), selected = new Set(), statuses = new Map();
  let busy = false, ready = false, results, warningView;
  const sources = () => backup ? [...backup.accounts, ...backup.referencedAccounts] : [];
  document.querySelector("#reset").hidden = true;
  document.querySelector(".eyebrow").textContent = "quickFilters";
  document.title = "Restore filters — quickFilters";
  document.querySelector("#rows").replaceChildren();
  document.querySelector("main > details")?.remove();
  banner.querySelector("strong").textContent = "No backup selected";
  banner.querySelector("span").textContent = "Open a JSON backup to choose accounts.";
  restore.textContent = "Restore filters";
  const open = el("button", "", "Open backup…"); open.type = "button";
  banner.append(open);
  const overwriteLabel = el("label", "restore-option");
  const overwrite = el("input");
  overwrite.type = "checkbox";
  overwrite.checked = true;
  overwriteLabel.append(overwrite, el("span", "", "Overwrite filters with the same name"));
  banner.after(overwriteLabel);
  overwrite.addEventListener("change", update);
  const back = el("button", "", "Return to Message Filters"); back.type = "button";
  document.querySelector(".actions").prepend(back);
  back.addEventListener("click", async () => {
    try { await browser.Utilities.returnToFilterList(new URLSearchParams(window.location.search).get("origin") || ""); }
    catch (error) { announce(error.message); }
  });

  function render() {
    renderAccountMapping({ el, accountText, sources: sources(), targets, mappings, selected, statuses, busy, results,
      onSelect(id, checked) { if (!busy) { checked ? selected.add(id) : selected.delete(id); update(); } },
      onAssign(targetId, sourceId, viaDrag) {
        if (busy) { return; }
        for (const [oldSource, destination] of mappings) {
          if (destination === targetId) { mappings.delete(oldSource); selected.delete(oldSource); }
        }
        if (sourceId) {
          if (mappings.has(sourceId)) { selected.delete(sourceId); }
          mappings.set(sourceId, targetId); statuses.set(sourceId, "Assigned");
          if (viaDrag && backup.accounts.some(source => source.id === sourceId)) { selected.add(sourceId); }
        }
        results = null;
        render();
      },
      onWarning(id) { warningView?.highlightAccount(id); },
    });
    update();
  }
  function update() {
    const accounts = backup?.accounts || [];
    all.checked = !!accounts.length && selected.size === accounts.length;
    all.indeterminate = selected.size > 0 && selected.size < accounts.length;
    all.disabled = busy || !accounts.length;
    open.disabled = busy || !ready; back.disabled = busy;
    overwrite.disabled = busy;
    document.querySelector("#rows").querySelectorAll("input, button").forEach(control => { control.disabled = busy; });
    const missing = accounts.filter(source => selected.has(source.id) && !mappings.has(source.id));
    restore.disabled = busy || !selected.size || !!missing.length;
    summary.textContent = `${selected.size} of ${accounts.length} accounts selected · ${accounts.filter(source => selected.has(source.id)).reduce((sum, source) => sum + source.filters.length, 0)} filters`;
    validation.textContent = missing.length ? `Select destination accounts for: ${missing.map(source => source.name).join(", ")}.` : overwrite.checked ? "Same-name filters are replaced; new filters are added; other filters remain." : "Existing filters are kept; only filters with new names are added.";
  }
  all.addEventListener("change", () => { selected = new Set(all.checked ? backup.accounts.map(source => source.id) : []); render(); });
  document.addEventListener("click", event => {
    document.querySelectorAll(".destination-picker[open]").forEach(picker => { if (!picker.contains(event.target)) { picker.open = false; } });
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      document.querySelectorAll(".destination-picker[open]").forEach(picker => { picker.open = false; picker.querySelector("summary").focus(); });
    }
  });
  open.addEventListener("click", async () => {
    busy = true; render();
    try {
      const file = await getBackupStorage().read();
      if (!file) { announce(backup ? "Open cancelled. The previous backup remains loaded." : "Open cancelled."); return; }
      const normalized = normalizeBackup(file.data);
      const stored = await browser.storage.local.get({ "restore.accountMappings": [] });
      const remembered = Array.isArray(stored["restore.accountMappings"]) ? stored["restore.accountMappings"] : [];
      const initial = initialMappings(normalized, targets, remembered);
      backup = normalized;
      location = { backend: file.backend, path: file.path, name: file.name };
      ({ mappings, selected, statuses } = initial);
      results = null; warningView?.panel.remove(); warningView = null;
      banner.querySelector("strong").textContent = file.name;
      banner.querySelector("strong").title = file.path;
      banner.querySelector("span").textContent = `${backup.kind === "legacy-single-account" ? "Legacy backup" : "Backup"} · ${backup.accounts.length} source accounts · ${backup.referencedAccounts.length} referenced accounts`;
      announce("Check destination mappings, then restore the selected accounts. Referenced accounts can be mapped without importing their filters.");
    } catch (error) {
      announce(`Cannot open backup: ${error.message}${backup ? " The previous backup remains loaded." : ""}`);
    } finally { busy = false; render(); }
  });

  restore.addEventListener("click", async () => {
    if (restore.disabled) { return; }
    busy = true; results = null; warningView?.panel.remove(); warningView = null; render();
    let result;
    try {
      announce("Restoring filters…");
      result = await browser.Utilities.restoreFilters({ backup, mappings: [...mappings], selected: [...selected], overwriteExisting: overwrite.checked });
      if (!result) { announce("Restore was not performed."); return; }
      results = result;
      announce(`Restore ${result.success ? "complete" : "finished with errors"}: ${result.added} added, ${result.replaced} replaced, ${result.kept || 0} existing filters kept, ${result.skipped} skipped${result.failed ? `, ${result.failed} accounts failed` : ""}.`);
      if (result.warnings.length) {
        warningView = createWarningPanel({ el, accounts: backup.accounts, warnings: result.warnings,
          title: `Restore review · ${result.warnings.length} warnings and skipped items`,
          async onEdit(token) {
            if (busy) { return; }
            busy = true; update();
            try { await browser.Utilities.editImportedFilter(token); }
            catch (error) { announce(`Could not edit filter: ${error.message}`); }
            finally { busy = false; update(); }
          },
          async onDelete(token, name) {
            if (busy || !window.confirm(`Delete imported filter “${name}”?`)) { return; }
            busy = true; update();
            try {
              await browser.Utilities.deleteImportedFilter(token);
              for (const warning of result.warnings.filter(item => item.importedToken === token)) {
                warning.status = "deleted";
              }
              warningView.markDeleted(token);
              announce(`Deleted filter “${name}”.`);
            } catch (error) { announce(`Could not delete filter: ${error.message}`); }
            finally { busy = false; update(); }
          },
        });
        warningView.panel.open = true;
        const report = el("button", "", "Save report…"); report.type = "button";
        report.addEventListener("click", async () => {
          report.disabled = true;
          try {
            const saved = await withBackupDirectory(directory => browser.Utilities.saveRestoreReport(JSON.stringify({ format: "quickFilters-restore-report", createdAt: new Date().toISOString(), sourceFile: location, ...result }, null, 2), directory));
            if (saved) { announce(`Restore report saved to ${saved.path}.`); }
          } catch (error) { announce(`Could not save report: ${error.message}`); }
          finally { report.disabled = false; }
        });
        warningView.panel.querySelector(".warning-toolbar").append(report);
        notice.after(warningView.panel);
      }
      if (result.success) {
        try {
          const key = "restore.accountMappings";
          const stored = await browser.storage.local.get({ [key]: [] });
          const entries = rememberedMappings(backup, targets, mappings, selected);
          const identities = new Set(entries.map(entry => entry.sourceIdentity));
          const previous = Array.isArray(stored[key]) ? stored[key] : [];
          await browser.storage.local.set({ [key]: [...previous.filter(entry => !identities.has(entry.sourceIdentity)), ...entries] });
          await recordRecentFile(location, "restore");
        } catch (error) { announce(`Restore completed, but mappings could not be remembered: ${error.message}`); }
      }
    } catch (error) { announce(`Restore failed: ${error.message}`); }
    finally { busy = false; render(); }
  });

  render();
  try {
    const mx = await browser.accounts.list(false);
    const info = await browser.Utilities.getBackupInfo(mx.map(account => account.id));
    const byId = new Map(info.accounts.map(account => [account.id, account]));
    targets = mx.filter(account => byId.has(account.id)).map(account => ({ ...byId.get(account.id), name: account.name || byId.get(account.id).name }));
    ready = true;
    announce("Open a backup file to begin. No filters are changed until you click Restore filters.");
  } catch (error) { announce(`Cannot load destination accounts: ${error.message}`); }
  render();
}
