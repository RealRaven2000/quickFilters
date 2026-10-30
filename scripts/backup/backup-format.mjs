export const FORMAT = "quickFilters-backup";
export const FORMAT_VERSION = 1;

export function timestamp(date = new Date()) {
  const pad = value => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}`;
}

export function sanitizeFilename(name) {
  // Control characters cannot be used in portable filenames.
  // eslint-disable-next-line no-control-regex
  const clean = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim();
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(clean) ? `_${clean}` : clean;
}

export function suggestedFilename(accounts, profileName, date = new Date()) {
  const prefix = sanitizeFilename(accounts.length === 1 ? accounts[0].name : profileName || "");
  return prefix ? `${prefix}_${timestamp(date)}.json` : "";
}

export function createBackup(exported, profileName, version, date = new Date()) {
  return {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    addonVersion: version,
    createdAt: date.toISOString(),
    sourceProfile: { name: profileName || "" },
    accounts: exported.accounts,
    referencedAccounts: exported.referencedAccounts,
    warnings: exported.warnings,
  };
}

export function classifyBackup(data) {
  if (data?.format === FORMAT && data.formatVersion === FORMAT_VERSION && Array.isArray(data.accounts)) {
    return "multi-account";
  }
  if (data && Array.isArray(data.filters) && !data.format) {
    return "legacy-single-account";
  }
  throw new Error("Unsupported filter backup format or version.");
}
