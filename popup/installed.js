
addEventListener("click", async (event) => {
	if (event.target.id.startsWith("register")) {

	  messenger.Utilities.openLinkExternally("http://sites.fastspring.com/quickfolders/product/quickfolders?referrer=landing-update");
	}
  });


  addEventListener("click", async (event) => {
	if (event.target.id.startsWith("donate")) {

	  messenger.Utilities.openLinkExternally("http://quickfolders.org/donate.html");
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
	debugger;
	let text = document.body.innerHTML, 
	    htmltext = text.replace(/{addon}/g, await messenger.Utilities.getAddonName()),
	    htmltext2 = htmltext.replace(/{version}/g, await messenger.Utilities.getAddonVersion()); //oder: browser.runtime.getManifest().version
	htmltext = htmltext2.replace(/{appver}/g, await messenger.Utilities.getTBVersion());
  //same for license,   let htmltext=text.replace(/{addon}/g, await messenger.Utilities.getAddonName());
	document.body.innerHTML = htmltext;

  });  

  loglic();





