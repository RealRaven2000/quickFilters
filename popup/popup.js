/* BEGIN LICENSE BLOCK

QuickFolders is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK */

/* shared module for installation popups */
const SALE_END_DATE = "2025-11-11"; // starts 2025-10-23


// eslint-disable-next-line no-unused-vars
const insertHtmlSafely = (container, html, clearFirst = false) => {
  if (!container || !html) { 
    return; 
  }
  // Function to recursively sanitize nodes
  // see also DOMpurify
  const sanitizeNode = (node) => {
    if (node.nodeType !== 1) { return node; } // Only ELEMENT_NODE

    // Remove <script> tags
    if (node.tagName.toLowerCase() === "script")  {return null;}

    // Define dangerous inline event attributes
    const dangerousAttrs = [
      "onclick", "onchange", "oninput", "onmouseover",
      "onload", "onerror", "onfocus", "onblur", "onmousedown",
      "onmouseup", "onmouseenter", "onmouseleave"
    ];

    [...node.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();

      // Remove if attribute is dangerous or contains javascript:
      if (dangerousAttrs.includes(name) || value.startsWith("javascript:")) {
        node.removeAttribute(attr.name);
      }
    });

    // Recursively sanitize child nodes
    Array.from(node.childNodes).forEach(child => {
      const sanitized = sanitizeNode(child);
      if (!sanitized) { child.remove(); }
    });

    return node;
  };  

  // Create a detached document fragment
  const ownerDoc = container.ownerDocument;
  const frag = ownerDoc.createDocumentFragment();
  if (clearFirst) {
    container.textContent = "";
  }

  if (typeof html == "object" && html.nodeType) {
    // html is a Node → move its child nodes
    while (html.firstChild) {
      frag.appendChild(html.firstChild);
    }
    container.appendChild(frag); 
    return true;
  }
  if (typeof html != "string") {
    return false;
  }
  // do what DOMpurify does - remove inline event handlers ("onclick" etc and script tags)

  // Parse the HTML string into a temporary document
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Sanitize all children of body and move to fragment
  for (const node of Array.from(doc.body.childNodes)) {
    const sanitized = sanitizeNode(node);
    if (!sanitized) { continue; }
    frag.appendChild(sanitized);
  }

  // Append fragment to the container
  container.appendChild(frag);

  // Move <head> child nodes into the container's document <head>
  if (doc.head && container.ownerDocument.head) {
    for (const node of Array.from(doc.head.childNodes)) {
      const sanitized = sanitizeNode(node);
      if (!sanitized) { continue; }
      container.ownerDocument.head.appendChild(sanitized);
    }
  }
  return true;
};

// eslint-disable-next-line no-unused-vars
function getSaleEndLabel() {
  // format date based on user’s locale
  const now = new Date();
  const endSale = new Date(SALE_END_DATE);
  const includeYear = endSale.getFullYear() !== now.getFullYear();
  const dateOptions = includeYear
    ? { month: "long", day: "numeric", year: "numeric" }
    : { month: "long", day: "numeric" };
  return endSale.toLocaleDateString(messenger.i18n.getUILanguage(), dateOptions);
}

// eslint-disable-next-line no-unused-vars
async function updateActions(addonName) {
  let licenseInfo = await messenger.runtime.sendMessage({command:"getLicenseInfo"});
  
  // LICENSING FLOW
  const isExpired = licenseInfo.isExpired,
    isValid = licenseInfo.isValid; 

  function hide(id) {
    let el = document.getElementById(id);
    if (!el) { return null; }
    el.setAttribute('collapsed',true);
    return el;
  }
  function hideSelectorItems(cId) {
    let elements = document.querySelectorAll(cId);
		for (let el of elements) {
      el.setAttribute('collapsed',true);
		}	    
  }
  function show(id) {
    let el = document.getElementById(id);
    if (!el) { return null; }
    el.setAttribute('collapsed',false);
    return el;
  }
  // renew-your-license - already collapsed
  // renewLicenseListItem - already collapsed
  // purchaseLicenseListItem - not collapsed
  hide('licenseExtended');
  
  let isActionList = true;

  let currentTime = new Date(),
      endSale = new Date(SALE_END_DATE); // Next Sale End Date
  let isSale = (currentTime < endSale);
  hideSelectorItems('.donations');

  if (isValid || isExpired) {
    hide('purchaseLicenseListItem');
    hide('register');
    if (isExpired) { // License Renewal
      hide('extendLicenseListItem');
      hide('extend');
      show('renewLicenseListItem');
      show('renew');
    } else { // License Extension
      hide('renewLicenseListItem');
      hide('renew');
			let gpdays = licenseInfo.licensedDaysLeft;
      if (gpdays<25) { // they may have seen this popup. Only show extend License section if it is < 25 days away
        show('extendLicenseListItem');
        show('extend');
      } else {
        show('licenseExtended');
        hide('time-and-effort');
        hide('purchaseHeader');
        hide('whyPurchase');
        hide('extendLicenseListItem');
        hide('extend');
        isActionList = false;
      }
    }
  } else { /* no license at all */ }
  
  if (isSale) {
    if (!isValid) { 
      if (isExpired) { 
        show('specialOfferRenew');
      } else {
        show('specialOffer');
      }
      hideSelectorItems('.donations');
      hide('whyPurchase');
      isActionList = false;
    } else if (licenseInfo.licensedDaysLeft<=10) {
      show('specialOfferRenew');
      hide('purchaseSection');
    }
  }  
  if (!isActionList) {
    hide('actionBox');
  }
  
  // resize to contents if necessary...
  const win = await browser.windows.getCurrent(),
    wrapper = document.getElementById('innerwrapper'),
    r = wrapper.getBoundingClientRect(),
    maxHeight = window.screen.height;

  let newHeight = Math.round(r.height) + 80;

  /* retrieve specific OS for LInuz styling */
  let { os } = await messenger.runtime.getPlatformInfo(); // mac / win / linux
  wrapper.setAttribute("os", os);

     
  if (newHeight>maxHeight) {newHeight = maxHeight-15;}
  browser.windows.update(win.id, 
    {height: newHeight}
  );
}

// eslint-disable-next-line no-unused-vars
function formatAll(txt) {
  if (!txt) {
    return "";
  }
  let localizedMsg = txt
    .replace(/\{L(?:\s+([^}]+))?\}/g, (_, attrs) => {
      // attrs will be undefined if no class specified
      return attrs ? `<li ${attrs}>` : "<li>";
    })
    .replace(/\{\/L\}/g, "</li>")
    .replace(/\{br\}/g, "<br>")
    .replace(/\{bold\}/g, "<b>")
    .replace(/\{\/bold\}/g, "</b>")
    .replace(/\{italic\}/g, "<i>")
    .replace(/\{\/italic\}/g, "</i>")
    .replace(/\{U\}/g, "<ul>")
    .replace(/\{\/U\}/g, "</ul>")
    .replace(/\{emph\}/g, "<span class='important'>")
    .replace(/\{\/emph\}/g, "</span>")
    .replace(/\{addonName\}/g, "quickFilters")
    .replace(/\[issue (\d+)\]/g, "<a class=issue no=$1>[issue $1]</a>")
    .replace(/\{P(?:\s+([^}]+))?\}/g, (_, attrs) => {
      // attrs will be undefined if no class specified
      return attrs ? `<p ${attrs}>` : "<p>";
    })
    .replace(/\{\/P\}/g, "</p>")
    .replace(
      /\{createFilterFromMessage\}/g,
      messenger.i18n.getMessage("quickfilters.FromMessage.label")
    )
    .replace(/\{autoMerge\}/g,
      messenger.i18n.getMessage("chkMergeAuto.label"));

  return localizedMsg;
}

