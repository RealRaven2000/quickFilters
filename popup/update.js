
	async function licenseLog() {
    // messenger.Utilities is our own function which communicates with the main QF instance.
    // see api/utilities/implementation.js
    const mxUtilties = messenger.Utilities;
    
    debugger;
		// Test functions
    /*
    await messenger.Utilities.logDebug ("-------------------------------------------\n" +
                "logic function == update popup\n",
                "-------------------------------------------");
    */
    
    
		let name = await mxUtilties.getAddonName(),    
		    lis = await mxUtilties.isLicensed(),	
		    ver = await mxUtilties.getAddonVersion(),
		    isProUser = await mxUtilties.LicenseIsProUser();
        
		await mxUtilties.logDebug (
        "====== update.js script  ====== \n "
      + " Addon Name: " + name + "\n"
      + " isLicensed: " + lis + "\n"
      + " Addon Version: " + ver  + "\n"
      + " isProUser: " + isProUser + "\n"
      + "=============================== \n "
      ) ;

    
		if (isProUser) {
      let isExpired = await mxUtilties.LicenseIsExpired();		
      mxUtilties.logDebug ("License is expired: " + isExpired);
    } 

	}


addEventListener("click", async (event) => {
	if (event.target.id.startsWith("register")) {
	console.log ( messenger.Utilities.isLicensed()  );
	messenger.Utilities.openLinkExternally("https://sites.fastspring.com/quickfolders/product/quickfilters?referrer=landing-update");
	}
  });


  addEventListener("click", async (event) => {
	if (event.target.id.startsWith("donate")) {

	  messenger.Utilities.openLinkExternally("https://quickfilters.quickfolders.org/donate.html");
	}
  });  



addEventListener("load", async (event) => {
	//debugger;
  const mxUtilties = messenger.Utilities;
	let text = document.body.innerHTML,//	
	    htmltext = text.replace(/{addon}/g, await browser.runtime.getManifest().name ),    // or mxUtilties.getAddonName());
	    htmltext2 = htmltext.replace(/{version}/g, await mxUtilties.getAddonVersion());    // or browser.runtime.getManifest().version
      
	htmltext = htmltext2.replace(/{appver}/g, await mxUtilties.getTBVersion());
		//same for license,   let htmltext=text.replace(/{addon}/g, await mxUtilties.getAddonName());
		document.body.innerHTML=htmltext;

  });  

  addEventListener("unload", async (event) => {

	let remindMe = document.getElementById("remind").checked;


  });  


  licenseLog();



