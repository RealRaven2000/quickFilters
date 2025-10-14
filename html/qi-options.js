quickFilters.Options = {
  sendMail: async function sendMail(mailto = quickFilters.Util.ADDON_SUPPORT_MAIL) {
    let // obsolete: title = QuickFolders.Util.getBundleString("qf.prompt.contact.title"),
      text = messenger.i18n.getMessage("quickfilters.prompt.contact.subject"),
      result = window.prompt(text, "");
    if (!result) {
      return;
    }

    let version = await messenger.runtime.getManifest().version,
      subjectline = "[quickFilters] " + version + " - " + result;
    messenger.compose.beginNew({ subject: subjectline, to: mailto });
  },
  dispatchAboutConfig: async (filter, readOnly, updateUI = false) => {
    // we put the notification listener into quickfolders-tablistener.js - should only happen in ONE main window!
    messenger.runtime.sendMessage({
      command: "showAboutConfig",
      filter: filter,
      readOnly: readOnly,
      updateUI: updateUI,
    });
  },

  addConfigEvent: async (el, filterConfig) => {
    if (!el) {
      return;
    }
    el.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await quickFilters.Options.dispatchAboutConfig(filterConfig, true, true);
    });
  },
  load: async () => {
    let terms = document.getElementById("quickFoldersNavLicensing"),
      termsTxt = messenger.i18n
        .getMessage("quickfilters.notification.QF.navigationbar", ["quickFilters"])
        .split("\n");
    terms.firstChild.textContent = termsTxt[0];
    let termsList = document.getElementById("licenseOptions");
    // replace all leading whitespaces and "-"
    termsList.appendChild(document.createElement("li")).textContent = termsTxt[1].replace(
      /\s*-\s*/,
      ""
    );
    termsList.appendChild(document.createElement("li")).textContent = termsTxt[2].replace(
      /\s*-\s*/,
      ""
    );
  },
  pasteLicense: async () => {
    alert("pasteLicense - not yet implemented");
  },
  validateNewKey: async () => {
    alert("validateNewKey - not yet implemented");
  },
};