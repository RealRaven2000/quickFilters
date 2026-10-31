// One instance per page controller: never persist suppression across sessions.
export function createDeleteConfirmation() {
  let skip = false;
  let pending = false;
  return async name => {
    if (pending) { return false; }
    if (skip) { return true; }
    pending = true;
    try {
      const result = await browser.Utilities.confirmFilterDeletion(name);
      if (result.confirmed && result.doNotAskAgain) { skip = true; }
      return result.confirmed;
    } finally { pending = false; }
  };
}
