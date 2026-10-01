// notify background page to show the popup

(async () => {
  try {
    await messenger.Utilities.showToolbarPopup();
  } catch (ex) {
    console.error("quickFilters: could not show the toolbar popup:", ex);
  } finally {
    window.close();
  }
})();
