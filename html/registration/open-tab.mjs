/**
 * Open or reuse the registration tab and focus its Thunderbird window.
 * Reuse navigates to a fresh URL, clearing any earlier feature or test scenario.
 *
 * @param {object} api - MailExtension API object providing runtime, tabs and windows.
 * @param {object} [options] - Registration context.
 * @param {string} [options.feature=""] - Raw originating feature or page name.
 *   It is encoded into the registration URL and may become the shop referrer;
 *   an existing valid or expired license key takes precedence at checkout.
 * @returns {Promise<object>} The created or updated tab.
 * @throws {Error} If querying, opening, updating or focusing the tab fails.
 */
export async function openRegistrationTab(api, { feature = "" } = {}) {
  const base = api.runtime.getURL("html/registration/registration.html");
  const destination = new URL(base);
  if (typeof feature === "string" && feature) {
    destination.searchParams.set("feature", feature);
  }
  const tabs = await api.tabs.query({});
  const existing = tabs.find((tab) => {
    if (!tab.url) {
      return false;
    }
    try {
      const candidate = new URL(tab.url);
      const expected = new URL(base);
      return (
        candidate.protocol === expected.protocol &&
        candidate.host === expected.host &&
        candidate.pathname === expected.pathname
      );
    } catch {
      return false;
    }
  });
  const tab = existing
    ? await api.tabs.update(existing.id, { url: destination.href, active: true })
    : await api.tabs.create({ url: destination.href, active: true });
  await api.windows.update(tab.windowId, { focused: true });
  return tab;
}
