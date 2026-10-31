/* global t */
/* Loaded only into the Utilities API's private scope. */
(function () {
  "use strict";
  const { MailServices } = ChromeUtils.importESModule("resource:///modules/MailServices.sys.mjs");
  const Ci = Components.interfaces;
  const importedFilters = new Map();

  function mainWindow() {
    const win = Services.wm.getMostRecentWindow("mail:3pane");
    if (!win?.quickFilters?.Util) { throw new Error(t("backup.native.openAMailWindowBeforeRestoringFilters")); }
    return win;
  }

  function account(id) {
    const found = MailServices.accounts.getAccount(id);
    if (!found?.incomingServer?.canHaveFilters) { throw new Error(t("backup.native.destinationAccountIsUnavailable", [id])); }
    return found;
  }

  function uriParts(uri) {
    if (typeof uri !== "string") { return null; }
    const match = /^(imap|mailbox):\/\/([^/]+)(\/.*)?$/i.exec(uri);
    if (!match) { return null; }
    const at = match[2].lastIndexOf("@");
    try {
      const host = decodeURIComponent(match[2].slice(at + 1));
      const canonicalHost = match[1].toLowerCase() === "mailbox" && host.toLowerCase() === "local folders"
        ? "local folders" : Services.io.newURI(`https://${host}`).asciiHost.toLowerCase().replace(/\.$/, "");
      const port = /:(\d+)$/.exec(host)?.[1] || "";
      return {
        server: JSON.stringify([match[1].toLowerCase(), decodeURIComponent(at < 0 ? "" : match[2].slice(0, at)), canonicalHost, port]),
        path: match[3] || "",
      };
    } catch { return null; }
  }

  function remapFolder(uri, directory, mapping, util) {
    const parts = uriParts(uri);
    if (!parts) { throw new Error(t("backup.native.invalidTargetFolderURI")); }
    const owners = directory.filter(source => uriParts(source.rootUri)?.server === parts.server);
    if (!owners.length) {
      throw Object.assign(new Error(t("backup.native.theFolderSAccountCouldNotBeIdentified")), { reason: "unknown-target-account" });
    }
    if (owners.length > 1) {
      throw Object.assign(new Error(t("backup.native.moreThanOneSourceAccountMatchesTheFolder")), { reason: "unknown-target-account" });
    }
    if (!mapping.has(owners[0].id)) {
      throw Object.assign(new Error(t("backup.native.noDestinationSelectedForAccount", [owners[0].name || owners[0].id])), { reason: "unknown-target-account" });
    }
    const targetAccount = account(mapping.get(owners[0].id));
    let folder = targetAccount.incomingServer.rootMsgFolder;
    for (const segment of parts.path.split("/").slice(1)) {
      if (!segment) { throw new Error(t("backup.native.invalidEmptyFolderPathSegment")); }
      const name = decodeURIComponent(segment);
      try { folder = folder.getChildNamed(name); }
      catch { throw new Error(t("backup.native.folderDoesNotExistInTheDestinationAccount", [name])); }
      if (!folder) { throw new Error(t("backup.native.folderDoesNotExistInTheDestinationAccount", [name])); }
    }
    if (!folder.canFileMessages || !util.getMsgFolderFromUri(folder.URI, true)) {
      throw new Error(t("backup.native.targetFolderIsMissingOrCannotReceiveMessages"));
    }
    return folder.URI;
  }

  function available(method, id) {
    try { return !!MailServices.filters[method](id); } catch { return false; }
  }

  function deserialize(saved, list, directory, mapping, util, warnings) {
    if (!saved || typeof saved.filterName !== "string" || !saved.filterName || !Array.isArray(saved.actionList) || !Array.isArray(saved.searchTerms)) {
      throw new Error(t("backup.native.invalidSerializedFilter"));
    }
    if (saved.unparseable) { throw new Error(t("backup.native.unparseableFilterHasNoRestorableNativeBuffer")); }
    const filter = list.createFilter(saved.filterName);
    filter.filterDesc = saved.filterDesc || "";
    if (saved.filterType !== undefined) { filter.filterType = saved.filterType; }
    filter.temporary = saved.temporary === true;
    filter.enabled = saved.enabled === true;
    for (const savedAction of saved.actionList) {
      if (!savedAction || !Number.isInteger(savedAction.type)) { throw new Error(t("backup.native.invalidFilterAction")); }
      const action = filter.createAction();
      action.type = savedAction.type;
      if ([Ci.nsMsgFilterAction.MoveToFolder, Ci.nsMsgFilterAction.CopyToFolder].includes(action.type)) {
        if (typeof savedAction.targetFolderUri !== "string") { throw new Error(t("backup.native.missingSerializedTargetFolderURI")); }
        try { action.targetFolderUri = remapFolder(savedAction.targetFolderUri, directory, mapping, util); }
        catch (error) {
          action.targetFolderUri = savedAction.targetFolderUri;
          warnings.push({ reason: error.reason || "invalid-target-folder", targetFolderUri: savedAction.targetFolderUri, details: error.message });
        }
      } else if (action.type === Ci.nsMsgFilterAction.Custom) {
        if (typeof savedAction.customId !== "string" || !savedAction.customId) { throw new Error(t("backup.native.missingCustomActionIdentifier")); }
        action.customId = savedAction.customId;
        if (!available("getCustomAction", savedAction.customId)) {
          warnings.push({ reason: "custom-action-unavailable", customId: savedAction.customId,
            customName: typeof savedAction.customAction?.name === "string" ? savedAction.customAction.name : "" });
        }
      }
      // Do not access customAction or manufacture an implementation. The native
      // customId/strValue pair must survive even when its extension is absent.
      for (const field of ["strValue", "priority", "junkScore"]) {
        if (Object.hasOwn(savedAction, field)) { action[field] = savedAction[field]; }
      }
      filter.appendAction(action);
    }
    for (const savedTerm of saved.searchTerms) {
      if (!savedTerm || !Number.isInteger(savedTerm.attrib)) { throw new Error(t("backup.native.invalidSearchCondition")); }
      const term = filter.createTerm();
      term.attrib = savedTerm.attrib;
      if (savedTerm.matchAll === true) { term.matchAll = true; }
      if (Object.hasOwn(savedTerm, "op")) { term.op = savedTerm.op; }
      for (const field of ["customId", "arbitraryHeader", "hdrProperty"]) {
        if (Object.hasOwn(savedTerm, field)) { term[field] = savedTerm[field]; }
      }
      if (savedTerm.attrib === Ci.nsMsgSearchAttrib.Custom) {
        if (!savedTerm.customId) { throw new Error(t("backup.native.missingCustomSearchTermIdentifier")); }
        if (!available("getCustomTerm", savedTerm.customId)) {
          warnings.push({ reason: "custom-term-unavailable", customId: savedTerm.customId,
            customName: typeof savedTerm.customTermName === "string" ? savedTerm.customTermName : "" });
        }
      }
      if (savedTerm.value) {
        const value = term.value;
        value.attrib = savedTerm.value.attrib;
        for (const field of ["str", "priority", "msgKey", "age", "date", "status", "junkStatus", "size", "label", "junkPercent"]) {
          if (Object.hasOwn(savedTerm.value, field)) { value[field] = savedTerm.value[field]; }
        }
        if (Object.hasOwn(savedTerm.value, "folder")) {
          const folder = typeof savedTerm.value.folder === "string" ? util.getMsgFolderFromUri(savedTerm.value.folder, true) : null;
          if (!folder) { throw new Error(t("backup.native.cannotRestoreTheSerializedFolderSearchValue")); }
          value.folder = folder;
        }
        term.value = value;
      }
      term.booleanAnd = savedTerm.booleanAnd === true;
      for (const field of ["beginsGrouping", "endsGrouping"]) {
        if (Object.hasOwn(savedTerm, field)) { term[field] = typeof term[field] === "number" ? Number(savedTerm[field]) : !!savedTerm[field]; }
      }
      // Append exactly as saved; do not deduplicate terms or alter grouping.
      filter.appendTerm(term);
    }
    return filter;
  }

  function replaceContents(list, filters) {
    while (list.filterCount) { list.removeFilterAt(0); }
    filters.forEach((filter, index) => { filter.filterList = list; list.insertFilterAt(index, filter); });
  }

  function refreshLists() {
    for (const win of Services.wm.getEnumerator("mailnews:filterlist")) {
      try { win.quickFilters?.List?.rebuildFilterList(); }
      catch (error) { console.warn("quickFilters: filter-list refresh failed", error); }
    }
  }

  async function restoreFilters(request) {
    const util = mainWindow().quickFilters.Util;
    if (!await util.popupProFeature("loadFilters", true)) { return null; }
    const backup = request?.backup;
    if (!Array.isArray(backup?.accounts) || !Array.isArray(backup.referencedAccounts) || !Array.isArray(request.mappings) || !Array.isArray(request.selected)) {
      throw new Error(t("backup.native.invalidRestoreRequest"));
    }
    const directory = [...backup.accounts, ...backup.referencedAccounts];
    const ids = directory.map(source => source.id);
    if (ids.some(id => typeof id !== "string" || !id) || new Set(ids).size !== ids.length) { throw new Error(t("backup.native.invalidSourceAccountIdentifiers")); }
    const mapping = new Map();
    for (const pair of request.mappings) {
      if (!Array.isArray(pair) || pair.length !== 2 || !ids.includes(pair[0]) || typeof pair[1] !== "string" || mapping.has(pair[0])) { throw new Error(t("backup.native.invalidAccountMapping")); }
      account(pair[1]);
      mapping.set(pair[0], pair[1]);
    }
    if (new Set(mapping.values()).size !== mapping.size) { throw new Error(t("backup.native.eachSourceAccountRequiresADistinctDestination")); }
    if (!request.selected.length || new Set(request.selected).size !== request.selected.length || request.selected.some(id => !backup.accounts.some(source => source.id === id) || !mapping.has(id))) {
      throw new Error(t("backup.native.selectMappedSourceAccountsBeforeRestoring"));
    }
    // Validate all selected source collections before making any change.
    for (const source of backup.accounts.filter(item => request.selected.includes(item.id))) {
      if (!Array.isArray(source.filters)) { throw new Error(t("backup.native.invalidSourceFilterCollection")); }
    }
    const result = { success: true, added: 0, replaced: 0, kept: 0, skipped: 0, failed: 0, accounts: [], warnings: [] };
    importedFilters.clear();
    for (const source of backup.accounts.filter(item => request.selected.includes(item.id))) {
      const targetId = mapping.get(source.id);
      const report = { sourceId: source.id, targetId, added: 0, replaced: 0, kept: 0, skipped: 0 };
      result.accounts.push(report);
      let list, original;
      const staged = [], seen = new Set();
      try {
        const root = account(targetId).incomingServer.rootMsgFolder;
        list = root.getEditableFilterList(null);
        original = Array.from({ length: list.filterCount }, (_, index) => list.getFilterAt(index));
        const temporary = MailServices.filters.getTempFilterList(root);
        for (const saved of source.filters) {
          const filterName = typeof saved?.filterName === "string" ? saved.filterName : t("backup.common.unnamed");
          const base = { accountId: source.id, targetId, filterName };
          if (seen.has(filterName)) {
            report.skipped++;
            result.warnings.push({ ...base, reason: "duplicate-filter-name", status: "skipped", sourceFilter: saved });
            continue;
          }
          seen.add(filterName);
          if (request.overwriteExisting === false && original.some(filter => filter.filterName === filterName)) {
            report.kept++;
            continue;
          }
          const warnings = [];
          try {
            const filter = deserialize(saved, temporary, directory, mapping, util, warnings);
            staged.push({ filter, warnings: warnings.map(warning => ({ ...base, ...warning, status: "imported" })) });
          } catch (error) {
            report.skipped++;
            result.warnings.push({ ...base, reason: error.reason || "filter-import-failed", details: error.details || error.message, status: "skipped", sourceFilter: saved });
          }
        }
        const final = [...original], additions = [];
        for (const entry of staged) {
          const index = final.findIndex(filter => filter.filterName === entry.filter.filterName);
          if (index >= 0) { final[index] = entry.filter; report.replaced++; }
          else { additions.push(entry.filter); report.added++; }
        }
        if (staged.length) {
          replaceContents(list, [...additions, ...final]);
          try { list.saveToDefaultFile(); }
          catch (error) {
            replaceContents(list, original);
            try { list.saveToDefaultFile(); }
            catch (rollback) { throw new Error(t("backup.native.savingFailedRestoringTheOriginalFileAlsoFailed", [error.message, rollback.message])); }
            throw error;
          }
          for (const entry of staged) {
            if (!entry.warnings.length) { continue; }
            const token = Services.uuid.generateUUID().toString();
            importedFilters.set(token, { filter: entry.filter, targetId });
            result.warnings.push(...entry.warnings.map(warning => ({ ...warning, importedToken: token })));
          }
        }
        result.added += report.added;
        result.replaced += report.replaced;
      } catch (error) {
        if (list && original) { replaceContents(list, original); }
        report.error = error.message;
        report.added = report.replaced = 0;
        result.failed++;
        result.success = false;
        result.warnings.push({ accountId: source.id, targetId, filterName: "", reason: "account-restore-failed", details: error.message, status: "failed" });
      }
      result.skipped += report.skipped;
      result.kept += report.kept;
    }
    refreshLists();
    return result;
  }

  function editImportedFilter(token) {
    const entry = importedFilters.get(token);
    if (!entry) { throw new Error(t("backup.native.thisImportedFilterIsNoLongerAvailableRestore")); }
    const list = account(entry.targetId).incomingServer.rootMsgFolder.getEditableFilterList(null);
    if (!Array.from({ length: list.filterCount }, (_, index) => list.getFilterAt(index)).includes(entry.filter)) {
      throw new Error(t("backup.native.theImportedFilterWasRemovedOrReplacedReopen"));
    }
    const args = { filter: entry.filter, filterList: list };
    mainWindow().openDialog("chrome://messenger/content/FilterEditor.xhtml", "", "chrome,modal,resizable,centerscreen,dialog=yes", args);
    if (args.refresh) { list.saveToDefaultFile(); refreshLists(); }
    return !!args.refresh;
  }

  function deleteImportedFilter(token) {
    const entry = importedFilters.get(token);
    if (!entry) { throw new Error(t("backup.native.thisImportedFilterIsNoLongerAvailable")); }
    const list = account(entry.targetId).incomingServer.rootMsgFolder.getEditableFilterList(null);
    const original = Array.from({ length: list.filterCount }, (_, index) => list.getFilterAt(index));
    if (!original.includes(entry.filter)) {
      throw new Error(t("backup.native.theImportedFilterWasRemovedOrReplacedReopen"));
    }
    replaceContents(list, original.filter(filter => filter !== entry.filter));
    try { list.saveToDefaultFile(); }
    catch (error) {
      replaceContents(list, original);
      throw error;
    }
    importedFilters.delete(token);
    refreshLists();
    return true;
  }

  function registerReviewFilter(filter, targetId) {
    const token = Services.uuid.generateUUID().toString();
    importedFilters.set(token, { filter, targetId });
    return token;
  }

  Object.assign(this, { restoreFilters, editImportedFilter, deleteImportedFilter, registerReviewFilter });
}).call(this);
