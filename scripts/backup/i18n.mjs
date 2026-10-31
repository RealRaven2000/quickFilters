// Use the MailExtension catalog for all live backup/restore UI text.
export function t(key, substitutions = []) {
  const api = globalThis.browser?.i18n || globalThis.messenger?.i18n;
  return api?.getMessage(key, substitutions.map(String)) || key;
}

export function localizeDocument(root = document) {
  for (const node of root.querySelectorAll?.("[data-backup-i18n]") || []) {
    node.textContent = t(node.getAttribute("data-backup-i18n"));
  }
  for (const node of root.querySelectorAll?.("[data-backup-title]") || []) {
    node.title = t(node.getAttribute("data-backup-title"));
  }
  for (const node of root.querySelectorAll?.("[data-backup-label]") || []) {
    node.setAttribute("aria-label", t(node.getAttribute("data-backup-label")));
  }
  if (root.documentElement) {
    root.documentElement.lang = browser.i18n.getUILanguage();
    root.documentElement.dir = browser.i18n.getMessage("@@bidi_dir") || "ltr";
  }
}
