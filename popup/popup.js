/* shared module for installation popups */

async function updateActions(addonName) {
  const mxUtilties = messenger.Utilities;
  // LICENSING FLOW
  
  let isLicensed = await mxUtilties.isLicensed(true),
    isExpired = await mxUtilties.LicenseIsExpired();
        
  console.log("Addon " + addonName + "\n" +
    "isLicensed = " + isLicensed + "\n" +
    "isExpired = " + isExpired + "\n"
  );
  
  function hide(id) {
    document.getElementById(id).setAttribute('collapsed',true);
  }
  function show(id) {
    document.getElementById(id).setAttribute('collapsed',false);
  }
  // renew-your-license - already collapsed
  // renewLicenseListItem - already collapsed
  // purchaseLicenseListItem - not collapsed
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
      show('extendLicenseListItem');
      show('extend');
    }
  }  
  
}