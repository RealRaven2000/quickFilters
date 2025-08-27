/* BEGIN LICENSE BLOCK

QuickFolders is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK */

/* shared module for installation popups */
const SALE_DATE = "2025-03-24"; // starts 2025-03-10

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
      endSale = new Date(SALE_DATE); // Next Sale End Date
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
  if (!txt) {return "";}
  let localizedMsg = txt
    .replace(/\{L1(?:\s+([^}]+))?\}/g, (_, attrs) => {
      // attrs will be undefined if no class specified
      return attrs ? `<li ${attrs}>` : "<li>";
    })
    .replace(/\{L2\}/g, "</li>")
    .replace(/\{boldStart\}/g, "<b>")
    .replace(/\{boldEnd\}/g, "</b>")
    .replace(/\{imp1\}/g, "<span class='important'>")
    .replace(/\{imp2\}/g, "</span>")
    .replace(/\{addonName\}/g, "quickFilters")
    .replace(/\[issue (\d*)\]/g, "<a class=issue no=$1>[issue $1]</a>")
    .replace(/\{P1(?:\s+([^}]+))?\}/g, (_, attrs) => {
      // attrs will be undefined if no class specified
      return attrs ? `<p ${attrs}>` : "<p>";
    })
    .replace(/\{P2\}/g, "</p>");

  return localizedMsg;
}
