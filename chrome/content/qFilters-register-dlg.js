"use strict";
/* 
  BEGIN LICENSE BLOCK

	quickFilters is released under the Creative Commons (CC BY-ND 4.0)
	Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
	For details, please refer to license.txt in the root folder of this extension

  END LICENSE BLOCK 
  
*/

/* [mx-l10n] This module handles front-end code for the licensing dialog  */

var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');

// removed UI function from quickFilters.Licenser
var Register = {
  l10n: function() {
    quickFilters.Util.localize(window);
  },
  load: async function load() {
    await quickFilters.Util.init();
    this.updateUI();
    this.updateLicenseUI();
    window.addEventListener("quickFilters.BackgroundUpdate", this.updateLicenseUI.bind(this));
  },
  
  updateLicenseUI: async function updateLicenseUI() {
    const licenseInfo = quickFilters.Util.licenseInfo,
          getElement = document.getElementById.bind(document),
          util = quickFilters.Util;
    
    let decryptedDate = licenseInfo.expiryDate;
    let btnLicense = getElement('btnLicense');
    btnLicense.label = util.getBundleString("buyPersonalLicense.button","Buy Personal License!");
    if (decryptedDate) {
			if (util.isDebug) {
				util.logDebug('Register.updateLicenseUI()\n' + 'ValidationStatus = ' + licenseInfo.description)
				debugger;
			}
				
      getElement('licenseDate').value = decryptedDate; // invalid ??
			if (licenseInfo.status == "Expired" || licenseInfo.status == "Valid") {
				if(licenseInfo.status == "Expired")
					btnLicense.label = util.getBundleString("quickfilters.notification.premium.btn.renewLicense", "Renew License!");
				else {
					btnLicense.label = util.getBundleString("quickfilters.notification.premium.btn.extendLicense", "Extend License!");
					// add tooltip
					btnLicense.setAttribute('tooltiptext',
					  util.getBundleString("quickfilters.notification.premium.btn.extendLicense.tooltip", 
						  "This will extend the current license date by 1 year. It's typically cheaper than a new license."));
				}

				btnLicense.removeAttribute('oncommand');
				btnLicense.setAttribute('oncommand', 'Register.goPro(2);');
				btnLicense.classList.add('expired');
				// hide the "Enter License Key..." button + label
				if (licenseInfo.status == "Valid") {
					getElement('haveLicense').collapsed=true;
					getElement('btnEnterCode').collapsed=true;
				}
        getElement('licenseDate').collapsed = false;
			}
		}
    else {
      getElement('haveLicense').collapsed=false;
      getElement('btnEnterCode').collapsed=false;
      getElement('licenseDate').collapsed = true;
    }
    
    getElement('qfLicenseTerm').classList.remove('expired');
		switch(licenseInfo.status) {
			case "Expired":
			  getElement('licenseDateLabel').value = util.getBundleString("quickfilters.register.licenseValid.expired","Your license expired on:")
				getElement('qfLicenseTerm').classList.add('expired');
			  break;
			case "Valid":
			  getElement('btnLicense').classList.remove('register'); // remove the "pulsing effect" if license is valid.
        getElement('licenseDateLabel').value =  util.getBundleString("quickfilters.label.licenseValid","Your license is valid until:");
			  break;
			case "Empty":
			case "NotValidated":
				getElement('licenseDateLabel').value = " ";
			  break;
			default: // default class=register will animate the button
        let txt = "License Status: " + licenseInfo.description;
			  getElement('licenseDateLabel').value = txt;
        util.logToConsole("Registration Problem\n" + txt + "\nDecrypted part: " + licenseInfo.decryptedPart);
        
		}
			
  } ,
  
  updateUI: async function updateUI() {
    const getElement = document.getElementById.bind(document),
          util = quickFilters.Util,
          prefs = quickFilters.Preferences;
        
    let dropdownCount = 0;
    function appendIdentity(dropdown, id, account) {
      if (!id) {
        util.logDebug('appendIdentity failed for account = ' + account ? account.key : 'unknown');
      }
      try {
        util.logDebugOptional('identities', 
          'Account: ' + account.key + '...\n'  
          + 'appendIdentity [' + dropdownCount + ']\n'
          + '  identityName = ' + (id ? id.identityName : 'empty') + '\n'
          + '  fullName = ' + (id ? id.fullName : 'empty') + '\n' 
          + '  email = ' + (id.email ? id.email : 'empty'));					
        if (!id.email) {
          util.logToConsole('Omitting account ' + id.fullName + ' - no mail address');
          return;
        }
        let menuitem = document.createXULElement ? document.createXULElement('menuitem') : document.createElement('menuitem');
				menuitem.setAttribute("id", "id" + dropdownCount++);
				// this.setEventAttribute(menuitem, "oncommand","quickFilters.Interface.onGetMessages(this);");
				menuitem.setAttribute("fullName", id.fullName);
				menuitem.setAttribute("value", id.email);
				menuitem.setAttribute("accountKey", account.key);
				menuitem.setAttribute("label", id.identityName ? id.identityName : id.email);
        dropdown.appendChild(menuitem);
      }
      catch (ex) {
        util.logException('appendIdentity failed: ', ex);
      }
    }
    
		if (window.arguments && window.arguments.length>1 && window.arguments[1].inn.referrer) {
      let ref = getElement('referrer');
      ref.value = window.arguments[1].inn.referrer;
    }
		
    // iterate accounts
    let idSelector = getElement('mailIdentity'),
        popup = idSelector.menupopup,
        myAccounts = util.Accounts,
        acCount = myAccounts.length;
    util.logDebugOptional('identities', 'iterating accounts: (' + acCount + ')…');
    for (let a=0; a < myAccounts.length; a++) { 
      let ac = myAccounts[a];
      if (ac.defaultIdentity) {
        util.logDebugOptional('identities', ac.key + ': appending default identity…');
        appendIdentity(popup, ac.defaultIdentity, ac);
        continue;
      }
      let ids = ac.identities; // array of nsIMsgIdentity
      if (ids) {
        let idCount = ids ? (ids.Count ? ids.Count() : ids.length) : 0;
        util.logDebugOptional('identities', ac.key + ': iterate ' + idCount + ' identities…');
        for (let i=0; i<idCount; i++) {
          // use ac.defaultIdentity ??
          // populate the dropdown with nsIMsgIdentity details
          let id = util.getIdentityByIndex(ids, i);
          if (!id) continue;
          appendIdentity(popup, id, ac);
        }
      }
      else {
        util.logDebugOptional('identities', 'Account: ' + ac.key + ':\n - No identities.');
      }  
    }
    // select first item
    idSelector.selectedIndex = 0;
    this.selectIdentity(idSelector);
		if (prefs.isDebugOption('premium.licenser')) getElement('referrer').collapsed=false;
    
  } ,
  
  cancel: function cancel() {
  
  } ,
  
  goPro: function goPro(license_type) {
    const productDetail = "https://sites.fastspring.com/quickfolders/product/quickfolders",
					prefs =  quickFilters.Preferences,
          util = quickFilters.Util;
    // redirect to registration site; pass in the feature that brought user here
    // short order process
    if (util.isDebug) debugger;
    let shortOrder,
		    featureName = document.getElementById('referrer').value; // hidden field
    switch	(license_type) {
			case 0:  // personal license
				shortOrder = "https://sites.fastspring.com/quickfolders/instant/quickfolders";
			  break;
			case 1: // domain license
				shortOrder = "https://sites.fastspring.com/quickfolders/instant/quickfoldersdomain";
			  break;
			case 2: // license renewal
				if (quickFilters.Util.licenseInfo.keyType==1) { // domain license!
					shortOrder = "https://sites.fastspring.com/quickfolders/instant/quickfoldersdomainrenewal";
				}
				else
					shortOrder = "https://sites.fastspring.com/quickfolders/instant/quickfoldersrenew";
				featureName = encodeURI(prefs.getStringPref('LicenseKey'));
				// should we autoselect the correct email address?
			  break;
		}
    // view product detail
    let firstName = document.getElementById('firstName').value,
        lastName = document.getElementById('lastName').value,
        email = document.getElementById('email').value,
        addQuery = featureName ?  "&referrer=" + featureName : "",
        url = shortOrder 
            + "?contact_fname=" + firstName 
						+ addQuery
            + "&contact_lname=" + lastName 
            + "&contact_email=" + email;
        
    util.openLinkInBrowser(null, url);
    window.close();
  }  ,

   /* obsolete form submission from code */
  postForm  : function postForm_obsolete(util) {
    let url ="https://sites.fastspring.com/quickfolders/product/quickfolders?action=order",
        oReq;
    
    const XMLHttpRequest = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");    
    oReq = new XMLHttpRequest();
    // oReq.onload = reqListener;
    let formData = new FormData();
    formData.append("submit", "purchase");
    oReq.open("POST", url, true);
    oReq.send(formData);  
  } ,
  
  premiumInfo: function premiumInfo(event) {
    quickFilters.Util.openURL(event,'https://quickfolders.org/premium.html');
  },
  
  sanitizeName: function sanitizeName(name) {
    // remove bracketed stuff: "fred jones (freddy)" => "fred jones"
    let x = name.replace(/ *\([^)]*\) */g, "");
    if (x.trim)
      return x.trim();
    return x;
  },
  
  selectIdentity: function selectIdentity(element) {
    // get selectedItem attributes
    let it = element.selectedItem,
        fName = Register.sanitizeName(it.getAttribute('fullName')), // not sure whether I can use this.sanitizeName
        email = it.getAttribute('value'),
        names = fName.split(' ');
    document.getElementById('firstName').value = names[0];
    document.getElementById('lastName').value = names.length > 1 ? names[names.length-1] : "";
    document.getElementById('email').value = email;
  } ,
  
    
  
}



// initialize the dialog and do l10n
//	ondialogcancel="var cancel=quickFilters.Licenser.cancel.bind(quickFilters.Licenser); cancel();"
//	onload="var load=quickFilters.Licenser.load.bind(quickFilters.Licenser); load();"

window.document.addEventListener('DOMContentLoaded', 
  Register.l10n.bind(Register) , 
  { once: true });
window.addEventListener('load', 
  Register.load.bind(Register) , 
  { once: true });

//	ondialogcancel="var cancelRegister.cancel.bind(Register); cancel();"
window.addEventListener('dialogcancel', 
  function () { Register.cancel(); }
);

