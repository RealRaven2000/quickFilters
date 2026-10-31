import { t } from "./i18n.mjs";
import { classifyBackup } from "./backup-format.mjs";

function decodeOnce(value) {
  return decodeURIComponent(value);
}

export function canonicalHost(value) {
  if (!value) {
    return "";
  }
  try {
    return new URL(`https://${value}`).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return value.toLowerCase();
  }
}

export function accountFromUri(uri) {
  try {
    const parsed = new URL(uri);
    if (!["imap:", "mailbox:", "news:", "nntp:"].includes(parsed.protocol) || !parsed.hostname) {
      return null;
    }
    // Decode components, never the whole URI or explicit raw metadata.
    const hostname = decodeOnce(parsed.hostname);
    const username = decodeOnce(parsed.username);
    const localFolders =
      parsed.protocol === "mailbox:" &&
      hostname.toLowerCase() === "local folders" &&
      username === "nobody";
    return {
      type: localFolders
        ? "none"
        : parsed.protocol === "imap:"
          ? "imap"
          : ["news:", "nntp:"].includes(parsed.protocol)
            ? "nntp"
            : "",
      username,
      hostname,
      localFolders,
      rootUri: `${parsed.protocol}//${parsed.host ? (parsed.username ? `${parsed.username}@${parsed.host}` : parsed.host) : ""}`,
    };
  } catch {
    return null;
  }
}

export function accountIdentity(account) {
  if (account.localFolders) {
    return "local-folders";
  }
  const fallback = accountFromUri(account.rootUri);
  // Missing fields in early exports can be recovered from their encoded URI.
  const hostname = account.hostname || fallback?.hostname || "";
  const username = account.username ?? fallback?.username ?? "";
  return JSON.stringify([
    account.type || "",
    username,
    canonicalHost(hostname),
    !account.type ? fallback?.rootUri || account.rootUri || "" : "",
  ]);
}

function normalizeAccount(raw, index, filters) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(t("backup.format.invalidAccountMetadata"));
  }
  const parsed = accountFromUri(raw.rootUri || "");
  const account = {
    id: typeof raw.id === "string" && raw.id ? raw.id : `source-${index}`,
    name: typeof raw.name === "string" && raw.name ? raw.name : t("backup.format.sourceAccount"),
    type: typeof raw.type === "string" ? raw.type : parsed?.type || "",
    username: typeof raw.username === "string" ? raw.username : parsed?.username || "",
    hostname:
      typeof raw.hostname === "string" && raw.hostname ? raw.hostname : parsed?.hostname || "",
    rootUri: typeof raw.rootUri === "string" ? raw.rootUri : "",
    localFolders: raw.localFolders === true || parsed?.localFolders === true,
  };
  if (filters !== undefined) {
    if (!Array.isArray(filters)) {
      throw new Error(t("backup.format.missingFiltersFor", [account.name]));
    }
    for (const filter of filters) {
      if (
        !filter ||
        typeof filter.filterName !== "string" ||
        !filter.filterName ||
        !Array.isArray(filter.actionList) ||
        !Array.isArray(filter.searchTerms)
      ) {
        throw new Error(t("backup.format.invalidFilterDataIn", [account.name]));
      }
      if (
        !filter.actionList.every((action) => action && Number.isInteger(action.type)) ||
        !filter.searchTerms.every((term) => term && Number.isInteger(term.attrib))
      ) {
        throw new Error(t("backup.format.invalidActionOrConditionIn", [filter.filterName]));
      }
    }
    account.filters = filters;
  }
  return account;
}

export function normalizeBackup(data) {
  const kind = classifyBackup(data);
  let accounts, referencedAccounts;
  if (kind === "legacy-single-account") {
    const root = [data.accountName, data.rootFolderURL].find(
      (value) => typeof value === "string" && accountFromUri(value)
    );
    const metadata = accountFromUri(root || "") || {};
    accounts = [
      normalizeAccount(
        {
          ...metadata,
          id: "legacy-source",
          name: data.accountName || t("backup.format.legacyAccount"),
        },
        0,
        data.filters
      ),
    ];
    referencedAccounts = [];
  } else {
    if (!Array.isArray(data.referencedAccounts ?? [])) {
      throw new Error(t("backup.format.invalidReferencedAccountDirectory"));
    }
    accounts = data.accounts.map((raw, index) => normalizeAccount(raw, index, raw.filters));
    referencedAccounts = (data.referencedAccounts || []).map((raw, index) =>
      normalizeAccount(raw, index + accounts.length)
    );
  }
  if (!accounts.length) {
    throw new Error(t("backup.format.theBackupContainsNoSourceAccounts"));
  }
  const directory = [...accounts, ...referencedAccounts];
  if (new Set(directory.map((account) => account.id)).size !== directory.length) {
    throw new Error(t("backup.format.duplicateAccountIdentifiersInBackup"));
  }
  // Legacy files contain destination URIs, but no separate account directory.
  // Also recover omitted referenced accounts from early/malformed directories.
  for (const source of accounts) {
    for (const filter of source.filters) {
      for (const action of filter.actionList) {
        if (![1, 16].includes(action.type) || !action.targetFolderUri) {
          continue;
        }
        const parsed = accountFromUri(action.targetFolderUri);
        if (
          !parsed ||
          directory.some((account) => sameAccountUri(account.rootUri, parsed.rootUri))
        ) {
          continue;
        }
        const reference = {
          ...parsed,
          id: `uri-reference-${directory.length}`,
          name: parsed.localFolders
            ? t("backup.format.localFolders")
            : t("backup.format.referenced", [parsed.username || parsed.hostname]),
        };
        while (directory.some((account) => account.id === reference.id)) {
          reference.id += "-ref";
        }
        directory.push(reference);
        referencedAccounts.push(reference);
      }
    }
  }
  return { kind, sourceProfile: data.sourceProfile || { name: "" }, accounts, referencedAccounts };
}

export function sameAccountUri(left, right) {
  const a = accountFromUri(left),
    b = accountFromUri(right);
  return (
    !!a &&
    !!b &&
    a.type === b.type &&
    a.localFolders === b.localFolders &&
    a.username === b.username &&
    canonicalHost(a.hostname) === canonicalHost(b.hostname) &&
    new URL(left).port === new URL(right).port
  );
}

export function initialMappings(backup, targets, remembered = []) {
  const sources = [...backup.accounts, ...backup.referencedAccounts];
  const mappings = new Map(),
    selected = new Set(),
    statuses = new Map();
  const used = new Set();
  // Reserve valid remembered assignments before automatic matches can use them.
  const hasRemembered = (source) =>
    remembered.some((item) => item?.sourceIdentity === accountIdentity(source));
  const ordered = [...sources].sort((a, b) => Number(hasRemembered(b)) - Number(hasRemembered(a)));
  for (const source of ordered) {
    const identity = accountIdentity(source);
    if (sources.filter((item) => accountIdentity(item) === identity).length !== 1) {
      statuses.set(source.id, t("backup.format.chooseDestination"));
      continue;
    }
    const saved = remembered.filter((item) => item?.sourceIdentity === identity);
    let match,
      chosen = true;
    if (saved.length === 1) {
      const entry = saved[0];
      match = targets.find(
        (target) => target.id === entry.targetId && accountIdentity(target) === entry.targetIdentity
      );
      chosen = entry.selected !== false;
      statuses.set(
        source.id,
        match
          ? t("backup.format.remembered")
          : entry.targetId
            ? t("backup.format.destinationMissing")
            : t("backup.format.chooseDestination")
      );
    } else if (!saved.length) {
      const candidates = targets.filter((target) =>
        source.localFolders
          ? target.localFolders
          : source.type &&
            source.hostname &&
            source.username === target.username &&
            source.type === target.type &&
            canonicalHost(source.hostname) === canonicalHost(target.hostname)
      );
      if (candidates.length === 1) {
        match = candidates[0];
        statuses.set(source.id, t("backup.format.matched"));
      }
    }
    if (match && !used.has(match.id)) {
      mappings.set(source.id, match.id);
      used.add(match.id);
      if (Array.isArray(source.filters) && chosen) {
        selected.add(source.id);
      }
    }
  }
  return { mappings, selected, statuses };
}

export function rememberedMappings(backup, targets, mappings, selected) {
  return [...backup.accounts, ...backup.referencedAccounts].map((source) => {
    const target = targets.find((item) => item.id === mappings.get(source.id));
    return {
      sourceIdentity: accountIdentity(source),
      targetId: target?.id || null,
      targetIdentity: target ? accountIdentity(target) : null,
      selected: selected.has(source.id),
    };
  });
}