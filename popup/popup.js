/* BEGIN LICENSE BLOCK

QuickFolders is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK */

/* shared module for installation popups */

async function updateActions(addonName) {
  const mxUtilties = messenger.Utilities;
  // LICENSING FLOW
  
  let isLicensed = await mxUtilties.isLicensed(true),
    isExpired = await mxUtilties.LicenseIsExpired();
        
  //console.log("Addon " + addonName + "\n" +
  //  "isLicensed = " + isLicensed + "\n" +
  //  "isExpired = " + isExpired + "\n"
  //);
  
  function hide(id) {
    document.getElementById(id).setAttribute('collapsed',true);
  }
  function show(id) {
    document.getElementById(id).setAttribute('collapsed',false);
  }
  // renew-your-license - already collapsed
  // renewLicenseListItem - already collapsed
  // purchaseLicenseListItem - not collapsed
  hide('licenseExtended');
  
  if (isLicensed) {
    hide('purchaseLicenseListItem');
    hide('register');
    if (isExpired) { // License Renewal
      hide('extendLicenseListItem');
      hide('extend');
      show('renewLicenseListItem');
      show('renew');
    }
    else { // License Extension
      hide('renewLicenseListItem');
      hide('renew');
      let gpdays = await mxUtilties.LicensedDaysLeft();
      if (gpdays<160) { // they may have seen this popup. Only show extend License section if it is < 160 days away
      show('extendLicenseListItem');
      show('extend');
      }
      else {
        show('licenseExtended');
        hide('extendLicenseListItem');
        hide('extend');
      }
    }
  }  
  
}