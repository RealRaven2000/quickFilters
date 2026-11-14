/* Loaded into a private FiltersAPI scope, never into a chrome window. */
this.createFilterActionSummary = function ({ MailServices, ChromeUtils, Components, Localization, t }) {
  const { MailUtils } = ChromeUtils.importESModule("resource:///modules/MailUtils.sys.mjs");
  const l10n = new Localization(["messenger/searchWidgets.ftl", "messenger/filterEditor.ftl"]);
  const FA = Components.interfaces.nsMsgFilterAction;
  // Native filter-editor labels; Thunderbird owns their wording and translations.
  const labels = {
    MoveToFolder: "move", CopyToFolder: "copy", ChangePriority: "priority", Delete: "delete",
    MarkRead: "read", MarkUnread: "unread", KillThread: "ignore-thread", WatchThread: "watch-thread",
    MarkFlagged: "star", Reply: "reply", Forward: "forward", StopExecution: "stop",
    DeleteFromPop3Server: "delete-pop", JunkScore: "set-spam-status",
    FetchBodyFromPop3Server: "fetch-pop", AddTag: "tag", KillSubthread: "ignore-subthread",
  };
  async function nativeLabel(id) {
    const [message] = await l10n.formatMessages([{ id }]);
    const label = message?.attributes?.find(attribute => attribute.name === "label")?.value || message?.value;
    if (!label) throw new Error(`Missing native action label: ${id}`);
    return label;
  }
  async function describe(action) {
    if (action.type === FA.Custom) {
      let provider;
      try { provider = MailServices.filters.getCustomAction(action.customId); } catch { provider = null; }
      const name = provider?.name || action.customId;
      return action.strValue ? `${name}: ${action.strValue}` : name;
    }
    if (action.type === FA.LeaveOnPop3Server) return nativeLabel("filter-action-log-pop3-leave");
    const name = Object.keys(labels).find(key => FA[key] !== undefined && FA[key] === action.type);
    if (!name) throw new Error(`Unknown action type: ${action.type}`);
    const label = await nativeLabel(`rule-action-${labels[name]}`);
    let value = "";
    switch (action.type) {
      case FA.MoveToFolder:
      case FA.CopyToFolder: {
        const uri = action.targetFolderUri;
        let folder;
        try { folder = MailUtils.getExistingFolder(uri); } catch { folder = null; }
        const parts = [];
        for (let current = folder; current; current = current.parent) {
          parts.unshift(current.prettyName || current.name);
        }
        value = parts.join(" » ") || uri;
        break;
      }
      case FA.AddTag: {
        let tag;
        try { tag = MailServices.tags.getTagForKey(action.strValue); } catch { tag = null; }
        value = tag || action.strValue;
        break;
      }
      case FA.ChangePriority: {
        const priorities = Components.interfaces.nsMsgPriority;
        const priority = ["lowest", "low", "normal", "high", "highest"].find(key => priorities[key] === action.priority);
        value = priority ? await nativeLabel(`rule-priority-${priority}`) : String(action.priority);
        break;
      }
      case FA.JunkScore:
        value = action.junkScore === 100 ? await nativeLabel("rule-menuitem-spam") :
          action.junkScore === 0 ? await nativeLabel("rule-menuitem-not-spam") : String(action.junkScore);
        break;
      case FA.Forward:
      case FA.Reply:
        value = action.strValue;
        break;
    }
    return value ? `${label}: ${value}` : label;
  }
  return async function ({ accountId, filterName }) {
    // getFilters() currently returns a server key; also accept standard MX account IDs and legacy URIs.
    const account = Array.from(MailServices.accounts.accounts).find(acct =>
      acct.key === accountId || acct.incomingServer?.key === accountId || acct.incomingServer?.serverURI === accountId);
    if (!account?.incomingServer?.canHaveFilters) throw new Error("Filter account unavailable");
    const list = account.incomingServer.rootMsgFolder.getEditableFilterList(null);
    const matches = Array.from({ length: list.filterCount }, (_, index) => list.getFilterAt(index))
      .filter(filter => filter.filterName === filterName);
    if (matches.length !== 1) throw new Error("Filter unavailable or name is ambiguous");
    const filter = matches[0];
    const actions = [];
    for (let index = 0; index < filter.actionCount; index++) {
      try { actions.push(await describe(filter.getActionAt(index))); }
      catch { actions.push(t("assistant.merge.actionsUnavailable")); }
    }
    return { filterName: filter.filterName, enabled: filter.enabled, actions };
  };
};
