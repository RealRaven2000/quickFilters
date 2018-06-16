"use strict";
/* 
BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK 
*/


Components.utils.import('resource://gre/modules/Services.jsm');	

quickFilters.Crypto = {
  get key_type() {
    return quickFilters.Preferences.getIntPref('licenseType');
  },
  set  key_type(t) {
    quickFilters.Preferences.setIntPref('licenseType', t);
  },
	/* note the encryption key is private. please do not attemept te reverse engineer */
  get decryption_key() {
    switch (this.key_type) {
      case 0:  // private
        return "1933eef03efab13188c903d69d293d4db35372620a0c26f23e1f805ba2d4e87";
      case 1:  // domain
        return "";
      default:
        return -1; // unknown or free license
    }
  },
  get modulus() {
    switch (this.key_type) {
      case 0:  // private
        return "1ef94b8a38bcfecc0dc49517045dd7362b3e8181be290a4dc298c807b052297";
      case 1:  // domain
        return "";
      default:
        return -1; // unknown or free license
    }
  },
  get maxDigits() {
    switch (this.key_type) {
      case 0:  // private
        return 35;
      case 1:  // domain
        return 67;
      default:
        return 0; // unknown or free license
    }
  },
  get keyLength() {
    switch (this.key_type) {
      case 0:  // private
        return 256;
      case 1:  // domain
        return 512;
      default:
        return 0; // unknown or free license
    }
  }
};

quickFilters.Licenser = {
  LicenseKey: '',  // store in preference when given
  RSA_encryption: "", // 
  get RSA_decryption() {return quickFilters.Crypto.decryption_key;},
  get RSA_modulus()    {return quickFilters.Crypto.modulus;},
  get RSA_keylength()  {return quickFilters.Crypto.keyLength;},
  get MaxDigits()      {return quickFilters.Crypto.maxDigits;},
  DecryptedMail: '',
  DecryptedDate: '',
  AllowSecondaryMails: false,
  wasValidityTested: false, // save time do not validate again and again
  get isValidated() {
    return (this.ValidationStatus == this.ELicenseState.Valid);
  },
	get isExpired() {
		let key = quickFilters.Preferences.getStringPref('LicenseKey');
		if (!key) return false;
		if (this.ValidationStatus == this.ELicenseState.NotValidated)
			this.validateLicense(key);
    return (this.ValidationStatus == this.ELicenseState.Expired);
	},
  ValidationStatus: 0,
  // enumeration for Validated state
  ELicenseState: {
    NotValidated: 0, // default status
    Valid: 1,
    Invalid: 2,
    Expired: 3,
    MailNotConfigured: 4,
    MailDifferent: 5,
    Empty: 6
  },
  
  licenseDescription: function licenseDescription(status) {
    const ELS = this.ELicenseState;
    switch(status) {
      case ELS.NotValidated: return 'Not Validated';
      case ELS.Valid: return 'Valid';
      case ELS.Invalid: return 'Invalid';
      case ELS.Expired: return 'Invalid';
      case ELS.MailNotConfigured: return 'Mail Not Configured';
      case ELS.MailDifferent: return 'Mail Different';
      case ELS.Empty: return 'Empty';
      default: return 'Unknown Status';
    }
  },
  
  showDialog: function showDialog(featureName) {
		let params = {inn:{referrer:featureName, instance: quickFilters}, out:null};
		quickFilters.Util.getMail3PaneWindow().openDialog('chrome://quickfilters/content/register.xul','quickfilters-register','chrome,titlebar,centerscreen,resizable,alwaysRaised,instantApply',quickFilters,params).focus();
  } ,
  // list of eligible accounts
  get Accounts() {
		return quickFilters.Util.Accounts;
  },
  
  accept: function accept() {
		const util = quickFilters.Util;
    util.logDebug("Licenser.accept()");
  } ,
  
  cancel: function cancel() {
		const util = quickFilters.Util;
    util.logDebug("Licenser.cancel()");
  } ,
  
  load: function load() {
    const getElement = document.getElementById.bind(document),
          util = quickFilters.Util,
					licenser = util.Licenser,
          ELS = licenser.ELicenseState;
        
    let dropdownCount = 0;
		util.logDebug("Licenser.load() started");
		
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
        let menuitem = document.createElement('menuitem');
				menuitem.setAttribute("id", "id" + dropdownCount++);
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
    
		if (window.arguments && window.arguments[1].inn.referrer) {
      let ref = getElement('referrer');
      ref.value = window.arguments[1].inn.referrer;
    }
		// prepare renew license button?
    let decryptedDate = licenser ? licenser.DecryptedDate : '';
    if (decryptedDate) {
			if (util.isDebug) {
				util.logDebug('quickFilters.Licenser.load()\n' + 'ValidationStatus = ' + licenser.licenseDescription(licenser.ValidationStatus))
				debugger;
			}
			if (licenser.ValidationStatus == ELS.NotValidated) {
				licenser.validateLicense(quickFilters.Preferences.getStringPref('LicenseKey'));
				util.logDebug('Re-validated.\n' + 'ValidationStatus = ' + licenser.licenseDescription(licenser.ValidationStatus))
			}
				
      getElement('licenseDate').value = decryptedDate; // invalid ??
			if (licenser.isExpired) {
				let btnLicense = getElement('btnLicense');
				btnLicense.label = util.getBundleString("quickfilters.notification.premium.btn.renewLicense", "Renew License!");
				btnLicense.removeAttribute('oncommand');
				btnLicense.setAttribute('oncommand', 'quickFilters.Licenser.goPro(2);');
			}
		}
    else
      getElement('licenseDate').collapsed = true;
		
		switch(licenser.ValidationStatus) {
			case ELS.Expired:
			  getElement('licenseDateLabel').value = util.getBundleString("quickfilters.register.licenseValid.expired","Your license expired on:")
				getElement('qfLicenseTerm').classList.add('expired');
			  break;
			case ELS.Valid:
			  getElement('btnLicense').classList.remove('register'); // remove the "breathing effect" if license is valid.
			  break;
			case ELS.Empty:
				getElement('licenseDateLabel').value =" ";
			  break;
			default: // default class=register will animate the button
				getElement('licenseDateLabel').value = licenser.licenseDescription(licenser.ValidationStatus) + ":";
		}


    // iterate accounts
    let idSelector = getElement('mailIdentity'),
        popup = idSelector.menupopup,
        myAccounts = this.Accounts,
        acCount = myAccounts.length;
    util.logDebugOptional('identities', 'iterating accounts: (' + acCount + ')...');
    for (let a=0; a < myAccounts.length; a++) { 
      let ac = myAccounts[a];
      if (ac.defaultIdentity) {
        util.logDebugOptional('identities', ac.key + ': appending default identity...');
        appendIdentity(popup, ac.defaultIdentity, ac);
        continue;
      }
      let ids = ac.identities; // array of nsIMsgIdentity
      if (ids) {
        let idCount = ids ? (ids.Count ? ids.Count() : ids.length) : 0;
        util.logDebugOptional('identities', ac.key + ': iterate ' + idCount + ' identities...');
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
		util.logDebug("Licenser.load() complete");
    
  } ,
  
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
        fName = this.sanitizeName(it.getAttribute('fullName')),
        email = it.getAttribute('value'),
        names = fName.split(' ');
    document.getElementById('firstName').value = names[0];
    document.getElementById('lastName').value = names.length > 1 ? names[names.length-1] : "";
    document.getElementById('email').value = email;
  } ,
  
  goPro: function goPro(license_type) {
    const productDetail = "http://sites.fastspring.com/quickfolders/product/quickfilters",
          util = quickFilters.Util;
    // redirect to registration site; pass in the feature that brought user here
    // short order process
    if (util.isDebug) debugger;
    let shortOrder,
		    addQuery = '',
				featureName = document.getElementById('referrer').value; // hidden field
    switch	(license_type) {
			case 0:  // personal license
				shortOrder = "https://sites.fastspring.com/quickfolders/instant/quickfilters";
			  break;
			case 1: // domain license
			  alert("Sorry - Domain licenses for quickFilters are still under development. Please contact me directy to discuss this.");
				shortOrder = "http://sites.fastspring.com/quickfolders/instant/quickfiltersdomain";
				return; // EARLY EXIT EXIT EXIT
			  break;
			case 2: // license renewal
				shortOrder = "http://sites.fastspring.com/quickfolders/instant/quickfiltersrenew";
				// addQuery = "&renewal=" + encodeURI(quickFilters.Preferences.getStringPref('LicenseKey'));
				featureName = encodeURI(quickFilters.Preferences.getStringPref('LicenseKey'));
				// should we autoselect the correct email address?
			  break;
		}
    // view product detail
    let firstName = document.getElementById('firstName').value,
        lastName = document.getElementById('lastName').value,
        email = document.getElementById('email').value,
        url = shortOrder 
            + "?contact_fname=" + firstName 
            + "&contact_lname=" + lastName 
						+ addQuery
            + "&contact_email=" + email;
        
    let queryString = '';  // action=adds
        
    if (featureName) {
      queryString = "&referrer=" + featureName;
    }
    util.openLinkInBrowser(null, url + queryString);
    window.close();
  }  ,

   /* obsolete form submission from code */
  postForm  : function postForm_obsolete(util) {
    let url ="http://sites.fastspring.com/quickfolders/product/quickfilters?action=order",
        oReq;
    
    if (util.PlatformVersion >=16.0) {
      const XMLHttpRequest = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");    
      oReq = new XMLHttpRequest();
    }
    else {
      const { XMLHttpRequest_Legacy } = Components.classes["@mozilla.org/appshell/appShellService;1"]
                                       .getService(Components.interfaces.nsIAppShellService)
                                       .hiddenDOMWindow;
      oReq = new XMLHttpRequest_Legacy();
    }
    // oReq.onload = reqListener;
    let formData = new FormData();
    formData.append("submit", "purchase");
    oReq.open("POST", url, true);
    oReq.send(formData);  
  } ,
  
  premiumInfo: function premiumInfo(event) {
    quickFilters.Util.openURL(event,'http://quickfilters.mozdev.org/premium.html');
  },
  
  // format QI-EMAIL:DATE;CRYPTO
  // example: QI-joe.bloggs@gotmail.com:2015-05-20;
  getDate: function getDate(LicenseKey) {
    // get mail+date portion
    let arr = LicenseKey.split(';');
    if (!arr.length) {
      quickFilters.Util.logDebug('getDate() failed - no ; found');
      return ''; 
    }
    // get date portion
    let arr1=arr[0].split(':');
    if (arr1.length<2) {
      quickFilters.Util.logDebug('getDate() failed - no : found');
      return '';
    }
    return arr1[1];
  },
  
  getMail: function getMail(LicenseKey) {
    let arr1 = LicenseKey.split(':');
    if (!arr1.length) {
      quickFilters.Util.logDebug('getMail() failed - no : found');
      return '';
    }
    let pos = arr1[0].indexOf('-') + 1;
    return arr1[0].substr(pos); // split off QI- or QID-
  },
  
  getCrypto: function getCrypto(LicenseKey) {
    let arr=LicenseKey.split(';');
    if (arr.length<2) {
      quickFilters.Util.logDebug('getCrypto() failed - no ; found');
      return null;
    }
    return arr[1];
  },
  
  logIdentity: function logIdentity(id) {  // debug a nsIMsgIdentity 
    if (!id) return "EMPTY id!"
    let txt = '';
    try { // building this incremental in case of problems. I know this is bad for performance, because immutable strings.
      txt += "key: " + id.key + '\n';
      txt += "email:" + (id.email || 'EMPTY') + '\n';
      txt += "fullName:" + (id.fullName || 'EMPTY') + '\n';
      txt += "valid:" + (id.valid || 'EMPTY') + '\n';
      txt += "identityName: " + id.identityName + '\n';
    }
    catch(ex) {
      this.logException('validateLicense (identity info:)\n' + txt, ex);
    }
    finally {
      return txt;
    }
  } ,	
	
  validateLicense: function validate(LicenseKey) {
    function logResult(parent) {
      util.logDebug ('validateLicense()\n returns ' 
                     + parent.licenseDescription(parent.ValidationStatus)
                     + '   [' + parent.ValidationStatus + ']');
    }
		
    function isIdMatchedLicense(idMail, licenseMail) {
			try {
				switch(quickFilters.Crypto.key_type) {
					case 0: // private license
						return (idMail.toLowerCase()==licenseMail);
					case 1: // domain matching 
						// only allow one *
						if ((licenseMail.match(/\*/g)||[]).length != 1)
							return false;
						// replace * => .*
						let r = new RegExp(licenseMail.replace("*",".*"));
						let t = r.test(idMail);
						return t;
				}
			}
			catch (ex) {
				util.logException('validateLicense.isIdMatchedLicense() failed: ', ex);				
			}
      return false;
    }
    
    // extract encrypted portion after ;
    const ELS = this.ELicenseState,
          util = quickFilters.Util,
          prefs = quickFilters.Preferences,
          logIdentity = quickFilters.Licenser.logIdentity;
    if (prefs.isDebug) {
      util.logDebug("validateLicense(" + LicenseKey + ")");
    }
    if (!LicenseKey) {
      this.ValidationStatus = ELS.Empty;
      logResult(this);
      return [this.ValidationStatus, ''];
    }
    if (LicenseKey.indexOf('QID')==0) {
       if (quickFilters.Crypto.key_type!=1) { // not currently a domain key?
         let txt = util.getBundleString("qf.prompt.switchDomainLicense", "Switch to Domain License?");
				  
         if (Services.prompt.confirm(null, "quickFilters", txt)) {
           quickFilters.Crypto.key_type=1; // switch to volume license
         }
       }
    }
    else {
      quickFilters.Crypto.key_type=0;
    }
    let maxDigits = quickFilters.Crypto.maxDigits, // will be 67 for Domain License
        encrypted = this.getCrypto(LicenseKey),
        clearTextEmail = this.getMail(LicenseKey),
        clearTextDate = this.getDate(LicenseKey),
        RealLicense = '';
    if (!encrypted) {
      this.ValidationStatus = ELS.Invalid;
      logResult(this);
      return [this.ValidationStatus, ''];
    }
    // RSAKeyPair(encryptionExponent, decryptionExponent, modulus)
    if (prefs.isDebug) {
      util.logDebug("RSA.initialise(" +  maxDigits + ")");
    }
    
    quickFilters.RSA.initialise(maxDigits);
    util.logDebug ('Creating RSA key + decrypting');
    // we do not pass encryptionComponent as we don't need it for decryption
    if (prefs.isDebug) {
      util.logDebug("new RSA.RSAKeyPair()");
    }
    let key = new quickFilters.RSA.RSAKeyPair("", this.RSA_decryption, this.RSA_modulus, this.RSA_keylength);
    // decrypt
    // verify against remainder of string
    this.DecryptedMail = '';
    this.DecryptedDate = '';
    if (encrypted) try {
      if (prefs.isDebug) {
        util.logDebug("get RSA.decryptedString()");
      }
      RealLicense = quickFilters.RSA.decryptedString(key, encrypted);
      this.wasValidityTested = true;
      util.logDebug ('Decryption Complete : decrypted string = ' + RealLicense);
    }
    catch (ex) {
      util.logException('RSA Decryption failed: ', ex);
    }
    if (!RealLicense) {
      this.ValidationStatus = ELS.Invalid;
      logResult(this);
      return [this.ValidationStatus, ''];
    }
    else {
      this.DecryptedMail = this.getMail(RealLicense + ":xxx");
      this.DecryptedDate = this.getDate(RealLicense + ":xxx");
      // check ISO format YYYY-MM-DD
      let regEx = /^\d{4}-\d{2}-\d{2}$/;
      if (!this.DecryptedDate.match(regEx)) {
        this.DecryptedDate = '';
        this.ValidationStatus = ELS.Invalid;
        logResult(this);
        return [this.ValidationStatus, RealLicense];
      }
    }
    if (clearTextEmail.toLocaleLowerCase() != this.DecryptedMail.toLocaleLowerCase()) {
      this.ValidationStatus = ELS.MailDifferent;
      logResult(this);
      return [this.ValidationStatus, RealLicense];
    }
    // ******* CHECK LICENSE EXPIRY  ********
    // get current date
    let today = new Date(),
        dateString = today.toISOString().substr(0, 10);
    if (this.DecryptedDate < dateString) {
      this.ValidationStatus = ELS.Expired;
      logResult(this);
      return [this.ValidationStatus, RealLicense];
    }
    // ******* MATCH MAIL ACCOUNT  ********
    // check mail accounts for setting
    // if not found return MailNotConfigured
    
    let isMatched = false, 
        iAccount=0,
        isDbgAccounts = prefs.isDebugOption('premium.licenser'),
        hasDefaultIdentity = false,
        myAccounts = this.Accounts,
        ForceSecondaryMail = prefs.getBoolPref('licenser.forceSecondaryIdentity');
    if (ForceSecondaryMail) {
      // switch for secondary email licensing
      this.AllowSecondaryMails = true;
    }
    else {
      for (let a=0; a < myAccounts.length; a++) { 
        if (myAccounts[a].defaultIdentity) {
          hasDefaultIdentity = true;
          break;
        }
      }
      if (!hasDefaultIdentity) {
        this.AllowSecondaryMails = true;
        util.logDebug("Premium License Check: There is no account with default identity!\n" +
                      "You may want to check your account configuration as this might impact some functionality.\n" + 
                      "Allowing use of secondary email addresses...");
      }
    }
    let licensedMail = this.DecryptedMail.toLowerCase();
    for (let a=0; a < myAccounts.length; a++) { 
      let ac = myAccounts[a];
      iAccount++;
      if (ac.defaultIdentity && !ForceSecondaryMail) {
        util.logDebugOptional("premium.licenser", "Iterate accounts: [" + ac.key + "] Default Identity =\n" 
          + logIdentity(ac.defaultIdentity));
				if (!ac.defaultIdentity || !ac.defaultIdentity.email)
					continue;
        if (isIdMatchedLicense(ac.defaultIdentity.email, licensedMail)) {
          isMatched = true;
          break;
        }
      }
      else {
        // allow secondary matching using override switch, but not with domain licenses
        if (!this.AllowSecondaryMails
            ||  
            quickFilters.Crypto.key_type == 1) 
          continue;  
        util.logDebugOptional("premium.licenser", "Iterate accounts: [" + ac.key + "] secondary ids");
        // ... allow using non default identities 
        let ids = ac.identities, // array of nsIMsgIdentity 
            idCount = ids ? (ids.Count ? ids.Count() : ids.length) : 0;
        util.logDebugOptional("premium.licenser", "Iterating " + idCount + " ids...");
        if (ids) {
          for (let i=0; i<idCount; i++) {
            // use ac.defaultIdentity ??
            // populate the dropdown with nsIMsgIdentity details
            let id = util.getIdentityByIndex(ids, i);
            if (!id || !id.email) {
              util.logDebugOptional("premium.licenser", "Invalid nsIMsgIdentity: " + i);
              continue;
            }
            let matchMail = id.email.toLocaleLowerCase();
            if (isDbgAccounts) {
              util.logDebugOptional("premium.licenser", 
                "Account[" + ac.key + "], Identity[" + i + "] = " + logIdentity(id) +"\n"
                + "Email: [" + matchMail + "]");
            }
            if (isIdMatchedLicense(matchMail, licensedMail)) {
              isMatched = true;
              break;
            }
          }
          if (isMatched) break;
        }     
      }
    }
    if (!isMatched) {
      this.ValidationStatus = ELS.MailNotConfigured;
    }
    else {
      util.logDebug ("validateLicense() - successful.");
      this.ValidationStatus = ELS.Valid;
    }
    logResult(this);
    return [this.ValidationStatus, RealLicense];
  },
  
  /*** for test only, will be removed **/
  encryptLicense: function encryptLicense(LicenseKey, maxDigits) {
    quickFilters.Util.logDebug ('encryptLicense - initialising with maxDigits = ' + maxDigits);
    quickFilters.RSA.initialise(maxDigits);
    // 64bit key pair
    quickFilters.Util.logDebug ('encryptLicense - creating key pair object, bit length = ' + this.RSA_keylength);
    let key = new quickFilters.RSA.RSAKeyPair(
      this.RSA_encryption,
      this.RSA_decryption,
      this.RSA_modulus,
      this.RSA_keylength
    );
    quickFilters.Util.logDebug ('encryptLicense - starting encryption...');
    let Encrypted = quickFilters.RSA.encryptedString(key, LicenseKey, 'OHDave');
    quickFilters.Util.logDebug ('encryptLicense - finished encrypting registration key of length: ' + Encrypted.length + '\n'
      + Encrypted);
    return Encrypted;
    
  }

};



