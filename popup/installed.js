
addEventListener("click", async (event) => {
	if (event.target.id.startsWith("register")) {
	  messenger.Utilities.openLinkExternally("https://sites.fastspring.com/quickfolders/product/quickfilters?referrer=landing-install");
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



  
	async function loglic() {
		
		let name = await messenger.Utilities.getAddonName(),
		    lis = await messenger.Utilities.isLicensed(),		 
		    ver = await messenger.Utilities.getAddonVersion();	
		//console.log ( 		 name);
		//console.log ( 		 lis);
		//console.log ( 		 ver);	
    

	}


  addEventListener("load", async (event) => {
    const addonName = await browser.runtime.getManifest().name, // or mxUtilties.getAddonName()); == 'quickFilters'
          hoursWorked = 250;
    const mxUtilties = messenger.Utilities;

    console.log("load event install case.");
    // force replacement for __MSG_xx__ entities
    // using John's helper method (which calls i18n API)
    i18n.updateDocument();

    let h1 = document.getElementById('heading-installed');
    if (h1) {
      // this api function can do replacements for us
      h1.innerText = messenger.i18n.getMessage('heading-installed', addonName);
    }
    
    let thanksInfo = document.getElementById('thanks-for-installing-intro');
    if (thanksInfo) {
      console.log("thanksInfo = v v v ");
      console.log(thanksInfo);
      thanksInfo.innerText = messenger.i18n.getMessage("thanks-for-installing-intro", addonName);
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
    
    let suggestion = document.getElementById('support-suggestion');
    if (suggestion) {
      suggestion.innerText = messenger.i18n.getMessage("support-suggestion", addonName);
    }
    
    let preference = document.getElementById('support-preference');
    if (preference) {
      preference.innerText = messenger.i18n.getMessage("support-preference", addonName);
    }

    let title = document.getElementById('window-title');
    if (title)
      title.innerText = messenger.i18n.getMessage("window-title", addonName);
    
    // LICENSING FLOW
    let isLicensed = await mxUtilties.isLicensed(true),
        isExpired = await mxUtilties.LicenseIsExpired();
          
    console.log("Addon " + addonName + "\n" +
      "isLicensed = " + isLicensed + "\n" +
      "isExpired = " + isExpired + "\n"
    );
    
    // renew-your-license
    // renewLicenseListItem
    // purchaseLicenseListItem
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

  loglic();





