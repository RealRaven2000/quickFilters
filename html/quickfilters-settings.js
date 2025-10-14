
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


  const btnVersion = document.getElementById("qf-options-version");
  btnVersion.addEventListener("click", () => {
    // quickFilters.Util.showVersionHistory(); setTimeout(() => window.close(), 100);
    browser.runtime.openOptionsPage();
    // window.close();
  });
  const btnYoutube = document.getElementById("qf-youtube");
  btnYoutube.addEventListener("click", () => {
    quickFilters.Util.showYouTube();
  });
  const btnCopy = document.getElementById("btnPasteLicense");
  btnCopy.addEventListener("click", () => {
    quickFilters.Options.pasteLicense();
  });
  const btnValidate = document.getElementById("btnValidateLicense");
  btnValidate.addEventListener("click", () => {
    quickFilters.Options.validateNewKey();
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
    });
  }
  // text / number inputs
  const inputs = document.querySelectorAll(
    "input[type=text][data-pref-name], input[type=number][data-pref-name]"
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

  const verPanel = document.getElementById("qf-options-version");
  const manifest = browser.runtime.getManifest();
  verPanel.textContent = manifest.version;
};
startup();
