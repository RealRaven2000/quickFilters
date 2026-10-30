/* Loaded into a private API-owned scope, never a legacy window global. */
(function () {
  "use strict";
  /* Privileged backup boundary. Existing legacy backup/restore code is unchanged. */
  const { MailServices } = ChromeUtils.importESModule("resource:///modules/MailServices.sys.mjs");
  const { classes: Cc, interfaces: Ci } = Components;

  function mainWindow() {
    const win = Services.wm.getMostRecentWindow("mail:3pane");
    if (!win?.quickFilters?.Util) {
      throw new Error("Open a Thunderbird mail window before backing up filters.");
    }
    return win;
  }

  function describeAccount(account) {
    const server = account.incomingServer;
    return {
      id: account.key,
      name: server.prettyName,
      type: server.type,
      username: server.username || "",
      hostname: server.hostname || server.hostName || "",
      rootUri: server.rootMsgFolder.URI,
      localFolders: server === MailServices.accounts.localFoldersServer,
    };
  }

  function profileName() {
    try {
      const service = Cc["@mozilla.org/toolkit/profile-service;1"].getService(Ci.nsIToolkitProfileService);
      const directory = Services.dirsvc.get("ProfD", Ci.nsIFile);
      if (service.currentProfile?.rootDir.equals(directory)) {
        return service.currentProfile.name;
      }
      for (const profile of service.profiles) {
        if (profile.rootDir.equals(directory)) {
          return profile.name;
        }
      }
    } catch (error) {
      console.warn("quickFilters: profile display name unavailable", error);
    }
    return "";
  }

  function nativeAccount(id) {
    const account = MailServices.accounts.getAccount(id);
    if (!account?.incomingServer?.canHaveFilters) {
      throw new Error(`Account ${id} is unavailable or does not support filters.`);
    }
    return account;
  }

  function getBackupInfo(accountIds) {
    mainWindow();
    const accounts = accountIds.map(id => {
      const account = MailServices.accounts.getAccount(id);
      if (!account?.incomingServer?.canHaveFilters) {
        return null;
      }
      const info = describeAccount(account);
      try {
        info.count = account.incomingServer.getFilterList(null).filterCount;
      } catch (error) {
        info.count = 0;
        info.error = error.message;
      }
      return info;
    }).filter(Boolean);
    return { profileName: profileName(), accounts };
  }

  function exportBackupAccounts(accountIds) {
    const util = mainWindow().quickFilters.Util;
    if (!util.popupProFeature("saveFilters", true)) {
      return null;
    }
    if (!accountIds.length || new Set(accountIds).size !== accountIds.length) {
      throw new Error("Select at least one distinct account.");
    }
    const warnings = [];
    const directory = [...MailServices.accounts.accounts].filter(account => account.incomingServer).map(describeAccount);
    const referenced = new Map();
    const accounts = accountIds.map(id => {
      const account = nativeAccount(id);
      const list = account.incomingServer.getFilterList(null);
      const filters = [];
      for (let index = 0; index < list.filterCount; index++) {
        const filter = list.getFilterAt(index);
        const customErrors = [];
        const serialized = util.serializeFilter(filter, customErrors);
        if (!serialized) {
          throw new Error(`Could not export filter “${filter.filterName}”. No backup was written.`);
        }
        // Preserve matchAll in new exports without changing the legacy serializer.
        filter.searchTerms?.forEach((term, termIndex) => {
          if (term.matchAll && serialized.searchTerms?.[termIndex]) {
            serialized.searchTerms[termIndex].matchAll = true;
          }
          if (term.customId && serialized.searchTerms?.[termIndex]) {
            try {
              const name = MailServices.filters.getCustomTerm(term.customId)?.name;
              if (typeof name === "string" && name) {
                serialized.searchTerms[termIndex].customTermName = name;
              }
            } catch {
              // An unavailable extension must not prevent saving its search term.
            }
          }
        });
        for (const error of customErrors) {
          warnings.push({ accountId: id, filterName: filter.filterName, reason: "custom-action-unavailable", customId: error.customId });
        }
        for (const action of serialized.actionList || []) {
          if (action.type !== Ci.nsMsgFilterAction.MoveToFolder && action.type !== Ci.nsMsgFilterAction.CopyToFolder) {
            continue;
          }
          const uri = action.targetFolderUri;
          if (!uri || !/^(imap|mailbox):\/\/[^/]+(?:\/.*)?$/i.test(uri)) {
            warnings.push({ accountId: id, filterName: filter.filterName, reason: "invalid-target-folder", targetFolderUri: uri || "" });
            continue;
          }
          const owner = directory.filter(info => uri && (uri === info.rootUri || uri.startsWith(info.rootUri + "/")))
            .sort((a, b) => b.rootUri.length - a.rootUri.length)[0];
          if (owner) {
            referenced.set(owner.id, owner);
            // Existing-folder lookup only: never create or modify a folder.
            const target = util.getMsgFolderFromUri(uri, true);
            if (!target?.canFileMessages) {
              warnings.push({ accountId: id, filterName: filter.filterName, reason: "invalid-target-folder", targetFolderUri: uri });
            }
          } else {
            warnings.push({ accountId: id, filterName: filter.filterName, reason: "unknown-target-account", targetFolderUri: uri || "" });
          }
        }
        filters.push(serialized);
      }
      return { ...describeAccount(account), filters };
    });
    return {
      accounts,
      referencedAccounts: [...referenced.values()].filter(account => !accountIds.includes(account.id)),
      warnings,
    };
  }

  async function picker(mode, filename = "", directory = "") {
    const win = mainWindow();
    const fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
    fp.init(win.browsingContext, mode === "save" ? "Save filter backup" : "Open filter backup", mode === "save" ? fp.modeSave : fp.modeOpen);
    fp.appendFilter("JSON files", "*.json");
    fp.defaultExtension = "json";
    if (filename) {
      fp.defaultString = filename;
    }
    if (directory) {
      try {
        const folder = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
        folder.initWithPath(directory);
        if (folder.exists() && folder.isDirectory()) {
          fp.displayDirectory = folder;
        }
      } catch (error) {
        console.warn("quickFilters: saved backup folder is unavailable", error);
      }
    }
    const result = await new Promise(resolve => fp.open(resolve));
    return result === fp.returnOK || result === fp.returnReplace ? { file: fp.file, replace: result === fp.returnReplace } : null;
  }

  async function saveBackupFile(filename, text, directory) {
    // Reject control characters as well as path separators in the leaf filename.
    // eslint-disable-next-line no-control-regex
    if (!filename.trim() || /[<>:"/\\|?*\u0000-\u001f]/.test(filename)) {
      throw new Error("Enter a valid filename without a folder path.");
    }
    const data = JSON.parse(text);
    if (data.format !== "quickFilters-backup" || data.formatVersion !== 1 || !Array.isArray(data.accounts)) {
      throw new Error("Unsupported backup data.");
    }
    return writePickedFile(filename, text, directory);
  }

  async function saveRestoreReport(text, directory) {
    const report = JSON.parse(text);
    if (report.format !== "quickFilters-restore-report" || !Array.isArray(report.warnings)) {
      throw new Error("Invalid restore report");
    }
    return writePickedFile("quickFilters-restore-report.json", text, directory);
  }

  async function writePickedFile(filename, text, directory) {
    const chosen = await picker("save", filename, directory);
    if (!chosen) {
      return null;
    }
    const path = chosen.file.path;
    const temporary = `${path}.${Services.uuid.generateUUID().toString()}.tmp`;
    try {
      await IOUtils.writeUTF8(path, text, { tmpPath: temporary, mode: chosen.replace ? "overwrite" : "create", flush: true });
    } finally {
      await IOUtils.remove(temporary, { ignoreAbsent: true }).catch(error => console.warn("quickFilters: temporary backup cleanup failed", error));
    }
    return { backend: "local", path, directory: chosen.file.parent?.path, name: chosen.file.leafName };
  }

  async function readBackupFile(directory) {
    const chosen = await picker("open", "", directory);
    if (!chosen) {
      return null;
    }
    return { backend: "local", path: chosen.file.path, directory: chosen.file.parent?.path, name: chosen.file.leafName, text: await IOUtils.readUTF8(chosen.file.path) };
  }

  function returnToFilterList(token) {
    const win = mainWindow();
    // The most recently used mail window may differ from the launching window.
    for (const candidate of Services.wm.getEnumerator("mail:3pane")) {
      const origins = candidate.quickFilters?.backupOrigins;
      const origin = origins?.get(token)?.deref();
      if (origin && !origin.closed) {
        origin.focus();
        return true;
      }
      if (origins?.has(token)) {
        origins.delete(token);
      }
    }
    // The original dialog may have been closed while the backup tab was open.
    win.MsgFilters();
    return true;
  }

  Object.assign(this, { getBackupInfo, exportBackupAccounts, saveBackupFile, readBackupFile, returnToFilterList, saveRestoreReport });
}).call(this);
