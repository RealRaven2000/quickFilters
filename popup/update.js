
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
	messenger.Utilities.openLinkExternally("http://sites.fastspring.com/quickfolders/product/quickfolders?referrer=landing-update");
	}
  });


  addEventListener("click", async (event) => {
	if (event.target.id.startsWith("donate")) {

	  messenger.Utilities.openLinkExternally("http://quickfolders.org/donate.html");
	}
  });  



addEventListener("load", async (event) => {
	//debugger;
  const mxUtilties = messenger.Utilities;
	let text = document.body.innerHTML,//	
	    htmltext = text.replace(/{addon}/g, await browser.runtime.getManifest().name ),    //oder mxUtilties.getAddonName());
	    htmltext2 = htmltext.replace(/{version}/g, await mxUtilties.getAddonVersion()); //oder: browser.runtime.getManifest().version
      
	htmltext = htmltext2.replace(/{appver}/g, await mxUtilties.getTBVersion());
		//same for license,   let htmltext=text.replace(/{addon}/g, await mxUtilties.getAddonName());
		document.body.innerHTML=htmltext;

  });  

  addEventListener("unload", async (event) => {

	let remindMe = document.getElementById("remind").checked;


  });  


  licenseLog();



