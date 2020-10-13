
	async function licenseLog() {
    // messenger.Utilities is our own function which communicates with the main QF instance.
    // see api/utilities/implementation.js
    const mxUtilties = messenger.Utilities;
		// Test functions
    /*
    await messenger.Utilities.logDebug ("-------------------------------------------\n" +
                "logic function == update popup\n",
                "-------------------------------------------");
    */
    

	}


  addEventListener("click", async (event) => {
    if (event.target.id.startsWith("register")) {
      console.log ( messenger.Utilities.isLicensed()  );
      messenger.Utilities.openLinkExternally("https://sites.fastspring.com/quickfolders/product/quickfilters?referrer=landing-update");
      }
  });
  
  addEventListener("click", async (event) => {
    if (event.target.id.startsWith("extend")) {
      messenger.Utilities.showXhtmlPage("chrome://quickfilters/content/register.xhtml");
      window.close();
    }
  });

  addEventListener("click", async (event) => {
    if (event.target.id.startsWith("donate")) {
      messenger.Utilities.openLinkExternally("https://quickfilters.quickfolders.org/donate.html");
    }
  });  



  addEventListener("load", async (event) => {
    const addonName = await browser.runtime.getManifest().name, // or mxUtilties.getAddonName()); == 'quickFilters'
          hoursWorked = 250,
          remindInDays = 10;
    const mxUtilties = messenger.Utilities;

    // force replacement for __MSG_xx__ entities
    // using John's helper method (which calls i18n API)
    i18n.updateDocument();
    
        
      
    let h1 = document.getElementById('heading-updated');
    if (h1) {
      // this api function can do replacements for us
      h1.innerText = messenger.i18n.getMessage('heading-updated', addonName);
    }
    
    let thanksInfo = document.getElementById('thanks-for-updating-intro');
    if (thanksInfo) {
      thanksInfo.innerText = messenger.i18n.getMessage("thanks-for-updating-intro", addonName);
    }
    
    let verInfo = document.getElementById('active-version-info');
    if (verInfo) {
      let addonVer = await mxUtilties.getAddonVersion(),
          appVer = await mxUtilties.getTBVersion();
      
      // use the i18n API      
      // You are now running <b class="versionnumber">version {version}</b> on Thunderbird {appver}.
      // for multiple replacements, pass an array
      verInfo.innerHTML = messenger.i18n.getMessage("active-version-info", [addonVer, appVer])
        .replace("{boldStart}","<b class='versionnumber'>")
        .replace("{boldEnd}","</b>");
    }
    
    let timeAndEffort =  document.getElementById('time-and-effort');
    if (timeAndEffort) {
      timeAndEffort.innerText = messenger.i18n.getMessage("time-and-effort", addonName);
    }
    
    let measuredEffort =  document.getElementById('hours-effort');
    if (measuredEffort) {
      measuredEffort.innerText = messenger.i18n.getMessage("hours-effort", hoursWorked);
    }
    
    let suggestion = document.getElementById('support-suggestion');
    if (suggestion) {
      suggestion.innerText = messenger.i18n.getMessage("support-suggestion", addonName);
    }
    
    let preference = document.getElementById('support-preference');
    if (preference) {
      preference.innerText = messenger.i18n.getMessage("support-preference", addonName);
    }
    
    let remind = document.getElementById('label-remind-me');
    if (remind) {
      remind.innerText = messenger.i18n.getMessage("label-remind-me", remindInDays);
      
    }
    
    let title = document.getElementById('window-title');
    title.innerText = messenger.i18n.getMessage("window-title", addonName);
    
    // LICENSING FLOW
    let isLicensed = await mxUtilties.isLicensed(true),
        isExpired = await mxUtilties.LicenseIsExpired();
          
    console.log("Addon " + addonName + "\n" +
      "isLicensed = " + isLicensed + "\n" +
      "isExpired = " + isExpired + "\n"
    );    
    
    // renew-your-license - already collapsed
    // renewLicenseListItem - already collapsed
    // purchaseLicenseListItem - not collapsed
    if (isLicensed) {
      document.getElementById('purchaseLicenseListItem').setAttribute('collapsed',true);
      if (isExpired) { // License Renewal
        document.getElementById('renewLicenseListItem').setAttribute('collapsed',false);
        document.getElementById('extend').setAttribute('collapsed',false);
        document.getElementById('register').setAttribute('collapsed',true);
      }
      else { // License Extension
        document.getElementById('extendLicenseListItem').setAttribute('collapsed',true);
        document.getElementById('extend').setAttribute('collapsed',true);
        document.getElementById('register').setAttribute('collapsed',false);
      }
    }
    

  });  

  addEventListener("unload", async (event) => {
    let remindMe = document.getElementById("remind").checked;
  });  


  licenseLog();



