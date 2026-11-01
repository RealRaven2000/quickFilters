export async function returnToMessageFilters(changedSinceBackup = false) {
  if (changedSinceBackup && (await browser.FiltersAPI.confirmBackupChanges())) {
    return false;
  }
  const tab = await browser.tabs.getCurrent();
  await browser.FiltersAPI.returnToFilterList(
    new URLSearchParams(window.location.search).get("origin") || ""
  );
  if (tab?.id !== undefined) {
    await browser.tabs.remove(tab.id);
  }
  return true;
}
