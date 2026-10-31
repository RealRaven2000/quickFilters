export async function returnToMessageFilters(changedSinceBackup = false) {
  if (changedSinceBackup && (await browser.Utilities.confirmBackupChanges())) {
    return false;
  }
  const tab = await browser.tabs.getCurrent();
  await browser.Utilities.returnToFilterList(
    new URLSearchParams(window.location.search).get("origin") || ""
  );
  if (tab?.id !== undefined) {
    await browser.tabs.remove(tab.id);
  }
  return true;
}
