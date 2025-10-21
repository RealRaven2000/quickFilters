/* globals 
  WL
*/

async function setAssistantButton(e) {
  window.quickFilters.Util.setAssistantButton(e.detail.active);
}
// eslint-disable-next-line no-unused-vars
async function addTagListener(win, e) {
  window.quickFilters.Util.addTagListener(win);
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


// eslint-disable-next-line no-unused-vars
async function onLoad(_activatedWhileWindowOpen) {
  WL.injectCSS("chrome://quickfilters/content/skin/quickFilters.css?v=2");
  WL.injectCSS("chrome://quickfilters/content/skin/quickFilters-toolbar.css?v=6.9");

  window.setTimeout((win = window) => {
    console.log("qFi-3pane.js - onLoad()");
    win.quickFilters = win.parent.quickFilters;

    // QUICKFOLDERS NAVIGATION BAR INJECTION
    WL.injectElements(`
      <div id="threadPane">
      <hbox id="quickFilters-injected" collapsed="true"></hbox>
      </div>`);
    const container = win.document.getElementById("quickFilters-injected");
    const localize = win.quickFilters.Util.getBundleString;

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

  });


  window.addEventListener("quickFilters.BackgroundUpdate.setAssistantButton", setAssistantButton);
}

// eslint-disable-next-line no-unused-vars
function onUnload(isAddOnShutown) {
  let document3pane = window.document;
  window.quickFilters.restoreTagListener(window);

  function deleteBtn(id) {
    let btn = document3pane.getElementById(id);
    if (btn) {
      btn.parentNode.removeChild(btn);
    }
  }

  // clean up current folder bar (if QuickFolders is installed)
  deleteBtn("quickfilters-current-listbutton");
  deleteBtn("quickfilters-current-runbutton");
  deleteBtn("quickfilters-current-msg-runbutton");
  deleteBtn("quickfilters-current-searchfilterbutton");
  window.removeEventListener(
    "quickFilters.BackgroundUpdate.setAssistantButton",
    setAssistantButton
  );
}

// store a global reference for manual calling:
window.quickFilters_injectButton = injectButton;
