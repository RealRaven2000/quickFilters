/*
 globals  
   formatAll,
   insertHtmlSafely,

*/


var licenseInfo;

async function configureBuyButton() {
  function replaceCssClass(el, addedClass) {
    if (!el) {
      return;
    }
    el.classList.add(addedClass);
    if (addedClass != "paid") {
      el.classList.remove("paid");
    }
    if (addedClass != "expired") {
      el.classList.remove("expired");
    }
    if (addedClass != "free") {
      el.classList.remove("free");
    }
  }

  let wd = window.document,
    getElement = wd.getElementById.bind(wd),
    btnLicense = getElement("btnLicense"),
    proTab = getElement("quickFilters-Pro");
  let result = licenseInfo.status;

  switch (result) {
    case "Valid": {
      let today = new Date(),
        later = new Date(today.setDate(today.getDate() + 30)), // pretend it's a month later:
        dateString = later.toISOString().substr(0, 10);
      // if we were a month ahead would this be expired?
      if (licenseInfo.expiryDate < dateString) {
        quickFilters.Options.labelLicenseBtn(btnLicense, "extend");
      } else {
        if (licenseInfo.keyType == 2) {
          // standard license
          btnLicense.classList.add("upgrade"); // removes "pulsing" animation
          btnLicense.setAttribute("collapsed", false);
          quickFilters.Options.labelLicenseBtn(btnLicense, "upgrade");
        } else {
          btnLicense.setAttribute("collapsed", true);
        }
      }
      replaceCssClass(proTab, "paid");
      replaceCssClass(btnLicense, "paid");
      break;
    }
    case "Expired":
      quickFilters.Options.labelLicenseBtn(btnLicense, "renew");
      replaceCssClass(proTab, "expired");
      replaceCssClass(btnLicense, "expired");
      btnLicense.setAttribute("collapsed", false);
      break;
    default:
      quickFilters.Options.labelLicenseBtn(btnLicense, "buy");
      btnLicense.setAttribute("collapsed", false);
      replaceCssClass(btnLicense, "register");
      replaceCssClass(proTab, "free");
  }
}

async function validateLicenseInOptions(evt = false) {
  let silent = typeof evt === "object" ? false : evt; // will be an event when called from background script!

  // old call to decryptLicense was here
  // 1 - sanitize License
  // 2 - validate license
  // 3 - update options ui with reaction messages; make expiry date visible or hide!;
  quickFilters.Options.updateLicenseOptionsUI(silent); // async!

  // 4 - update buy / extend button or hide it.
  configureBuyButton();
  // util.logDebug("validateLicense - result = " + result);
} 

async function initLicenseInfo() {
  licenseInfo = await messenger.runtime.sendMessage({ command: "getLicenseInfo" });
  const licenseTxt = document.getElementById("txtLicenseKey");
  licenseTxt.value = licenseInfo.licenseKey;
  quickFilters.Options.updateAriaLicenseLabel(licenseTxt);

  await validateLicenseInOptions(true);
  if (licenseInfo.licenseKey) {
    quickFilters.Options.enableProFeatures(licenseInfo.isValid);
  } else {
    // add the [pro] icon to features that are restricted
    quickFilters.Options.enableProFeatures(false);
  }

  messenger.runtime.onMessage.addListener((data, _sender) => {
    if (data.msg == "updatedLicense") {
      licenseInfo = data.licenseInfo;
      quickFilters.Options.updateLicenseOptionsUI(false); // we may have to switch off silent if we cause this
      configureBuyButton();
      return Promise.resolve(true); // returns a promise of "undefined"
    }
  });
}

const activateTab = (event) => {
  const tabSheets = document.querySelectorAll(".tabcontent-container section"),
    tabs = document.querySelectorAll(".tabbox button");
  let btn = event.target;
  Array.from(tabs).forEach((button) => {
    button.classList.remove("active");
    button.parentElement.removeAttribute("aria-selected");
  });
  Array.from(tabSheets).forEach((tabSheet) => {
    tabSheet.classList.remove("active");
  });

  btn.classList.add("active");
  btn.parentElement.setAttribute("aria-selected", true); // li
  // store last selected tab
  browser.LegacyPrefs.setPref("extensions.quickfilters.lastSelectedOptionsTab", btn.value);

  // update URL hash and remove any query string params
  try {
    const url = new URL(window.location.href);
    url.search = ""; // remove any ?mode=...
    url.hash = btn.value; // set hash to current tab
    history.replaceState(null, "", url.toString());
  } catch (e) {
    console.warn("Failed to update URL hash/query:", e);
  }

  // display the section
  const {
    target: { value: activeTabSheetId = "" },
  } = event;
  const activeTabSheet = document.getElementById(activeTabSheetId);
  if (activeTabSheet) {
    activeTabSheet.classList.add("active");
  } else {
    console.error("activateTab: Could not find tab section for id ", activeTabSheetId);
  }
};


const initEventListeners = async () => {
  for (let button of document.querySelectorAll(".tabbox button")) {
    button.addEventListener("click", activateTab);
  }

  for (let link of document.querySelectorAll(".plain-link")) {
    link.addEventListener("click", () => {
      const href = link.getAttribute("href");
      if (!href) {
        console.warn("No href found on link", link);
        return;
      }
      quickFilters.Util.openLinkInTab(href);
    });
  }


  for (let txtLink of document.querySelectorAll(".text-link")) {
    txtLink.addEventListener("click", () => {
      switch (txtLink.id) {
        case "L1": // about link
          quickFilters.Util.showHomePage();
          break;
        case "L2": // YouTube link
          quickFilters.Util.showYouTubePage();
          break;
        case "L3": // contact link
          quickFilters.Options.sendMail();
          break;
        case "L4": // splash
          quickFilters.Util.viewSplash();
          break;
        case "L5": // GitHub issues
          quickFilters.Util.showGithub();
          break;
        default:
          console.warn("Unkown link:", txtLink.id);
      }
    });
  }
  const chkToolbar = document.getElementById("chkToolbar");
  chkToolbar.addEventListener("change", () => {
    messenger.runtime.sendMessage({
      command: "setupListToolbar",
    });
  });  
  const copySentToCurrentLink  = document.getElementById("getCopySentToCurrent");
  copySentToCurrentLink.addEventListener("click", () => {
    quickFilters.Util.showCopySentToCurrent();
  });
  for (let btn of document.querySelectorAll(".configSettings")) {
    const filter = btn.getAttribute("filter") || "extensions.quickfilters.debug";
    //e.g. onclick="quickFilters.Util.showAboutConfig(this, 'quickfilters.assistant.exclude', true)"
    quickFilters.Options.addConfigEvent(btn, filter);
  }
  const newCustomFilter = document.getElementById("newCustomFilter");
  newCustomFilter.addEventListener("click", () => { 
    messenger.Utilities.createCustomTemplate();
  });
  const editCustomFilters = document.getElementById("editCustomFilters");
  editCustomFilters.addEventListener("click", () => {
    messenger.Utilities.editCustomTemplates();
  });
  const chkMergeAuto = document.getElementById("chkMergeAuto");
  chkMergeAuto.addEventListener("click", () => {
    quickFilters.Options.selectMergeAuto(chkMergeAuto);
  });
  const chkMergeSkip = document.getElementById("chkMergeSkip");
  chkMergeSkip.addEventListener("click", () => {
    quickFilters.Options.selectMergeSkip(chkMergeSkip);
  });
  const btnLicense = document.getElementById("btnLicense");
  btnLicense.addEventListener("click", () => {
    const referrer = "options_" + quickFilters.Options.currentOptionsTab;
    messenger.Utilities.showLicenseDialog(referrer);
    window.close();
  });


  const btnVersion = document.getElementById("qf-options-version");
  btnVersion.addEventListener("click", () => {
    // we can call experimental APIs directly!!
    messenger.Utilities.showVersionHistory();
  });
  const btnYoutube = document.getElementById("qf-youtube");
  btnYoutube.addEventListener("click", () => {
    quickFilters.Util.showYouTube();
  });
  const btnPaste = document.getElementById("btnPasteLicense");
  let info = await messenger.runtime.getBrowserInfo();
  if (parseInt(info.version.split(".")[0]) < 125) {
    btnPaste.hidden = true;
  } else {
    btnPaste.addEventListener("click", () => {
      quickFilters.Options.pasteLicense();
    });
  }
  const btnValidate = document.getElementById("btnValidateLicense");
  btnValidate.addEventListener("click", async () => {
    await quickFilters.Options.validateNewKey();
  });


  const btnSwitchToFree = document.querySelector("#btnSwitchToFree");
  btnSwitchToFree.addEventListener("click", async () => {
    const dialog = document.getElementById("confirmationDialog");
    const message = document.getElementById("confirmMessage");

    function awaitDialogClose(dialog) {
      return new Promise((resolve) => {
        dialog.addEventListener("close", () => resolve(dialog.returnValue), { once: true });
      });
    }

    // set your localized message
    const html = formatAll(messenger.i18n.getMessage("qf.licenseBackup.confirmation"));
    if (insertHtmlSafely(message, html, true)) {
      const featureLink = message.querySelector(".features");
      featureLink?.addEventListener("click", () => {
        messenger.windows.openDefaultBrowser(
          "https://quickfilters.quickfolders.org/premium.html#featureComparison",
        );
      });
    }

    // show modal and wait for user choice
    dialog.showModal();
    const choice = await awaitDialogClose(dialog);
    if (choice !== "ok") {
      return;
    }

    // 1. Hide the button
    btnSwitchToFree.hidden = true;

    // 2. Backup the expired license
    await messenger.LegacyPrefs.setPref(
      "extensions.quickfilters.LicenseKey.backup",
      licenseInfo.licenseKey,
    );

    document.getElementById("txtLicenseKey").value = "";

    // 3. Remove current license
    await quickFilters.Options.validateNewKey();

    // 4. Refresh any dependent UI (buttons / toolbar labels)
    configureBuyButton();

    // 5. Update UI - Shows message: "You can restore your previous license to get cheaper renewal conditions."
    quickFilters.Options.updateLicenseOptionsUI();
  });

  const btnRecover = document.getElementById("btnRecoverLicense");
  btnRecover.addEventListener("click", async () => {
    const lastKey = await browser.LegacyPrefs.getPref("extensions.quickfilters.LicenseKey.backup");
    document.getElementById("txtLicenseKey").value = lastKey;
    await quickFilters.Options.validateNewKey();
    quickFilters.Options.updateLicenseOptionsUI();
  });
}

const initPrefs = async () => {
  // checkboxes
  const checkboxes = document.querySelectorAll("input[type=checkbox][data-pref-name]");
  for (const el of checkboxes) {
    const prefName = el.getAttribute("data-pref-name");
    const value = await messenger.LegacyPrefs.getPref(prefName);
    el.checked = !!value;

    el.addEventListener("change", () => {
      messenger.LegacyPrefs.setPref(prefName, el.checked);
      if (el.classList.contains("currentFolderQF")) {
        // [issue 328] update current folder buttons if changed in options
        messenger.runtime.sendMessage({ command: "updateCurrentFolderButtons" });
      }
    });
  }
  // text / number inputs, any textareas outside of license key
  const inputs = document.querySelectorAll(
    "input[type=text][data-pref-name], input[type=number][data-pref-name], #txtSubjectBlacklist"
  );
  for (const el of inputs) {
    const prefName = el.getAttribute("data-pref-name");
    const value = await messenger.LegacyPrefs.getPref(prefName);
    el.value = value ?? "";

    el.addEventListener("input", () => {
      messenger.LegacyPrefs.setPref(prefName, el.type === "number" ? Number(el.value) : el.value);
    });
  }
}

/**** FLOATING TOOLTIPS ===> **** */
// eslint-disable-next-line no-unused-vars
function toggleTooltip(button) {
  const row = button.closest(".option-horizontal");
  if (!row) {
    return;
  }

  const tooltip = row.querySelector(".tooltip-bubble");
  if (!tooltip) {
    return;
  }

  // Hide all other tooltips first
  document.querySelectorAll(".tooltip-bubble").forEach((t) => {
    if (t !== tooltip) {
      t.hidden = true;
    }
  });
  document.querySelectorAll(".tooltipBtn").forEach((t) => {
    t.removeAttribute("tooltipshown");
  });

  // Toggle this one
  tooltip.hidden = !tooltip.hidden;
  if (tooltip.hidden) {
    button.removeAttribute("tooltipshown");
  } else {
    button.setAttribute("tooltipshown", true);
  }
}

const startup = async () => {
  i18n.updateDocument();
  await initEventListeners();
  await initPrefs();
  quickFilters.Options.load();
  await initLicenseInfo();
  await quickFilters.Options.initLicenseBackupUI();  

  const verPanel = document.getElementById("qf-options-version");
  const manifest = browser.runtime.getManifest();
  verPanel.textContent = manifest.version;
  handleNavigation();

};

const handleNavigation = async (notAclick = false) => {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.substring(1); // remove leading '#'
  const page = hash || null;
  const tabButtons = document.querySelectorAll(".tabbox li > button[isTab]");

  // clear the previous active tab in case user clicked on it last.
  if (notAclick && document.activeElement) {
    for (const btn of tabButtons) {
      if (btn === document.activeElement) {
        document.activeElement.blur();
        break;
      }
    }
  }

  if (page) {
    const button = document.querySelector(`.tabbox button[value="${page}"]`);
    if (button) {
      button.click(); // triggers activateTab()
    } else {
      console.warn(`No tab button found for page querystring parameter="${page}"`);
    }
  } else {
    // select last active tab
    const lastTab = await browser.LegacyPrefs.getPref(
      "extensions.quickfilters.lastSelectedOptionsTab"
    );
    const button = document.querySelector(`.tabbox button[value="${lastTab}"]`);
    if (button) {
      button.click();
    }
  }
  // collapse all other tab buttons if mode is set
  const mode = params.get("mode");
  // possible modes: supportOnly, licenseKey, newFilter
  for (let btn of tabButtons) {
    btn.parentNode.removeAttribute("collapsed");
  }
  if (mode) {
    // only show a single page:
    for (let btn of tabButtons) {
      switch (mode) {
        case "supportOnly":
          if (btn.value === "supportTab") {
            continue;
          }
          break;
        case "licenseKey":
          if (btn.value === "licenseTab") {
            continue;
          }
          break;
        case "newFilter":
          if (btn.value === "filterPropsTab") {
            continue;
          }
          break;
      }
      btn.parentNode.setAttribute("collapsed", "true");
    }
  }
};

startup();
// make sure to trugger startup again if a different page is requested
let lastURI = window.location.href;
browser.runtime.onMessage.addListener((data) => {
  if (data.msg === "refreshNavigation") {
    if (window.location.href !== lastURI) {
      lastURI = window.location.href;
      handleNavigation(true);
    }
  }
});