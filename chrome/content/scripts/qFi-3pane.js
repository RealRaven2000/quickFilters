/* globals  
*/

const qFInjector = {
  injectCSS(win, url) {
    const WL = win.WL;

    if (WL?.injectCSS) {
      return WL.injectCSS(url);
    }

    const doc = win.document;

    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = url;

    doc.head.appendChild(link);
    return link;
  },

  injectElements(xulString) {
    function localize(entity) {
      let msg = entity.slice("__MSG_".length, -2);
      return extension.localeData.localizeMessage(msg);
    }
    const WL = window.WL;
    const debug = false;
    var { ExtensionParent } = ChromeUtils.importESModule(
      "resource://gre/modules/ExtensionParent.sys.mjs"
    );
    const extension = ExtensionParent.GlobalManager.getExtension("quickFilters@axelg.com");

    // Primary: real WL path
    if (WL?.injectElements) {
      return WL.injectElements(xulString, [], debug);
    }

    // Fallback: minimal safe DOM injection
    const doc = window.document;
    try {
      let localizedXulString = xulString.replace(/__MSG_(.*?)__/g, localize);
      const frag = window.MozXULElement.parseXULToFragment(localizedXulString);

      const node = frag.firstElementChild;
      if (!node) {
        console.warn("injectElements: empty XUL fragment");
        return null;
      }

      doc.documentElement.appendChild(node);
      return node;
    } catch (e) {
      console.error("injectElements: XUL parse failed", e);
      return null;
    }
  },

  async waitForElement(doc, selector, timeout = 10000, log = console.log) {
    const existing = doc.querySelector(selector);
    if (existing) {
      return existing;
    }
    let time = new Date().getTime();
    log(`waitForElement: waiting for ${selector}...`);

    return new Promise((resolve, reject) => {
      let timer;

      const observer = new doc.defaultView.MutationObserver(() => {
        const element = doc.querySelector(selector);
        if (element) {
          log(`waitForElement: found ${selector} after ${new Date().getTime() - time}ms`);
          observer.disconnect();
          clearTimeout(timer);
          resolve(element);
        }
      });

      observer.observe(doc.documentElement, {
        childList: true,
        subtree: true,
      });

      if (timeout) {
        timer = setTimeout(() => {
          observer.disconnect();
          log(`waitForElement: timeout waiting for ${selector} after ${new Date().getTime() - time}ms`);
          reject(new Error(`Timeout waiting for ${selector}`));
        }, timeout);
      }
    });
  },
};

async function setAssistantButton(e) {
  window.quickFilters.Util.setAssistantButton(e.detail.active);
}
// eslint-disable-next-line no-unused-vars
async function addTagListener(win, e) {
  window.quickFilters.Util.addTagListener(win);
}

async function updateCurrentFolderBar() {
  function logDebug(...args) {
    if (window?.quickFilters?.Util) {
      window.quickFilters.Util.logDebug(...args);
    }
  }
  logDebug("updateCurrentFolderBar() called");
  const container =
    window.document.getElementById("quickFilters-injected");
  logDebug("updateCurrentFolderBar() - container:", container);
  if (!container) {
    injectQuickFoldersNavigationBarElements(window);
  }
}



/**
 * Injects a XUL toolbarbutton into a specified parent element, or relocates it
 * if it already exists elsewhere. Automatically binds the `window.quickFilters.doCommand(this)` handler.
 *
 * @param {Element} parentElement - The container element to insert the button into.
 * @param {string} id - The unique ID for the toolbarbutton element.
 * @param {Object} [options] - Optional configuration object.
 * @param {string} [options.insertAfter] - ID of a sibling element to insert this button after.
 * @param {string} [options.insertBefore] - ID of a sibling element to insert this button before.
 * @param {string} [options.tooltip] - Tooltip text for the button (use l10n string if needed).
 * @returns {Element} The injected or relocated toolbarbutton element.
 *
 * Notes:
 * - If an element with the same ID already exists, it will be moved to the parentElement.
 * - If both insertAfter and insertBefore are provided, insertAfter takes precedence.
 * - Event handler is attached via addEventListener to avoid inline script magic.
 */
function injectButton(parentElement, id, options = {}) {
  const { insertAfter, insertBefore, tooltip } = options;
  let doc = parentElement.ownerDocument;

  // Check if element already exists
  let existingElem = doc.getElementById(id);
  if (existingElem) {
    // Move to parentElement if it's not already there
    if (existingElem.parentNode !== parentElement) {
      if (insertAfter) {
        let refNode = doc.getElementById(insertAfter);
        if (refNode && refNode.parentNode === parentElement) {
          parentElement.insertBefore(existingElem, refNode.nextSibling);
        } else {
          parentElement.appendChild(existingElem);
        }
      } else if (insertBefore) {
        let refNode = doc.getElementById(insertBefore);
        if (refNode && refNode.parentNode === parentElement) {
          parentElement.insertBefore(existingElem, refNode);
        } else {
          parentElement.appendChild(existingElem);
        }
      } else {
        parentElement.appendChild(existingElem);
      }
    }
    return existingElem;
  }

  // Create new element
  let btn = doc.createXULElement("toolbarbutton");
  btn.id = id;
  btn.className = "icon";

  if (tooltip) {
    btn.setAttribute("tooltiptext", tooltip);
  }

  // Set event handler without inline magic
  btn.addEventListener("command", function () {
    window.quickFilters.doCommand(this);
  });

  // Insert in the right position
  if (insertAfter) {
    let refNode = doc.getElementById(insertAfter);
    if (refNode && refNode.parentNode === parentElement) {
      parentElement.insertBefore(btn, refNode.nextSibling);
    } else {
      parentElement.appendChild(btn);
    }
  } else if (insertBefore) {
    let refNode = doc.getElementById(insertBefore);
    if (refNode && refNode.parentNode === parentElement) {
      parentElement.insertBefore(btn, refNode);
    } else {
      parentElement.appendChild(btn);
    }
  } else {
    parentElement.appendChild(btn);
  }

  return btn;
}

async function injectQuickFoldersNavigationBarElements(win) {
  // QUICKFOLDERS NAVIGATION BAR INJECTION: Remove the previous container!
  const previousContainer = win.document.getElementById("quickFilters-injected");
  const prefs = win?.quickFilters?.Preferences;
  if (!prefs) {
    console.error("injectQuickFoldersNavigationBarElements() - Preferences not available!");
    return;
  }
  await prefs.ensureReady();
  const isDebug = prefs.isDebugOption("3pane") || false;
  if (previousContainer) {
    if (win?.quickFilters?.Util) {
      win.quickFilters.Util.logDebug("injectQuickFoldersNavigationBarElements() - removing previous container");
    }
    previousContainer.remove();
  }
  const log3pane = (...args) => {
    if (!isDebug) { 
      return;
    }
    win.quickFilters.Util.logHighlightDebug("[quickFilters 3pane]", "white", "green", ...args);
  }

  log3pane("injectQuickFoldersNavigationBarElements() - waiting for threadPane");
  try {
    await qFInjector.waitForElement(win.document, "#threadPane", 10000, log3pane);
  } catch (e) {
    win.quickFilters.Util.logException(e, "quickFilters injection failed");
  }

  log3pane("inject Elements container...");

  qFInjector.injectElements(`
      <div id="threadPane">
      <hbox id="quickFilters-injected" collapsed="true"></hbox>
      </div>`);
  const container = win.document.getElementById("quickFilters-injected");
  const localize = win.quickFilters.Util.getBundleString;

  log3pane("inject buttons...");
  injectButton(container, "quickfilters-current-runbutton", {
    insertAfter: "QuickFolders-currentFolderFilterActive",
    tooltip: localize("quickfilters.RunButton.tooltip"),
  });
  injectButton(container, "quickfilters-current-msg-runbutton", {
    insertAfter: "quickfilters-current-runbutton",
    tooltip: localize("quickfilters.RunButtonMsg.tooltip"),
  });
  injectButton(container, "quickfilters-current-listbutton", {
    insertAfter: "quickfilters-current-msg-runbutton",
    tooltip: localize("quickfilters.ListButton.tooltip"),
  });
  injectButton(container, "quickfilters-current-searchfilterbutton", {
    insertAfter: "quickfilters-current-listbutton",
    tooltip: localize("quickfilters.findFiltersForFolder.menu"),
  });
}

// eslint-disable-next-line no-unused-vars
async function onLoad(_activatedWhileWindowOpen) {
  // see https://github.com/thunderbird/webext-examples/blob/master/manifest_v2/experiment.activityManager/api/ActivityManager/implementation.js
  if (typeof window.hasDOMContentLoaded==="object") {
    await window.hasDOMContentLoaded;
  } 
  qFInjector.injectCSS(window, "chrome://quickfilters/content/skin/quickFilters.css?v=2");
  qFInjector.injectCSS(window, "chrome://quickfilters/content/skin/quickFilters-toolbar.css?v=6.9");

  window.setTimeout((win = window) => {
    console.log("qFi-3pane.js - onLoad()");
    win.quickFilters = win.parent.quickFilters;

    injectQuickFoldersNavigationBarElements(win);
  });

  window.addEventListener("quickFilters.BackgroundUpdate.setAssistantButton", setAssistantButton);
  // window.quickFilters.toggleCurrentFolderButtons is running in experimental context
  window.addEventListener(
    "quickFilters.BackgroundUpdate.updateCurrentFolderBar",
    updateCurrentFolderBar
  );
}

// eslint-disable-next-line no-unused-vars
function onUnload(isAddOnShutown) {
  // listeners
  window.quickFilters.restoreTagListener(window);
  window.removeEventListener(
    "quickFilters.BackgroundUpdate.setAssistantButton",
    setAssistantButton
  );

  const document3pane = window?.document;
  if (!document3pane) {
    console.log(`quickFilters qFi-3pane.js - onUnload(${isAddOnShutown}): no document`);
    return;
  }

  // UI
  function deleteElement(id) {
    let btn = document3pane.getElementById(id);
    if (btn) {
      btn.remove();
    }
  }

  // clean up current folder bar (if QuickFolders is installed)
  deleteElement("quickfilters-current-listbutton");
  deleteElement("quickfilters-current-runbutton");
  deleteElement("quickfilters-current-msg-runbutton");
  deleteElement("quickfilters-current-searchfilterbutton");
  // remove container!
  deleteElement("quickFilters-injected");

}

// store a global reference for manual calling:
window.quickFilters_injectButton = injectButton;
