"use strict";
/* BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK */

/*
  globals
    licenseInfo: writable,
    validateLicenseInOptions
  */

quickFilters.Options = {
  get currentOptionsTab() {
    const activeTab = document.querySelector("nav button.active");
    if (activeTab) {
      return activeTab.value;
    }
    return "";
  },

  sendMail: async function (mailto = quickFilters.Util.ADDON_SUPPORT_MAIL) {
    let text = messenger.i18n.getMessage("quickfilters.prompt.contact.subject"),
      result = window.prompt(text, "");
    if (!result) {
      return;
    }

    let version = await messenger.runtime.getManifest().version,
      subjectline = "[quickFilters] " + version + " - " + result;
    messenger.compose.beginNew({ subject: subjectline, to: mailto });
  },

  dispatchAboutConfig: async (filter, readOnly, _updateUI = false) => {
    // we put the notification listener into quickfolders-tablistener.js - should only happen in ONE main window!
    messenger.Utilities.showAboutConfig(filter);
    /*
    messenger.runtime.sendMessage({
      command: "showAboutConfig",
      filter: filter,
      readOnly: readOnly,
      updateUI: updateUI,
    });
    */
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
      "",
    );
    termsList.appendChild(document.createElement("li")).textContent = termsTxt[2].replace(
      /\s*-\s*/,
      "",
    );
    // [issue 329]
    document
      .getElementById("licenseDate")
      .addEventListener("click", quickFilters.Options.showExtensionButton);
  },

  initLicenseBackupUI: async function () {
    const getElement = document.getElementById.bind(document),
      validationKeyBackedUp = getElement("validationKeyBackedUp"),
      btnRecover = getElement("btnRecoverLicense"),
      txtLicense = getElement("txtLicenseKey");

    btnRecover.hidden = true;
    validationKeyBackedUp.setAttribute("collapsed", true);

    const lastKey = await browser.LegacyPrefs.getPref("extensions.quickfolders.LicenseKey.backup");
    if (lastKey?.length > 3 && !txtLicense.value) {
      validationKeyBackedUp.removeAttribute("collapsed");
      btnRecover.hidden = false;
    }
  },

  showExtensionButton: function () {
    if (licenseInfo?.status !== "Valid") {
      return;
    }
    quickFilters.Options.labelLicenseBtn(document.getElementById("btnLicense"), "extend");
  },

  enableProFeatures: function (isEnabled) {
    // this replaces the icon with the [Pro] logo!
    for (let el of document.querySelectorAll(
      ".proFeature, .proFeature input, .proFeature button",
    )) {
      if (isEnabled) {
        el.removeAttribute("disabled");
      } else {
        el.setAttribute("disabled", true);
      }
    }
    // update the logo in the header
    let header = document.getElementById("qf-options-header");
    if (header) {
      if (isEnabled) {
        header.classList.add("pro");
      } else {
        header.classList.remove("pro");
      }
    }
  },

  updateLicenseOptionsUI: async function (silent = false) {
    const getElement = document.getElementById.bind(document),
      validationPassed = getElement("validationPassed"),
      validationFailed = getElement("validationFailed"),
      validationInvalidAddon = getElement("validationInvalidAddon"),
      validationExpired = getElement("validationExpired"),
      validationInvalidEmail = getElement("validationInvalidEmail"),
      validationEmailNoMatch = getElement("validationEmailNoMatch"),
      validationDate = getElement("validationDate"),
      validationDateSpace = getElement("validationDateSpace"),
      validationKeyBackedUp = getElement("validationKeyBackedUp"),
      btnSwitchToFree = getElement("btnSwitchToFree"),
      btnRecover = getElement("btnRecoverLicense"),
      licenseDate = getElement("licenseDate"),
      licenseDateLabel = getElement("licenseDateLabel"),
      decryptedMail = licenseInfo.email,
      decryptedDate = licenseInfo.expiryDate,
      result = licenseInfo.status;

    validationPassed.setAttribute("collapsed", true);
    validationFailed.setAttribute("collapsed", true);
    validationExpired.setAttribute("collapsed", true);
    validationInvalidAddon.setAttribute("collapsed", true);
    validationInvalidEmail.setAttribute("collapsed", true);
    validationEmailNoMatch.setAttribute("collapsed", true);
    validationKeyBackedUp.setAttribute("collapsed", true);
    validationDate.setAttribute("collapsed", false);
    validationDateSpace.setAttribute("collapsed", false);
    btnRecover.hidden = true;
    btnSwitchToFree.hidden = true;

    quickFilters.Options.enableProFeatures(false);
    try {
      let niceDate = decryptedDate;
      if (decryptedDate) {
        try {
          let d = new Date(decryptedDate);
          niceDate = d.toLocaleDateString();
        } catch {
          niceDate = decryptedDate;
        }
      }
      licenseDate.value = niceDate; // invalid ??
      licenseDate.classList.remove("valid");
      switch (result) {
        case "Valid":
          quickFilters.Options.enableProFeatures(true);
          quickFilters.Options.showValidationMessage(validationPassed, silent);
          // getElement("dialogProductTitle").value = "quickFilters Pro";
          licenseDate.classList.add("valid");
          licenseDate.value = niceDate;
          licenseDateLabel.textContent = messenger.i18n.getMessage("qf.label.licenseValid");
          break;
        case "Invalid":
          {
            validationDate.setAttribute("collapsed", true);
            validationDateSpace.setAttribute("collapsed", true);
            let addonName = "";
            switch (licenseInfo.licenseKey.substr(0, 2)) {
              case "QF":
              case "QS":
                addonName = "QuickFolders";
                break;
              case "S1":
              case "ST":
                addonName = "SmartTemplates";
                break;
              case "QI":
              default:
                quickFilters.Options.showValidationMessage(validationFailed, silent);
            }
            if (addonName) {
              let txt = validationInvalidAddon.textContent;
              txt = txt.replace("{0}", "quickFilters").replace("{1}", "QI"); // keys for {0} start with {1}
              if (txt.indexOf(addonName) < 0) {
                txt +=
                  " " +
                  messenger.i18n
                    .getMessage("quickfilters.licenseValidation.guessAddon")
                    .replace("{2}", addonName);
              }
              validationInvalidAddon.textContent = txt;
              quickFilters.Options.showValidationMessage(validationInvalidAddon, silent);
            }
          }
          break;
        case "Expired": {
          let expiredMsg = messenger.i18n.getMessage("qf.licenseValidation.expired");
          licenseDate.classList.add("valid");
          licenseDateLabel.value = messenger.i18n.getMessage(
            "qf.licenseValidation.expired",
          );
          licenseDate.value = niceDate;

          const expiryDate = new Date(licenseInfo.expiryDate);
          // add 28 days
          const graceThreshold = new Date(expiryDate.getTime() + 28 * 24 * 60 * 60 * 1000);
          // Show Switch to Free button only if 28+ days after expiry
          if (Date.now() >= graceThreshold.getTime()) {
            const freeHint = messenger.i18n.getMessage("qf.licenseValidation.expired.freeHint");
            expiredMsg += "\n" + freeHint;
            btnSwitchToFree.hidden = false;
          }
          validationExpired.textContent = expiredMsg;
          quickFilters.Options.showValidationMessage(validationExpired, false); // always show
        } break;
        case "MailNotConfigured":
          validationDate.setAttribute("collapsed", true);
          validationDateSpace.setAttribute("collapsed", true);
          validationInvalidEmail.setAttribute("collapsed", false);
          // if mail was already replaced the string will contain [mail address] in square brackets
          validationInvalidEmail.textContent = validationInvalidEmail.textContent
            .replace(/\[.*\]/, "{1}")
            .replace("{1}", "[" + decryptedMail + "]");
          break;
        case "MailDifferent":
          validationDate.setAttribute("collapsed", true);
          validationDateSpace.setAttribute("collapsed", true);
          quickFilters.Options.showValidationMessage(validationFailed, true);
          quickFilters.Options.showValidationMessage(validationEmailNoMatch, silent);
          break;
        case "Empty":
          validationDate.setAttribute("collapsed", true);
          validationDateSpace.setAttribute("collapsed", true);
          break;
        default:
          Services.prompt.alert(null, "quickFilters", "Unknown license status: " + result);
          break;
      }
      if (result == "Empty") {
        quickFilters.Options.initLicenseBackupUI();
      }

    } catch (ex) {
      quickFilters.Util.logException(
        "Error in quickFilters.Options.updateLicenseOptionsUI():\n",
        ex,
      );
    }
    return result;
  },

  // make a validation message visible but also repeat a notification for screen readers.
  showValidationMessage: async function (el, silent = true) {
    if (el.getAttribute("collapsed") != false) {
      el.setAttribute("collapsed", false);
      if (!silent) {
        // TO DO: OS notification
        // QuickFolders.Util.slideAlert (util.ADDON_NAME, el.textContent);
        await messenger.runtime.sendMessage({
          command: "slideAlert",
          title: "quickFilters",
          text: el.textContent.trim(),
        });
      }
    }
  },

  // put appropriate label on the license button and pass back the label text as well
  labelLicenseBtn: function (btnLicense, validStatus) {
    switch (validStatus) {
      case "extend": {
        let txtExtend = messenger.i18n.getMessage(
          "quickfilters.notification.premium.btn.extendLicense",
        );
        btnLicense.setAttribute("collapsed", false);
        btnLicense.textContent = txtExtend; // text should be extend not renew
        btnLicense.setAttribute(
          "tooltiptext",
          messenger.i18n.getMessage("quickfilters.notification.premium.btn.extendLicense.tooltip"),
        );
        return txtExtend;
      }
      case "renew": {
        let txtRenew = messenger.i18n.getMessage(
          "quickfilters.notification.premium.btn.renewLicense",
        );
        btnLicense.textContent = txtRenew;
        return txtRenew;
      }
      case "buy": {
        let buyLabel = messenger.i18n.getMessage(
          "quickfilters.notification.premium.btn.getLicense",
        );
        btnLicense.textContent = buyLabel;
        return buyLabel;
      }
      case "upgrade": {
        let upgradeLabel = messenger.i18n.getMessage(
          "quickfilters.notification.premium.btn.upgrade",
        );
        btnLicense.textContent = upgradeLabel;
        btnLicense.classList.add("upgrade"); // stop flashing
        return upgradeLabel;
      }
    }
    return "";
  },

  updateAriaLicenseLabel: function (el) {
    if (!el) {
      return;
    }
    const fullKey = el.value.trim();
    if (!fullKey) {
      el.setAttribute("aria-label", "license field empty!");
      return;
    }
    const shortKey = fullKey.split(";")[0]; // Extract only the meaningful part
    el.setAttribute("aria-label", `License Key: ${shortKey}`);
  },

  trimLicense: function () {
    const licenseTxt = document.getElementById("txtLicenseKey"),
      strLicense = licenseTxt.value.toString();
    // Remove line breaks and extra spaces:
    let trimmedLicense = strLicense
      .replace(/\r?\n|\r/g, " ") // replace line breaks with spaces
      .replace(/\s\s+/g, " ") // collapse multiple spaces
      .replace("[at]", "@")
      .trim();
    licenseTxt.value = trimmedLicense;
    this.updateAriaLicenseLabel(licenseTxt);
    return trimmedLicense;
  },

  validateNewKey: async function () {
    let newKey = quickFilters.Options.trimLicense();
    // do a round trip through the background script.
    await messenger.runtime.sendMessage({
      command: "updateLicense",
      key: newKey,
    });
    licenseInfo = await messenger.runtime.sendMessage({ command: "getLicenseInfo" });
    // local license key for settings window
    if (licenseInfo.licenseKey) {
      await validateLicenseInOptions(true);
      quickFilters.Options.enableProFeatures(licenseInfo.isValid);
    } else {
      // add the [pro] icon to features that are restricted
      quickFilters.Options.enableProFeatures(false);
    }
  },

  pasteLicense: async function () {
    navigator.clipboard.readText().then((clipText) => {
      if (clipText) {
        let txtBox = document.getElementById("txtLicenseKey");
        txtBox.value = clipText;
        // eslint-disable-next-line no-unused-vars
        let finalLicense = quickFilters.Options.trimLicense();
        quickFilters.Options.validateNewKey();
      }
    });
  },

  selectMergeAuto: function (checkBox) {
    // MergeSkip must be unchecked!
    if (!checkBox.checked) {
      let chkSkip = document.getElementById("chkMergeSkip");
      chkSkip.checked = false;
      quickFilters.Preferences.setBoolPref("merge.silent", false);
    }
  },

  selectMergeSkip: function (checkBox) {
    // MergeAuto must be checked!
    if (checkBox.checked) {
      let chkMerge = document.getElementById("chkMergeAuto");
      chkMerge.checked = true;
      quickFilters.Preferences.setBoolPref("merge.autoSelect", true);
    }
  },
}; // quickFilters.Options
