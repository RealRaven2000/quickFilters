/* BEGIN LICENSE BLOCK

QuickFolders is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK */

/* shared module for installation popups */

async function updateActions(addonName) {
  let licenseInfo = await messenger.runtime.sendMessage({command:"getLicenseInfo"});
  
  // const mxUtilties = messenger.Utilities;

  function hide(id) {
    let el = document.getElementById(id);
    if (el) {
      el.setAttribute('collapsed',true);
      return el;
		}
    return null;
  }
  function hideSelectorItems(cId) {
    let elements = document.querySelectorAll(cId);
		for (let el of elements) {
      el.setAttribute('collapsed',true);
		}	    
  }
  function show(id) {
    let el = document.getElementById(id);
    if (el) {
      el.setAttribute('collapsed',false);
      return el;
    }
    return null;
  }
  // renew-your-license - already collapsed
  // renewLicenseListItem - already collapsed
  // purchaseLicenseListItem - not collapsed
  hide('licenseExtended');
  
  let isActionList = true;
  if (licenseInfo.isValid || licenseInfo.isExpired) {
    hide('purchaseLicenseListItem');
    hide('register');
    if (licenseInfo.isExpired) { // License Renewal
      hide('extendLicenseListItem');
      hide('extend');
      show('renewLicenseListItem');
      show('renew');
    }
    else { // License Extension
      hide('renewLicenseListItem');
      hide('renew');
      if (licenseInfo.licensedDaysLeft<25) { // they may have seen this popup. Only show extend License section if it is < 25 days away
        show('extendLicenseListItem');
        show('extend');
      }
      else {
        show('licenseExtended');
        hide('extendLicenseListItem');
        hide('extend');
        hide('purchaseSection');
        isActionList = false;
      }
    }
  }  
  else {
    let currentTime=new Date(),
        endSale = new Date("2021-08-23");
    if (currentTime < endSale) {
      show('specialOffer');
      hideSelectorItems('.donations');
    }
  }  
  if (!isActionList) {
    hide('actionBox');
  }
  
}