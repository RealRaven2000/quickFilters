/* globals  
     WL
*/

const qFInjector = {
  _WL: null,
  getWL: function (win = window) {
    if (this._WL) {
      return this._WL;
    }
    if (typeof WL !== "undefined") {
      this._WL = WL;
      return this._WL;
    }
    console.debug("qFInjector.getWL: no global WL - searching for AddOnNS* props in window...");
    for (const k of Object.getOwnPropertyNames(win).filter((k) => k.startsWith("AddOnNS"))) {
      try {
        const ns = win[k];
        if (ns?.WL?.extension?.addonData?.id === "quickFilters@axelg.com") {
          console.debug("qFInjector.WL: found WindowListener", ns?.WL?.extension?.addonData);
          this._WL = ns.WL;
          return this._WL;
        }
      } catch (e) {
        console.error("qFInjector.WL: failed to access", k, e);
        continue;
      }
    }
    return null;
  },

  injectCSS(win, url) {
    const WL = qFInjector.getWL(win);

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
    const WL = qFInjector.getWL(window);
    const prefs = window.parent?.quickFilters?.Preferences;
    const util = window.parent?.quickFilters?.Util;
    const debug = prefs?.isDebug;
    const debug3pane = prefs?.isDebugOption?.("3pane");

    const logDebug = (...args) => {
      if (!debug3pane) {
        return;
      }
      if (!debug) {
        return;
      }
      // added to the default white on green style
      const format = { fontWeight: "bold" };
      util.logHighlightDebug("[quickFilters 3pane]", format, ...args);
    };

    if (debug) {
      console.log("quickFilters injector path:", {
        hasWL: !!WL,
        globalThis: globalThis.WL,
        hasInject: !!WL?.injectElements,
        url: window.location.href,
      });
    }

    var { ExtensionParent } = ChromeUtils.importESModule(
      "resource://gre/modules/ExtensionParent.sys.mjs"
    );
    const extension = ExtensionParent.GlobalManager.getExtension("quickFilters@axelg.com");

    // Primary: real WL path
    if (WL?.injectElements) {
      if (debug) {
        console.log("Using WindowListener:injectElements");
      }
      if (debug || debug3pane) {
        logDebug("Injection path: WindowListener (WL)");
      }
      WL.injectElements(xulString, [], debug); // always returns undefined by design
      if (debug) {
        const panel = window.document.getElementById("QuickFolders-PreviewToolbarPanel");
        logDebug(
          `WL.injectElements done - panel in DOM: ${!!panel}, panel parent: ${panel?.parentElement?.id || "(none)"}`
        );
      }

      return true; // WL path does not return the injected element, so we return true to indicate success
    }

    // Fallback: minimal safe DOM injection
    logDebug("Injection path: QFInjector fallback (no WL)");

    const doc = window.document;
    try {
      let localizedXulString = xulString.replace(/__MSG_(.*?)__/g, localize);
      const frag = window.MozXULElement.parseXULToFragment(localizedXulString);
      const root = frag.firstElementChild;
      if (!root) {
        console.warn("injectElements: empty XUL fragment");
        return false;
      }
      logDebug(
        `qFInjector.injectElements (fallback): root id=${root.id}, children=${root.childElementCount}`
      );
      const after = root.getAttribute("insertafter");
      const before = root.getAttribute("insertbefore");
      const children = [...root.children]; // .filter((n) => n.nodeType !== 3); // avoid Node.TEXT_NODE
      if (debug) {
        for (const child of children) {
          console.log({
            type: child?.nodeType,
            name: child?.nodeName,
            isNode: child?.nodeType,
          });
        }
      }

      if (after || before) {
        const refId = after || before;
        const ref = doc.getElementById(refId);

        if (ref && ref.parentNode) {
          const frag = doc.createDocumentFragment();
          for (const c of children) {
            if (c.id) {
              // make sure to remove previously added because we make an update.
              const existing = doc.getElementById(c.id);
              if (existing) {
                existing.remove();
              }
            }

            frag.appendChild(c);
          }

          if (after) {
            ref.parentNode.insertBefore(frag, ref.nextSibling);
          } else {
            ref.parentNode.insertBefore(frag, ref);
          }

          return true;
        }
      }

      // find the target element to inject into (if specified by id), otherwise inject into document root
      const target = root.id && doc.getElementById(root.id);
      logDebug(
        `qFInjector.injectElements: target lookup id="${root.id}" → ${target ? `FOUND (${target.tagName}, childCount=${target.childElementCount})` : "NOT FOUND → will create new element"}`
      );

      // CASE 2: insert at the end of the document
      if (!target) {
        logDebug(
          `qFInjector.injectElements: CASE 2 - appending new <${root.tagName} id="${root.id}"> to documentElement`
        );
        doc.documentElement.appendChild(root);
        return true;
      }
      // CASE 1: WL-style injection (existing node → recurse only)
      logDebug(
        `qFInjector.injectElements: CASE 1 - merging ${children.length} child(ren) into existing #${target.id}`
      );

      [...children].forEach((c) => {
        const id = c.id;
        if (id) {
          // make sure to remove previously added because we make an update.
          const existing = doc.getElementById(id);
          if (existing) {
            logDebug(`qFInjector.injectElements: replacing existing #${id} inside #${target.id}`);
            existing.replaceWith(c);
            return; // skips append for this iteration
          }
        }

        logDebug(
          `qFInjector.injectElements: appending <${c.tagName} id="${c.id || "(no id)"}"> to #${target.id}`
        );
        target.append(c);
      });

      return true;
    } catch (e) {
      console.error("injectElements: XUL parse failed", e);
      return false;
    }
  },

  async waitForElement(doc, selector, timeout = 10000, log = console.log) {
    const existing = doc.querySelector(selector);
    if (existing) {
      log(`waitForElement: found ${selector} immediately`);
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
          log(
            `waitForElement: timeout waiting for ${selector} after ${new Date().getTime() - time}ms`
          );
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

async function updateCurrentFolderBar(e) {
  const tabId = e?.detail?.tabId ?? null;
  function logDebug(...args) {
    if (window?.quickFilters?.Util) {
      window.quickFilters.Util.logDebug(...args);
    }
  }
  // if a specific tabId was given, check it belongs to this 3pane instance
  if (tabId !== null) {
    const tabmail = window.parent?.document?.getElementById("tabmail");
    const myTab = tabmail?.tabInfo?.find((t) => t.chromeBrowser?.contentWindow === window);
    const myTabId = myTab?.tabId ?? null;
    if (myTabId !== null && myTabId !== tabId) {
      logDebug(`3pane: updateCurrentFolderBar() - skipping, tabId ${tabId} !== my TabId ${myTabId}`);
      return;
    }
  }

  const container = window.document.getElementById("quickFilters-injected");
  logDebug(`updateCurrentFolderBar(tabId: ${tabId}) - container:`, container);
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
    const util = win?.quickFilters?.Util;
    util.logHighlightDebug("[quickFilters 3pane]", util.debugStyle, ...args);
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
