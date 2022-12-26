/* BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK */
// Script for splash screen displayed when updating this Extension

const SALE_REDUCTION="30%"; // reduction for buying + renewals

  addEventListener("click", async (event) => {
    let targetId = event.target.id || "";
    
    // action buttons
    if (targetId.startsWith("register")) {
      messenger.Utilities.showLicenseDialog("splashScreen");
    }
    switch(targetId) {
      case "bargainIcon":
        messenger.windows.openDefaultBrowser("https://sites.fastspring.com/quickfolders/product/quickfilters?referrer=landing-update");
        break;
      case "bargainRenewIcon":
        messenger.Utilities.showXhtmlPage("chrome://quickfilters/content/register" + ".xhtml");
        window.close();
        break;
      case "whatsNew":
        messenger.Utilities.showVersionHistory();    
        break;
    } 

    if (targetId.startsWith("extend") || targetId.startsWith("renew")) {
      messenger.Utilities.showXhtmlPage("chrome://quickfilters/content/register.xhtml");
      window.close(); // not allowed by content script!
    }
    if (targetId.startsWith("donate")) {
      messenger.windows.openDefaultBrowser("https://quickfilters.quickfolders.org/donate.html");
    }
    if (event.target.classList.contains("issue")) {
      let issueId = event.target.getAttribute("no");
      if (issueId) {
        messenger.windows.openDefaultBrowser(`https://github.com/RealRaven2000/quickFilters/issues/${issueId}`);
      }
    }    
        
  });  


  addEventListener("load", async (event) => {
    const manifest = await messenger.runtime.getManifest(),
          browserInfo = await messenger.runtime.getBrowserInfo(),
          addonName = manifest.name,
          userName = await messenger.Utilities.getUserName(),
          addonVer = manifest.version,
          appVer = browserInfo.version,
          remindInDays = 10;

    // internal functions
    function hideSelectorItems(cId) {
      let elements = document.querySelectorAll(cId);
      for (let el of elements) {
        el.setAttribute('collapsed',true);
      }	    
    }
    // force replacement for __MSG_xx__ entities
    // using John's helper method (which calls i18n API)
    i18n.updateDocument();
    
    let loc = window.location,
        hasMsg = loc.search && loc.search.length>1,
        msg;
    
    if (hasMsg) {
      // retrieve text  from queryString
      let qs = new URLSearchParams(window.location.search);
      msg = qs.get("msg");
      if (!msg) {
        hasMsg = false;
      }
      else console.log ("Splash screen - got a message\n" + msg);
    }
      
    let h1 = document.getElementById("heading-updated");
    if (h1) {
      // this api function can do replacements for us
      if (!hasMsg)
        h1.innerText = messenger.i18n.getMessage("heading-updated", addonName);
      else
        h1.innerText = "License Supported Feature";
    }
    
    if (hasMsg) {
      document.getElementById("licenseExtended").setAttribute("collapsed",true);
      document.getElementById("changesList").setAttribute("collapsed",true);
      document.getElementById("purchaseHeader").setAttribute("collapsed",true);
      hideSelectorItems('.donations');
    }
    
    let introMsg = document.getElementById('intro-msg');
    if (introMsg) {
      if (!hasMsg)
        introMsg.innerText = messenger.i18n.getMessage("thanks-for-updating-intro", addonName);
      else
        introMsg.innerText = msg;
    }
    
    let verInfo = document.getElementById('active-version-info');
    if (verInfo) {
      
      // use the i18n API      
      // You are now running <b class="versionnumber">version {version}</b> on Thunderbird {appver}.
      // for multiple replacements, pass an array
      if (hasMsg) {
        verInfo.setAttribute("collapsed",true);
      }
      else {
        verInfo.innerHTML = messenger.i18n.getMessage("active-version-info", [addonVer, appVer])
          .replace("{boldStart}","<b class='versionnumber'>")
          .replace("{boldEnd}","</b>");
      }
    }
    
    let timeAndEffort =  document.getElementById('time-and-effort');
    if (timeAndEffort) {
      if (hasMsg) timeAndEffort.setAttribute('collapsed',true);
      else timeAndEffort.innerText = messenger.i18n.getMessage("time-and-effort", addonName);
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
    
    let specialOffer = document.getElementById('specialOfferTxt');
    if (specialOffer) {
      let expiry = messenger.i18n.getMessage("special-offer-expiry"),
          reduction = SALE_REDUCTION;
      // note: expiry day is set in popup.js "endSale" variable
      specialOffer.innerHTML = messenger.i18n.getMessage("special-offer-content", [expiry, reduction])
          .replace(/\{boldStart\}/g,"<b>")
          .replace(/\{boldEnd\}/g,"</b>");
    }
    
    let specialRenew = document.getElementById("specialOfferRenewTxt");
    if (specialRenew) {
      let expiry = messenger.i18n.getMessage("special-offer-expiry"),
          reduction = SALE_REDUCTION;
      // note: expiry day is set in popup.js "endSale" variable
      specialRenew.innerHTML = 
        messenger.i18n.getMessage("special-offer-renew", [expiry, reduction])
          .replace(/\{boldStart\}/g,"<b>")
          .replace(/\{boldEnd\}/g,"</b>");
    }    
          
    let elementsSI = document.querySelectorAll(".specialOfferIntro"),
        txtSI = messenger.i18n.getMessage('special-offer-intro', addonName)
                .replace(/\{boldStart\}/g,"<b>")
                .replace(/\{boldEnd\}/g,"</b>")
                .replace("{name}", userName);
    for (let el of elementsSI) {
      el.innerHTML = txtSI;
    }
    
    let whatsNewLst = document.getElementById('whatsNewList');
    if (whatsNewLst) {
      whatsNewLst.innerHTML =  messenger.i18n.getMessage('whats-new-list')
        .replace(/\{L1\}/g,"<li>")
        .replace(/\{L2\}/g,"</li>")
        .replace(/\{boldStart\}/g,"<b>")
        .replace(/\{boldEnd\}/g,"</b>")
        .replace(/\[issue (\d*)\]/g,"<a class=issue no=$1>[issue $1]</a>");
    }
    
    
    
    let ongoing = document.getElementById('ongoing-work');
    if (ongoing) {
      ongoing.innerText = messenger.i18n.getMessage("ongoing-work", addonName);
    }

    let title = document.getElementById('window-title');
    title.innerText = messenger.i18n.getMessage("window-title", addonName);
           
    updateActions(addonName);

    // addAnimation('body');

  });  

  addEventListener("unload", async (event) => {
    let remindMe = document.getElementById("remind").checked;
  });  



