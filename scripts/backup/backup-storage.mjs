import { t } from "./i18n.mjs";
import { localStorageAdapter } from "./storage-local.mjs";

// A future VFS adapter implements the same write/read contract; UI and format
// code must not depend on a provider implementation or native paths.
const adapters = new Map([["local", localStorageAdapter]]);
export function getBackupStorage(backend = "local") {
  const adapter = adapters.get(backend);
  if (!adapter) {
    throw new Error(t("backup.storage.unsupportedBackupStorageBackend", [backend]));
  }
  return adapter;
}

export async function rememberBackupSelection(accountIds) {
  await browser.storage.local.set({ "backup.selectedAccountIds": accountIds });
}

export async function recordRecentFile(location, operation) {
  const key = "backup.recentFiles";
  const stored = await browser.storage.local.get({ [key]: [] });
  const previous = Array.isArray(stored[key]) ? stored[key] : [];
  const entry = { ...location, operation, lastUsed: new Date().toISOString() };
  const identity = value => JSON.stringify([value.backend, value.storageRef || null, value.path]);
  const history = [entry, ...previous.filter(item => identity(item) !== identity(entry))].slice(0, 20);
  await browser.storage.local.set({ [key]: history });
}