import { t, localizeDocument } from "./i18n.mjs";
import { withBackupDirectory } from "./storage-local.mjs";
import { returnToMessageFilters } from "./return-to-filters.mjs";
import { createDeleteConfirmation } from "./delete-confirmation.mjs";
import { normalizeBackup, initialMappings, rememberedMappings } from "./restore-format.mjs";
import { getBackupStorage, recordRecentFile } from "./backup-storage.mjs";
import { renderAccountMapping } from "./account-mapping-view.mjs";
import { createWarningPanel } from "./warning-table.mjs";

export async function initRestorePage({ el, accountText }) {
  localizeDocument();
  const confirmDelete = createDeleteConfirmation();
  const all = document.querySelector("#all");
  const restore = document.querySelector("#restore");
  const notice = document.querySelector("#notice");
  const banner = document.querySelector(".file-info");
  const summary = document.querySelector("#summary");
  const validation = document.querySelector("#validation");
  const announce = (text) => {
    notice.textContent = text;
  };
  let backup,
    location,
    targets = [],
    mappings = new Map(),
    selected = new Set(),
    statuses = new Map();
  let busy = false,
    ready = false,
    results,
    warningView;
  const sources = () => (backup ? [...backup.accounts, ...backup.referencedAccounts] : []);
  document.querySelector("#reset").hidden = true;
  document.title = `${t("backup.restore.title")} — quickFilters`;
  document.querySelector("#rows").replaceChildren();
  document.querySelector("main > details")?.remove();
  banner.querySelector("strong").textContent = t("backup.restore.noBackupSelected");
  banner.querySelector("span").textContent = t("backup.restore.openAJSONBackupToChooseAccounts");
  restore.textContent = t("backup.restore.restoreFilters");
  const open = el("button", "", t("backup.restore.openBackup"));
  open.type = "button";
  banner.append(open);
  const overwriteLabel = el("label", "restore-option");
  const overwrite = el("input");
  overwrite.type = "checkbox";
  overwrite.checked = true;
  overwriteLabel.append(
    overwrite,
    el("span", "", t("backup.restore.overwriteFiltersWithTheSameName"))
  );
  banner.after(overwriteLabel);
  overwrite.addEventListener("change", update);
  const back = el("button", "", t("backup.backup.returnToMessageFilters"));
  back.type = "button";
  document.querySelector(".actions").prepend(back);
  back.addEventListener("click", async () => {
    try {
      await returnToMessageFilters();
    } catch (error) {
      announce(error.message);
    }
  });

  function render() {
    renderAccountMapping({
      el,
      accountText,
      sources: sources(),
      targets,
      mappings,
      selected,
      statuses,
      busy,
      results,
      onSelect(id, checked) {
        if (!busy) {
          checked ? selected.add(id) : selected.delete(id);
          update();
        }
      },
      onAssign(targetId, sourceId, viaDrag) {
        if (busy) {
          return;
        }
        for (const [oldSource, destination] of mappings) {
          if (destination === targetId) {
            mappings.delete(oldSource);
            selected.delete(oldSource);
          }
        }
        if (sourceId) {
          if (mappings.has(sourceId)) {
            selected.delete(sourceId);
          }
          mappings.set(sourceId, targetId);
          statuses.set(sourceId, t("backup.restore.assigned"));
          if (viaDrag && backup.accounts.some((source) => source.id === sourceId)) {
            selected.add(sourceId);
          }
        }
        results = null;
        render();
      },
      onWarning(id) {
        warningView?.highlightAccount(id);
      },
    });
    update();
  }
  function update() {
    const accounts = backup?.accounts || [];
    all.checked = !!accounts.length && selected.size === accounts.length;
    all.indeterminate = selected.size > 0 && selected.size < accounts.length;
    all.disabled = busy || !accounts.length;
    open.disabled = busy || !ready;
    back.disabled = busy;
    overwrite.disabled = busy;
    document
      .querySelector("#rows")
      .querySelectorAll("input, button")
      .forEach((control) => {
        control.disabled = busy;
      });
    const missing = accounts.filter(
      (source) => selected.has(source.id) && !mappings.has(source.id)
    );
    restore.disabled = busy || !selected.size || !!missing.length;
    summary.textContent = t("backup.backup.ofAccountsSelectedFilters", [
      selected.size,
      accounts.length,
      accounts
        .filter((source) => selected.has(source.id))
        .reduce((sum, source) => sum + source.filters.length, 0),
    ]);
    validation.textContent = missing.length
      ? t("backup.restore.selectDestinationAccountsFor", [
          missing.map((source) => source.name).join(", "),
        ])
      : overwrite.checked
        ? t("backup.restore.sameNameFiltersAreReplacedNewFiltersAre")
        : t("backup.restore.existingFiltersAreKeptOnlyFiltersWithNew");
  }
  all.addEventListener("change", () => {
    selected = new Set(all.checked ? backup.accounts.map((source) => source.id) : []);
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
      });
    }
  });
  open.addEventListener("click", async () => {
    busy = true;
    render();
    try {
      const file = await getBackupStorage().read();
      if (!file) {
        announce(
          backup
            ? t("backup.restore.openCancelledThePreviousBackupRemainsLoaded")
            : t("backup.restore.openCancelled")
        );
        return;
      }
      const normalized = normalizeBackup(file.data);
      const stored = await browser.storage.local.get({ "restore.accountMappings": [] });
      const remembered = Array.isArray(stored["restore.accountMappings"])
        ? stored["restore.accountMappings"]
        : [];
      const initial = initialMappings(normalized, targets, remembered);
      backup = normalized;
      location = { backend: file.backend, path: file.path, name: file.name };
      ({ mappings, selected, statuses } = initial);
      results = null;
      warningView?.panel.remove();
      warningView = null;
      banner.querySelector("strong").textContent = file.name;
      banner.querySelector("strong").title = file.path;
      banner.querySelector("span").textContent = t(
        "backup.restore.sourceAccountsReferencedAccounts",
        [
          backup.kind === "legacy-single-account"
            ? t("backup.restore.legacyBackup")
            : t("backup.backup.backup"),
          backup.accounts.length,
          backup.referencedAccounts.length,
        ]
      );
      announce(t("backup.restore.checkDestinationMappingsThenRestoreTheSelectedAccounts"));
    } catch (error) {
      announce(
        t("backup.restore.cannotOpenBackup", [
          error.message,
          backup ? t("backup.restore.thePreviousBackupRemainsLoaded") : "",
        ])
      );
    } finally {
      busy = false;
      render();
    }
  });

  restore.addEventListener("click", async () => {
    if (restore.disabled) {
      return;
    }
    busy = true;
    results = null;
    warningView?.panel.remove();
    warningView = null;
    render();
    let result;
    try {
      announce(t("backup.restore.restoringFilters"));
      result = await browser.Utilities.restoreFilters({
        backup,
        mappings: [...mappings],
        selected: [...selected],
        overwriteExisting: overwrite.checked,
      });
      if (!result) {
        announce(t("backup.restore.restoreWasNotPerformed"));
        return;
      }
      results = result;
      announce(
        t(result.success ? "backup.restore.resultComplete" : "backup.restore.resultErrors", [
          result.added,
          result.replaced,
          result.kept || 0,
          result.skipped,
          result.failed || 0,
        ])
      );
      if (result.warnings.length) {
        warningView = createWarningPanel({
          el,
          accounts: backup.accounts,
          warnings: result.warnings,
          title: t("backup.restore.restoreReviewWarningsAndSkippedItems", [result.warnings.length]),
          async onEdit(token) {
            if (busy) {
              return;
            }
            busy = true;
            update();
            try {
              await browser.Utilities.editImportedFilter(token);
            } catch (error) {
              announce(t("backup.backup.couldNotEditFilter", [error.message]));
            } finally {
              busy = false;
              update();
            }
          },
          async onDelete(token, name) {
            if (busy || !(await confirmDelete(name))) {
              return;
            }
            busy = true;
            update();
            try {
              await browser.Utilities.deleteImportedFilter(token);
              for (const warning of result.warnings.filter(
                (item) => item.importedToken === token
              )) {
                warning.status = "deleted";
              }
              warningView.markDeleted(token);
              announce(t("backup.restore.deletedFilter", [name]));
            } catch (error) {
              announce(t("backup.backup.couldNotDeleteFilter", [error.message]));
            } finally {
              busy = false;
              update();
            }
          },
        });
        warningView.panel.open = true;
        const report = el("button", "", t("backup.restore.saveReport"));
        report.type = "button";
        report.addEventListener("click", async () => {
          report.disabled = true;
          try {
            const saved = await withBackupDirectory((directory) =>
              browser.Utilities.saveRestoreReport(
                JSON.stringify(
                  {
                    format: "quickFilters-restore-report",
                    createdAt: new Date().toISOString(),
                    sourceFile: location,
                    ...result,
                  },
                  null,
                  2
                ),
                directory
              )
            );
            if (saved) {
              announce(t("backup.restore.restoreReportSavedTo", [saved.path]));
            }
          } catch (error) {
            announce(t("backup.restore.couldNotSaveReport", [error.message]));
          } finally {
            report.disabled = false;
          }
        });
        warningView.panel.querySelector(".warning-toolbar").append(report);
        notice.after(warningView.panel);
      }
      if (result.success) {
        try {
          const key = "restore.accountMappings";
          const stored = await browser.storage.local.get({ [key]: [] });
          const entries = rememberedMappings(backup, targets, mappings, selected);
          const identities = new Set(entries.map((entry) => entry.sourceIdentity));
          const previous = Array.isArray(stored[key]) ? stored[key] : [];
          await browser.storage.local.set({
            [key]: [
              ...previous.filter((entry) => !identities.has(entry.sourceIdentity)),
              ...entries,
            ],
          });
          await recordRecentFile(location, "restore");
        } catch (error) {
          announce(
            t("backup.restore.restoreCompletedButMappingsCouldNotBeRemembered", [error.message])
          );
        }
      }
    } catch (error) {
      announce(t("backup.restore.restoreFailed", [error.message]));
    } finally {
      busy = false;
      render();
    }
  });

  render();
  try {
    const mx = await browser.accounts.list(false);
    const info = await browser.Utilities.getBackupInfo(mx.map((account) => account.id));
    const byId = new Map(info.accounts.map((account) => [account.id, account]));
    targets = mx
      .filter((account) => byId.has(account.id))
      .map((account) => ({
        ...byId.get(account.id),
        name: account.name || byId.get(account.id).name,
      }));
    ready = true;
    announce(t("backup.restore.openABackupFileToBeginNoFilters"));
  } catch (error) {
    announce(t("backup.restore.cannotLoadDestinationAccounts", [error.message]));
  }
  render();
}
