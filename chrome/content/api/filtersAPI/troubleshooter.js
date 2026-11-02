/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* global t, getSessionStorage */
/* Private FiltersAPI scope; never injected into a surviving chrome window. */
(function () {
  "use strict";
  const { MailServices } = ChromeUtils.importESModule("resource:///modules/MailServices.sys.mjs");
  const Ci = Components.interfaces;
  const sessions = new Map();
  const categories = ["runs", "folders", "addons", "conditions"];
  function getTroubleshooterInfo() {
    return { appName: Services.appinfo.name, supportsMixedConditions: Services.appinfo.name === "Betterbird" };
  }
  const uuid = () => Services.uuid.generateUUID().toString();
  function runnableTypes() {
    const types = Ci.nsMsgFilterType;
    return types.Incoming | types.Periodic | types.Manual | types.PostPlugin | types.PostOutgoing | types.Archive;
  }
  function fail(key) { throw new Error(t(`troubleshooter.${key}`)); }
  function mailWindow() {
    const win = Services.wm.getMostRecentWindow("mail:3pane");
    if (!win?.quickFilters?.Util) fail("mailWindowRequired");
    return win;
  }
  function account(id) {
    const result = MailServices.accounts.getAccount(id);
    if (!result?.incomingServer?.canHaveFilters) fail("accountUnavailable");
    return result;
  }
  function listFor(id) { return account(id).incomingServer.rootMsgFolder.getEditableFilterList(null); }
  function sessionFor(id) {
    const session = sessions.get(id);
    if (!session) fail("sessionExpired");
    return session;
  }
  function termsOf(filter) { return Array.from(filter.searchTerms || []); }
  function hasMixedConditions(filter) {
    const terms = termsOf(filter).filter(term => !term.matchAll);
    return terms.some(term => term.beginsGrouping || term.endsGrouping) ||
      terms.some((term, index) => index > 0 && term.booleanAnd !== terms[0].booleanAnd);
  }
  function editable(filter) {
    try { termsOf(filter); return !filter.unparseable; }
    catch { return false; }
  }
  function entryFor(sessionId, token) {
    const entry = sessionFor(sessionId).entries.get(token);
    if (!entry) fail("filterUnavailable");
    const list = listFor(entry.accountId);
    if (!Array.from({ length: list.filterCount }, (_, index) => list.getFilterAt(index)).includes(entry.filter)) {
      fail("filterReplaced");
    }
    return { ...entry, list };
  }
  function refreshLists() {
    for (const win of Services.wm.getEnumerator("mailnews:filterlist")) {
      try { win.quickFilters?.List?.rebuildFilterList(); }
      catch (error) { console.warn("quickFilters: troubleshooter refresh", error); }
    }
  }
  function beginTroubleshooting() {
    const id = uuid();
    sessions.set(id, { entries: new Map(), tokens: new WeakMap() });
    return id;
  }
  function endTroubleshooting(id) { sessions.delete(id); }
  function scanFilters(sessionId, accountId, checks) {
    const session = sessionFor(sessionId);
    if (!Array.isArray(checks) || !checks.length || checks.some(check => !categories.includes(check))) fail("invalidCheck");
    const win = mailWindow(), util = win.quickFilters.Util;
    const list = listFor(accountId), server = account(accountId).incomingServer;
    const findings = [];
    for (let index = 0; index < list.filterCount; index++) {
      const filter = list.getFilterAt(index);
      let token = session.tokens.get(filter);
      if (!token) { token = uuid(); session.tokens.set(filter, token); }
      session.entries.set(token, { filter, accountId });
      const canEdit = editable(filter);
      const add = (category, reason, extra = {}) => findings.push({
        id: `${token}:${category}:${reason}:${extra.position ?? ""}`,
        token, accountId, filterName: filter.filterName, category, reason,
        enabled: filter.enabled, canEdit, state: "remaining", ...extra,
      });
      if (filter.unparseable) {
        for (const category of checks) add(category, "unparseable", { canEdit: false });
        continue;
      }
      for (const category of checks) {
        try {
          if (category === "runs") {
            const usable = runnableTypes();
            // Manual-only filters are intentional and must not be offered an automatic repair.
            if (filter.enabled && !(filter.filterType & usable) && ["imap", "pop3", "nntp", "none"].includes(server.type)) {
              add(category, "no-run-method");
            }
          } else if (category === "folders" || category === "addons") {
            for (let position = 0; position < filter.actionCount; position++) {
              const action = filter.getActionAt(position);
              if (category === "folders" && [Ci.nsMsgFilterAction.MoveToFolder, Ci.nsMsgFilterAction.CopyToFolder].includes(action.type)) {
                let valid = false;
                try { valid = !!util.getMsgFolderFromUri(action.targetFolderUri, true)?.canFileMessages; } catch { /* missing folder */ }
                if (!valid) add(category, "missing-folder", { position, targetFolderUri: action.targetFolderUri });
              }
              if (category === "addons" && action.type === Ci.nsMsgFilterAction.Custom) {
                let available = false;
                try { available = !!MailServices.filters.getCustomAction(action.customId); } catch { /* absent provider */ }
                if (!available) add(category, "missing-action", { position, customId: action.customId });
              }
            }
            if (category === "addons") {
              termsOf(filter).forEach((term, position) => {
                if (term.attrib !== Ci.nsMsgSearchAttrib.Custom) return;
                let available = false;
                try { available = !!MailServices.filters.getCustomTerm(term.customId); } catch { /* absent provider */ }
                if (!available) add(category, "missing-term", { position, customId: term.customId });
              });
            }
          } else if (category === "conditions") {
            if (!termsOf(filter).length) add(category, "missing-conditions");
            else if (!getTroubleshooterInfo().supportsMixedConditions && hasMixedConditions(filter)) add(category, "mixed-conditions", { state: filter.enabled ? "remaining" : "disabled" });
          }
        } catch (error) {
          add(category, "inspection-failed", { details: error.message, canEdit: false });
        }
      }
    }
    // Retain exact-object identity only for filters still present in their account.
    const current = new Set(Array.from({ length: list.filterCount }, (_, index) => list.getFilterAt(index)));
    for (const [token, entry] of session.entries) {
      if (entry.accountId === accountId && !current.has(entry.filter)) session.entries.delete(token);
    }
    return { accountId, count: list.filterCount, checks: [...new Set(checks)], findings };
  }
  function getFilterConditionText(sessionId, token) {
    const { filter } = entryFor(sessionId, token);
    if (filter.unparseable) return { text: filter.unparsedBuffer || "", unparseable: true, terms: [], canEdit: false };
    // Port of MsgTermListToString, mailnews/base/src/nsMsgUtils.cpp (MPL 2.0).
    // Revisit when Thunderbird's mixed-condition editor changes the serialization.
    const terms = termsOf(filter).map(term => {
      const isCustom = term.attrib === Ci.nsMsgSearchAttrib.Custom;
      const customId = isCustom ? (term.customId || "") : "";
      let customAvailable = false;
      if (customId) {
        try { customAvailable = !!MailServices.filters.getCustomTerm(customId); } catch { /* missing provider */ }
      }
      return {
        text: term.matchAll ? "ALL" : term.termAsString,
        matchAll: !!term.matchAll, booleanAnd: !!term.booleanAnd,
        beginsGrouping: Number(term.beginsGrouping || 0), endsGrouping: Number(term.endsGrouping || 0),
        isCustom, customId, customAvailable,
      };
    });
    return {
      text: terms.map(term => term.matchAll ? "ALL" : `${term.booleanAnd ? "AND" : "OR"} (${term.text})`).join(" "),
      terms, unparseable: false, canEdit: editable(filter),
    };
  }
  async function editReviewedFilter(sessionId, token) {
    let entry = entryFor(sessionId, token);
    if (!editable(entry.filter)) fail("unsafeEditor");
    if (Services.appinfo.name === "Thunderbird" && hasMixedConditions(entry.filter)) {
      const storage = getSessionStorage();
      const key = "troubleshooter.skipMixedConditionsEditWarning";
      const consent = await storage.get(key);
      if (consent[key] !== true) {
        const prompt = Services.prompt, checked = { value: false };
        const flags = prompt.BUTTON_POS_0 * prompt.BUTTON_TITLE_IS_STRING +
          prompt.BUTTON_POS_1 * prompt.BUTTON_TITLE_CANCEL + prompt.BUTTON_POS_1_DEFAULT;
        const choice = prompt.confirmEx(mailWindow(), t("troubleshooter.title"),
          t("troubleshooter.mixedEditWarning"), flags, t("troubleshooter.openEditorAnyway"), null, null,
          t("troubleshooter.dontWarnUntilRestart"), checked);
        if (choice !== 0) return { changed: false };
        // Cancel must never grant consent. This memory-only setting is shared by all review tabs.
        if (checked.value) await storage.set({ [key]: true });
      }
    }
    // Awaiting storage or dismissing a modal can allow the filter to be replaced.
    entry = entryFor(sessionId, token);
    if (!editable(entry.filter)) fail("unsafeEditor");
    const args = { filter: entry.filter, filterList: entry.list };
    mailWindow().openDialog("chrome://messenger/content/FilterEditor.xhtml", "", "chrome,modal,resizable,centerscreen,dialog=yes", args);
    if (args.refresh) { entry.list.saveToDefaultFile(); refreshLists(); }
    return { changed: !!args.refresh };
  }
  function remedyFilter(sessionId, token, remedy) {
    const { filter, accountId, list } = entryFor(sessionId, token);
    if (!["edit", "delete", "disable", "enableIncoming"].includes(remedy)) fail("invalidRemedy");
    if (remedy === "edit") {
      return editReviewedFilter(sessionId, token);
    }
    const types = Ci.nsMsgFilterType;
    if (remedy === "disable" && !filter.enabled) return { changed: false };
    if (remedy === "enableIncoming") {
      if (!filter.enabled || filter.filterType & runnableTypes()) fail("filterChanged");
      if (!["imap", "pop3", "nntp", "none"].includes(account(accountId).incomingServer.type)) fail("invalidRemedy");
    }
    const promptKey = { delete: "confirmDelete", disable: "confirmDisable", enableIncoming: "confirmIncoming" }[remedy];
    if (!Services.prompt.confirm(mailWindow(), t("troubleshooter.title"), t(`troubleshooter.${promptKey}`, [filter.filterName]))) return { changed: false };
    // The confirmation runs a nested event loop. Revalidate identity before writing.
    const current = entryFor(sessionId, token);
    if (current.list !== list) fail("filterChanged");
    if (remedy === "enableIncoming" && (!filter.enabled || filter.filterType & runnableTypes())) fail("filterChanged");
    const original = Array.from({ length: list.filterCount }, (_, index) => list.getFilterAt(index));
    const enabled = filter.enabled, filterType = filter.filterType;
    try {
      if (remedy === "delete") list.removeFilterAt(original.indexOf(filter));
      else if (remedy === "disable") filter.enabled = false;
      else filter.filterType |= account(accountId).incomingServer.type === "nntp" ? types.NewsRule : types.InboxRule;
      list.saveToDefaultFile();
    } catch (error) {
      filter.enabled = enabled;
      filter.filterType = filterType;
      if (remedy === "delete") {
        while (list.filterCount) list.removeFilterAt(0);
        original.forEach((item, index) => list.insertFilterAt(index, item));
      }
      // A failed native write may have partly written the file. Attempt to restore it.
      try { list.saveToDefaultFile(); } catch (rollback) { throw new Error(`${error.message}; ${rollback.message}`); }
      throw error;
    }
    if (remedy === "delete") sessionFor(sessionId).entries.delete(token);
    refreshLists();
    return { changed: true };
  }
  function openFilterLog(accountId) {
    mailWindow().openDialog("chrome://messenger/content/viewLog.xhtml", "FilterLog",
      "chrome,dependent,titlebar,resizable,centerscreen", { filterList: listFor(accountId) });
  }
  async function openFilterAddons() {
    await mailWindow().openAddonsMgr("addons://list/extension");
  }
  Object.assign(this, { getTroubleshooterInfo, beginTroubleshooting, endTroubleshooting, scanFilters, getFilterConditionText, remedyFilter, openFilterLog, openFilterAddons });
}).call(this);
