import { t, localizeDocument } from "./i18n.mjs";
import { createBackup, sanitizeFilename, suggestedFilename } from "./backup-format.mjs";
import { getBackupStorage, rememberBackupSelection, recordRecentFile } from "./backup-storage.mjs";
import { createWarningPanel } from "./warning-table.mjs";
import { returnToMessageFilters } from "./return-to-filters.mjs";
import { createDeleteConfirmation } from "./delete-confirmation.mjs";

export async function initBackupPage({ el, accountText }) {
  localizeDocument();
  document.title = `${t("backup.backup.title")} — quickFilters`;
  const rows = document.querySelector("#rows");
  const all = document.querySelector("#all");
  const filename = document.querySelector("#filename");
  const save = document.querySelector("#save");
  const notice = document.querySelector("#notice");
  const summary = document.querySelector("#summary");
  const validation = document.querySelector("#validation");
  const announce = (text) => {
    notice.textContent = text;
  };
  let busy = false;
  let editedFilename = false;
  const filenameDate = new Date();
  let accounts = [];
  let profileName = "";
  let selected = new Set();
  const savedAccounts = new Map();
  const shortcutHints = new Map();
  let warningView;
  const changedAccounts = new Set();
  const confirmDelete = createDeleteConfirmation();
  const selectionToken =
    new URLSearchParams(window.location.search).get("selection") === "1"
      ? new URLSearchParams(window.location.search).get("origin")
      : undefined;
  let selectionInfo;
  const accountHeading = document.querySelector(".grid-heading");
  if (accountHeading) {
    accountHeading.hidden = !!selectionToken;
  }

  document.querySelector("#reset").hidden = true;
  save.textContent = t("backup.backup.saveBackup");
  announce(t("backup.backup.loadingAccountsAndFilterCounts"));
  document.querySelector(".file-info strong").textContent = t("backup.backup.currentProfile");
  document.querySelector(".file-info span").textContent = t("backup.common.loading");
  const back = el("button", "", t("backup.backup.returnToMessageFilters"));
  back.type = "button";
  document.querySelector(".actions").prepend(back);
  back.addEventListener("click", async () => {
    back.disabled = true;
    try {
      await returnToMessageFilters(changedAccounts.size > 0);
    } catch (error) {
      announce(t("backup.backup.couldNotReturnToTheFilterList", [error.message]));
    } finally {
      back.disabled = busy;
    }
  });

  function chosen() {
    return accounts.filter((account) => selected.has(account.id));
  }

  function update() {
    const checked = chosen();
    for (const [id, hint] of shortcutHints) {
      hint.hidden = checked.length !== 1 || !selected.has(id);
    }
    all.checked = accounts.length > 0 && checked.length === accounts.length;
    all.indeterminate = checked.length > 0 && checked.length < accounts.length;
    if (!editedFilename) {
      filename.value = suggestedFilename(
        checked.map((account) =>
          selectionToken
            ? { ...account, name: t("backup.backup.selectedFilters", [account.name]) }
            : account
        ),
        profileName,
        filenameDate
      );
    }
    const cleanName = sanitizeFilename(filename.value);
    const hasError = checked.some((account) => account.error);
    save.disabled =
      busy ||
      !checked.length ||
      !cleanName ||
      hasError ||
      (!!selectionInfo && !selectionInfo.names.length);
    filename.disabled = busy;
    all.disabled = busy || !accounts.length || !!selectionToken;
    back.disabled = busy;
    rows.querySelectorAll("input").forEach((input) => {
      input.disabled = busy || !!selectionToken;
    });
    summary.textContent = t("backup.backup.ofAccountsSelectedFilters", [
      checked.length,
      accounts.length,
      checked.reduce((sum, account) => sum + account.count, 0),
    ]);
    validation.textContent = !checked.length
      ? t("backup.backup.selectAtLeastOneAccount")
      : hasError
        ? t("backup.backup.uncheckAccountsWhoseFiltersCouldNotBeRead")
        : !cleanName
          ? t("backup.backup.enterABackupFilename")
          : t("backup.backup.selectedAccountsWillBeSavedTogetherInOne");
  }
  
  function render() {
    rows.replaceChildren();
    shortcutHints.clear();
    for (const account of accounts) {
      const row = el("div", "mapping-row");
      const label = el("label", "source");
      const checkbox = el("input");
      checkbox.type = "checkbox";
      checkbox.checked = selected.has(account.id);
      checkbox.setAttribute("aria-label", t("backup.backup.backUpFiltersFrom", [account.name]));
      checkbox.addEventListener("change", () => {
        if (selectionToken) {
          checkbox.checked = true;
          return;
        }
        checkbox.checked ? selected.add(account.id) : selected.delete(account.id);
        update();
      });
      const text = accountText(account);
      const countLine = el("div", "backup-filter-count");
      countLine.append(
        el(
          "span",
          "badge",
          selectionInfo
            ? t("backup.backup.ofFiltersSelected", [account.count, account.totalCount])
            : t("backup.backup.filters", [account.count])
        )
      );
      if (!selectionToken) {
        const hint = el("span", "backup-selection-hint");
        const [before, after] = t("backup.backup.selectionHint", ["\uFFFC"]).split("\uFFFC");
        hint.append(el("span", "", before));
        const icon = el("span", "backup-toolbar-icon");
        icon.setAttribute("role", "img");
        icon.setAttribute("aria-label", t("backup.backup.backup"));
        icon.title = t("backup.backup.backupButtonInMessageFilters");
        hint.append(icon, el("span", "", after));
        shortcutHints.set(account.id, hint);
        countLine.append(hint);
      }
      text.append(countLine);
      label.append(checkbox, text);
      if (account.error) {
        const badge = el("span", "status-badge status-error", t("backup.backup.cannotReadFilters"));
        badge.title = account.error;
        label.append(badge);
      }
      const saved = savedAccounts.get(account.id);
      const accountRow = el("div", "backup-account-row");
      accountRow.append(label);
      if (saved) {
        const badge = el("span", "status-badge status-success", t("backup.backup.filtersSaved"));
        badge.title = t("backup.backup.savedTo", [saved.path]);
        label.append(badge);
        if (saved.warnings) {
          const warningButton = el(
            "button",
            "status-badge status-warning",
            t(
              saved.warnings === 1 ? "backup.common.warningCountOne" : "backup.common.warningCount",
              [saved.warnings]
            )
          );
          warningButton.type = "button";
          warningButton.title = t("backup.backup.highlightWarningsFor2", [account.name]);
          warningButton.setAttribute(
            "aria-label",
            t("backup.backup.highlightWarningsFor", [saved.warnings, account.name])
          );
          warningButton.setAttribute("aria-controls", "backup-warnings");
          warningButton.addEventListener("click", () => warningView?.highlightAccount(account.id));
          accountRow.append(warningButton);
        }
      }
      row.append(accountRow);
      if (selectionInfo) {
        const selectionList = el("ul", "selected-filter-list");
        selectionInfo.names.forEach((name) => selectionList.append(el("li", "", name)));
        row.append(selectionList);
      }
      rows.append(row);
    }
    update();
  }

  all.addEventListener("change", () => {
    if (selectionToken) {
      return;
    }
    selected = new Set(all.checked ? accounts.map((account) => account.id) : []);
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
      announce(t("backup.backup.preparingFilterBackup"));
      const checked = chosen();
      const exported = await browser.FiltersAPI.exportBackupAccounts(
        checked.map((account) => account.id),
        selectionToken
      );
      if (!exported) {
        announce(t("backup.backup.backupWasNotSaved"));
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
        announce(t("backup.backup.saveCancelledNoBackupWasWritten"));
        return;
      }
      // Preserve any filename the user chose in Save As for the next backup.
      if (location.name) {
        if (location.name !== name) {
          editedFilename = true;
        }
        filename.value = location.name;
      }
      const count = exported.accounts.reduce((sum, account) => sum + account.filters.length, 0);
      exported.accounts.forEach((account) => changedAccounts.delete(account.id));
      for (const account of exported.accounts) {
        savedAccounts.set(account.id, {
          path: location.path,
          warnings: exported.warnings.filter((warning) => warning.accountId === account.id).length,
        });
      }
      render();
      announce(
        t("backup.backup.savedFiltersFromAccountsToUseReturnTo", [
          count,
          checked.length,
          location.path,
        ])
      );
      if (exported.warnings.length) {
        warningView = createWarningPanel({
          el,
          accounts: exported.accounts,
          warnings: exported.warnings,
          backupReview: true,
          async onEdit(token) {
            if (busy) {
              return;
            }
            busy = true;
            update();
            try {
              if (await browser.FiltersAPI.editImportedFilter(token)) {
                changedAccounts.add(
                  exported.warnings.find((warning) => warning.reviewToken === token).accountId
                );
                if (selectionToken) {
                  selectionInfo = await browser.FiltersAPI.getBackupSelection(selectionToken);
                }
                warningView.markEdited(token);
                announce(t("backup.backup.filtersChangedBackUpAgainIfYouWant"));
              }
            } catch (error) {
              announce(t("backup.backup.couldNotEditFilter", [error.message]));
            } finally {
              busy = false;
              render();
            }
          },
          async onDelete(token, filterName) {
            if (busy || !(await confirmDelete(filterName))) {
              return;
            }
            busy = true;
            update();
            try {
              await browser.FiltersAPI.deleteImportedFilter(token);
              changedAccounts.add(
                exported.warnings.find((warning) => warning.reviewToken === token).accountId
              );
              warningView.markDeleted(token);
              const accountId = exported.warnings.find(
                (warning) => warning.reviewToken === token
              )?.accountId;
              const account = accounts.find((item) => item.id === accountId);
              if (account) {
                account.count = Math.max(0, account.count - 1);
                account.totalCount = Math.max(0, account.totalCount - 1);
              }
              if (selectionToken) {
                selectionInfo = await browser.FiltersAPI.getBackupSelection(selectionToken);
              }
              announce(t("backup.backup.deletedFilterBackUpAgainIfYouWant", [filterName]));
            } catch (error) {
              announce(t("backup.backup.couldNotDeleteFilter", [error.message]));
            } finally {
              busy = false;
              render();
            }
          },
        });
        notice.after(warningView.panel);
      }
      try {
        if (!selectionToken) {
          await rememberBackupSelection(checked.map((account) => account.id));
        }
        await recordRecentFile(location, "backup");
      } catch (error) {
        announce(
          t("backup.backup.backupSavedToButPreferencesCouldNotBe", [location.path, error.message])
        );
      }
    } catch (error) {
      announce(
        location
          ? t("backup.backup.backupSavedButFinishingTheOperationFailed", [error.message])
          : t("backup.backup.backupFailed", [error.message])
      );
    } finally {
      busy = false;
      update();
    }
  });

  try {
    // MX supplies the account order; the experiment adds details absent from MX.
    let mxAccounts = await browser.accounts.list(false);
    if (selectionToken) {
      selectionInfo = await browser.FiltersAPI.getBackupSelection(selectionToken);
      mxAccounts = mxAccounts.filter((account) => account.id === selectionInfo.accountId);
      document.querySelector("h1").textContent = t("backup.backup.backUpSelectedFilters");
      document.querySelector("header p").textContent = t(
        "backup.backup.onlyTheFiltersListedBelowWillBeSaved"
      );
    }
    const info = await browser.FiltersAPI.getBackupInfo(mxAccounts.map((account) => account.id));
    profileName = info.profileName;
    const byId = new Map(info.accounts.map((account) => [account.id, account]));
    accounts = mxAccounts
      .filter((account) => byId.has(account.id))
      .map((account) => {
        const native = byId.get(account.id);
        return {
          ...native,
          totalCount: native.count,
          count: selectionInfo ? selectionInfo.names.length : native.count,
          name: account.name || native.name,
          user: native.username,
          host: native.hostname,
        };
      });
    const stored = await browser.storage.local.get("backup.selectedAccountIds");
    const saved = stored["backup.selectedAccountIds"];
    selected = new Set(
      !selectionToken && Array.isArray(saved)
        ? saved.filter((id) => byId.has(id))
        : accounts.map((account) => account.id)
    );
    const banner = document.querySelector(".file-info");
    banner.querySelector("strong").textContent = profileName || t("backup.backup.currentProfile");
    banner.querySelector("span").textContent = t("backup.backup.accountsFilters", [
      accounts.length,
      accounts.reduce((sum, account) => sum + account.count, 0),
    ]);
    render();
    announce(
      accounts.length
        ? t("backup.backup.chooseAccountsAndAFilenameThenSaveYour")
        : t("backup.backup.noAccountsSupportingFiltersWereFound")
    );
    // Retain the generated default as a useful browser tooltip when edited.
    filename.title = filename.value;
  } catch (error) {
    save.disabled = true;
    all.disabled = true;
    announce(t("backup.backup.cannotLoadAccounts", [error.message]));
  }
}
