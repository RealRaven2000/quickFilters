// Remember a shared native backup/restore folder in the add-on's own storage.
export async function withBackupDirectory(pick) {
  const key = "backup.lastDirectory";
  const stored = await browser.storage.local.get({ [key]: "" });
  const result = await pick(typeof stored[key] === "string" ? stored[key] : "");
  if (result?.directory) {
    try {
      await browser.storage.local.set({ [key]: result.directory });
    } catch (error) {
      console.warn("quickFilters: could not remember backup folder", error);
    }
  }
  return result;
}

// Native picker and disk I/O stay behind explicit experimental API methods.
export const localStorageAdapter = {
  async write({ filename, data }) {
    return withBackupDirectory((directory) =>
      browser.FiltersAPI.saveBackupFile(filename, JSON.stringify(data, null, 2), directory)
    );
  },
  async read() {
    const result = await withBackupDirectory((directory) =>
      browser.FiltersAPI.readBackupFile(directory)
    );
    return result ? { ...result, data: JSON.parse(result.text) } : null;
  },
};
