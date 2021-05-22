"use strict";

/* 
BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK 
*/

// ChromeUtils.defineModuleGetter(this, "Services", 'resource://gre/modules/Services.jsm');
var {Services} = ChromeUtils.import('resource://gre/modules/Services.jsm');

quickFilters.Options = {
	optionsMode : "",  // filter out certain pages (for support / help only)
  load: async function() {
		const util = quickFilters.Util,
		      prefs = quickFilters.Preferences,
          options = quickFilters.Options,
					licenser = util.Licenser,
					getElement = window.document.getElementById.bind(window.document),
					nsMsgFilterType = Components.interfaces.nsMsgFilterType;
          
    await quickFilters.Util.init();
					
		if (window.arguments) {
			try {
				this.optionsMode = window.arguments[1].inn.mode;
				// force selection of a certain pane (-1 ignores)
				if (this.optionsMode >= 0)
					prefs.setIntPref('lastSelectedOptionsTab', this.optionsMode);
			}
			catch(e) {;}
    }
		
		let tabbox = getElement("quickFilters-Options-Tabbox");
    switch(this.optionsMode) {
      case "actions":
        tabbox.selectedPanel = getElement('quickFilters-Options-actions');
        break;
      case "newFilter":
        tabbox.selectedPanel = getElement('quickFilters-Options-newFilterProps');
        break;
      case "advancedOnly":
        tabbox.selectedPanel = getElement('quickFilters-Options-Advanced');
        break;
      case "supportOnly":
        tabbox.selectedPanel = getElement('quickFilters-Options-support');
        break;
      case "licenseKey":
        tabbox.selectedPanel = getElement('quickFilters-Options-goPro');
        break;
    }
		if (!(nsMsgFilterType.Periodic)) {
			util.logDebug("Hiding Run Periodic box, as it doesn't exist in this version.");
			getElement("chkPeriodically").collapsed = true;
		}
		// hide the other tabs
		if (this.optionsMode) {
			for (let i=4; i>=0; i--) {
				let panel = tabbox.tabpanels.children[i];
				if (panel != tabbox.selectedPanel) {
					util.logDebugOptional('options', 'collapsing panel: ' + panel.id + '...');
					panel.collapsed = true;
					tabbox.tabs.getItemAtIndex(i).collapsed = true; // removeItemAt();
				}
			}
		}
		
    let version = util.Version;
    if (version=="") version='version?';

    let versionLabel = getElement("qf-options-version");
    versionLabel.setAttribute("value", version);
		
		let clonedLabel = getElement('txtClonedName');
    clonedLabel.placeholder = quickFilters.Util.getBundleString('quickfilters.clone.label', '(copy)');

    /*****  License  *****/
    options.labelLicenseBtn(getElement("btnLicense"), "buy");
    // validate License key
    licenser.LicenseKey = prefs.getStringPref('LicenseKey');
    getElement('txtLicenseKey').value = licenser.LicenseKey;
    if (licenser.LicenseKey) {
      this.validateLicenseInOptions(false);
    }
		
    let getCopyBtn = getElement('getCopySentToCurrent'),
        getCopyText = quickFilters.Util.getBundleString('quickfilters.button.getOtherAddon','Get {1}');
    getCopyBtn.textContent = getCopyText.replace('{1}','\'Copy Sent to Current\'');
		this.enablePremiumConfig(licenser.isValidated);
    options.configExtra2Button();		
		let panels = getElement('quickFilters-Panels');
		panels.addEventListener('select', function(evt) { quickFilters.Options.onTabSelect(panels,event); } );
		
  } ,
  
  l10n: function l10n() {
    // [mx-l10n]
    quickFilters.Util.localize(window, {extra2: "donate.label"}); // tooltip:  qf.label.supportWithLicense
    
    let supportLabel = document.getElementById('contactLabel'),
        supportString = quickFilters.Util.getBundleString(
          "qf.description.contactMe",
          "You can also contact me directly via email.", 
          [quickFilters.Util.ADDON_SUPPORT_MAIL]); // support email
    supportLabel.textContent = supportString;
  },

//from QF, modified
	loadPreferences: function qi_loadPreferences() {
		const util = quickFilters.Util;
		if (typeof Preferences == 'undefined') {
      util.logToConsole("Preferences is not defined - this shouldn't happen!");
      return;
		}	
		util.logDebug("loadPreferences - start:");
    
    let myprefElements = document.querySelectorAll("[preference]"),
		    foundElements = {};
		for (let myprefElement of myprefElements) {
      let legacyPrefId = myprefElement.getAttribute("preference");
			foundElements[legacyPrefId] = myprefElement;
		}

		let myprefs = document.getElementsByTagName("preference");
		if (myprefs.length) {
			let prefArray = [];
			for (let it of myprefs) {
				let p = { 
          id: it.getAttribute('name'), 
          name: it.getAttribute('name'),
          type: it.getAttribute('type') 
        };
				prefArray.push(p);
        // manually change the shortname in the preference attribute to the actual
				// preference "id" (as in the preference manager)
				foundElements[it.id].setAttribute("preference", it.getAttribute("name"));
			}
			
			
			util.logDebug("Adding " + prefArray.length + " preferences to Preferences loader…")
			if (Preferences)
				Preferences.addAll(prefArray);
		}
		util.logDebug("loadPreferences - finished.");
	} ,



  toggleBoolPreference: function(cb, noUpdate) {
    let prefString = cb.getAttribute("preference"),
        pref = document.getElementById(prefString);
    
    if (pref)
      quickFilters.Preferences.setBoolPrefNative(pref.getAttribute('name'), cb.checked);
    if (noUpdate)
      return true;
    return false // this.updateMainWindow();
  },
  

  addConfigFeature: function(filter, Default, textPrompt) {
    // adds a new boolean option to about:config, that isn't there by default
    if (confirm(textPrompt)) {
      // create (non existent filter setting:
      quickFilters.Preferences.setBoolPrefNative(filter, Default);

      // last parameter is Readonly.
      quickFilters.Util.showAboutConfig(null, filter, true); 
    }
  },
  
  sendMail: function()  {
    const Ci = Components.interfaces, 
          Cc = Components.classes,
          mailto = quickFilters.Util.ADDON_SUPPORT_MAIL;
    let optionsWin = window,
        prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService),
        title = quickFilters.Util.getBundleString('quickfilters.prompt.contact.title', "Contact quickFilters Support"),
        text = quickFilters.Util.getBundleString('quickfilters.prompt.contact.subject', "Please enter a short subject line:"),
        input = {value: ""},
        check = {value: false},
        result = prompts.prompt(window, title, text, input, null, check); 
    if (!result) return;
  
    let sURL="mailto:" + mailto + "?subject=[quickFilters]" + encodeURI(" " + input.value), // urlencode
        messageComposeService=Cc["@mozilla.org/messengercompose;1"].getService(Ci.nsIMsgComposeService),
    // make the URI
        ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService),
        aURI = ioService.newURI(sURL, null, null);
    // open new message
    messageComposeService.OpenComposeWindowWithURI (null, aURI);
    setTimeout( function() {optionsWin.close();}, 200 );
  },
    
  toggleCurrentFolderButtons_check: function toggleCurrentFolderButtons_check() {
    quickFilters.Util.notifyTools.notifyBackground({ func: "toggleCurrentFolderButtons" }); 
  } ,
	
  trimLicense: function trimLicense() {
		const util = quickFilters.Util;
    let txtBox = document.getElementById('txtLicenseKey'),
        strLicense = txtBox.value.toString();
    util.logDebug('trimLicense() : ' + strLicense);
    // Remove line breaks and extra spaces:
		let trimmedLicense =  
		  strLicense.replace(/\r?\n|\r/g, ' ') // replace line breaks with spaces
				.replace(/\s\s+/g, ' ')            // collapse multiple spaces
        .replace('\[at\]','@')
				.trim();
    txtBox.value = trimmedLicense;
    util.logDebug('trimLicense() result : ' + trimmedLicense);
    return trimmedLicense;
  } ,
  
  enablePremiumConfig: function enablePremiumConfig(isEnabled) {
    let getElement      = document.getElementById.bind(document),
        chkLocalFoldersAutorun = getElement('chkLocalFoldersAutorun'),
        chkFoldersShortcut = getElement('chkFoldersShortcut'),
        chkMailsShortcut = getElement('chkMailsShortcut'),
        chkMultiPaste = getElement('chkMultiPaste');
    chkLocalFoldersAutorun.disabled = !isEnabled;
    chkFoldersShortcut.disabled = !isEnabled;
    chkMailsShortcut.disabled = !isEnabled;
    chkMultiPaste.disabled = !isEnabled;
  },
  
  decryptLicense: function decryptLicense(testMode) {
		const util = quickFilters.Util,
		      licenser = util.Licenser,
					State = licenser.ELicenseState;
    let getElement = document.getElementById.bind(document),
        validationPassed       = getElement('validationPassed'),
        validationFailed       = getElement('validationFailed'),
				validationInvalidAddon = getElement('validationInvalidAddon'),
        validationExpired      = getElement('validationExpired'),
        validationInvalidEmail = getElement('validationInvalidEmail'),
        validationEmailNoMatch = getElement('validationEmailNoMatch'),
				validationDate         = getElement('validationDate'),
        decryptedMail, decryptedDate,
				result = State.NotValidated;
    validationPassed.collapsed = true;
    validationFailed.collapsed = true;
		validationInvalidAddon.collapsed = true;
    validationExpired.collapsed = true;
    validationInvalidEmail.collapsed = true;
    validationEmailNoMatch.collapsed = true;
		validationDate.collapsed = false;
    this.enablePremiumConfig(false);
    try {
      this.trimLicense();
      let txtBox = getElement('txtLicenseKey'),
          license = txtBox.value;
      // store new license key
      if (!testMode) // in test mode we do not store the license key!
        quickFilters.Preferences.setStringPref('LicenseKey', license);
      
      let maxDigits = quickFilters.Crypto.maxDigits, // this will be hardcoded in production 
          LicenseKey,
          crypto = licenser.getCrypto(license),
          mail = licenser.getMail(license),
          date = licenser.getDate(license);
      if (quickFilters.Preferences.isDebug) {
        let test = 
            "┌───────────────────────────────────────────────────────────────┐\n"
          + "│ quickFilters.Licenser found the following License components:\n"
          + "│ Email: " + mail + "\n"
          + "│ Date: " + date + "\n"
          + "│ Crypto: " + crypto + "\n"
          + "└───────────────────────────────────────────────────────────────┘";
        if (testMode)
          util.alert(test);
        util.logDebug(test);
      }
      if (crypto)
        [result, LicenseKey] = licenser.validateLicense(license, maxDigits);
      else { // reset internal state of object if no crypto can be found!
        result = State.Invalid;
				licenser.DecryptedDate = "";
				licenser.DecryptedMail = "";
			}
      decryptedDate = licenser.DecryptedDate;
      getElement('licenseDate').value = decryptedDate; // invalid ??
      decryptedMail = licenser.DecryptedMail;
      switch(result) {
        case State.Valid:
          this.enablePremiumConfig(true);
          validationPassed.collapsed=false;
          // test code
          // getElement('txtEncrypt').value = LicenseKey;
          break;
        case State.Invalid:
				  validationDate.collapsed=true;
				  let addonName = '';
				  switch (license.substr(0,2)) {
						case 'QF':
							addonName = 'QuickFolders';
						  break;
						case 'ST':
							addonName = 'SmartTemplate4';
						  break;
						case 'QI':
						default: 
						  validationFailed.collapsed=false;
					}
					if (addonName) {
						validationInvalidAddon.collapsed = false;
						let txt = validationInvalidAddon.textContent;
						txt = txt.replace('{0}','quickFilters').replace('{1}','QI'); // keys for {0} start with {1}
						if (txt.indexOf(addonName) < 0) {
							txt += " " + util.getBundleString("quickfilters.licenseValidation.guessAddon", "(The key above may be for {2})").replace('{2}',addonName);
						}
						validationInvalidAddon.textContent = txt;
					}
          break;
        case State.Expired:
          validationExpired.collapsed=false;
          break;
        case State.MailNotConfigured:
					validationDate.collapsed=true;
          validationInvalidEmail.collapsed=false;
          // if mail was already replaced the string will contain [mail address] in square brackets
          validationInvalidEmail.textContent = validationInvalidEmail.textContent.replace(/\[.*\]/,"{1}").replace("{1}", '[' + decryptedMail + ']');
          break;
        case State.MailDifferent:
          validationFailed.collapsed=false;
          validationEmailNoMatch.collapsed=false;
          break;
        default:
					validationDate.collapsed=true;
          Services.prompt.alert(null,"quickFilters",'Unknown license status: ' + result);
          break;
      }
      if (testMode) {
      //  getElement('txtEncrypt').value = 'Date = ' + decryptedDate + '    Mail = ' +  decryptedMail +  '  Result = ' + result;
      }
      else {
        // reset License status of main instance
				util.Licenser.ValidationStatus =
              result != State.Valid ? State.NotValidated : result;
        util.Licenser.wasValidityTested = true; // no need to re-validate there
      }
      
    }    
    catch(ex) {
      util.logException("Error in quickFilters.Options.decryptLicense():\n", ex);
    }
		return result;
  } ,
  
  pasteLicense: function pasteLicense() {
    let trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable),
        str       = {},
        strLength = {},
        finalLicense = '';        
    trans.addDataFlavor("text/unicode");
    Services.clipboard.getData(trans, Services.clipboard.kGlobalClipboard);

    trans.getTransferData("text/unicode", str, strLength);
		if (str && (strLength.value || str.value)) {
			let pastetext = str.value.QueryInterface(Components.interfaces.nsISupportsString).data,
					txtBox = document.getElementById('txtLicenseKey'),
					strLicense = pastetext.toString();
			txtBox.value = strLicense;
			finalLicense = this.trimLicense();
		}    
    if (finalLicense) {
      this.validateLicenseInOptions(false);
    }
  } ,
  
  validateLicenseInOptions: function validateLicenseInOptions(testMode) {
		function replaceCssClass(el,addedClass) {
			el.classList.add(addedClass);
			if (addedClass!='paid')	el.classList.remove('paid');
			if (addedClass!='expired')	el.classList.remove('expired');
			if (addedClass!='free')	el.classList.remove('free');
		}
		const util = quickFilters.Util,
					options = quickFilters.Options,
					State = util.Licenser.ELicenseState; // main window (for reminders etec)
    let wd = window.document,
        getElement = wd.getElementById.bind(wd),
        btnLicense = getElement("btnLicense"),
				proTab = getElement("quickFilters-Pro"),
				beautyTitle = getElement("qf-title");
    try {
			let result = this.decryptLicense(testMode);
			switch(result) {
				case State.Valid:
					let today = new Date(),
					    later = new Date(today.setDate(today.getDate()+30)), // pretend it's a month later:
							dateString = later.toISOString().substr(0, 10);
					// if we were a month ahead would this be expired?
					if (util.Licenser.DecryptedDate < dateString) {
						options.labelLicenseBtn(btnLicense, "extend");
					}
					else
				  	btnLicense.collapsed = true;
					replaceCssClass(proTab, 'paid');
					replaceCssClass(btnLicense, 'paid');
					beautyTitle.setAttribute('src', "chrome://quickfilters/content/skin/QuickFilters-title-pro.png");
				  break;
				case State.Expired:
					options.labelLicenseBtn(btnLicense, "renew");
					replaceCssClass(proTab, 'expired');
					replaceCssClass(btnLicense, 'expired');
				  btnLicense.collapsed = false;
					beautyTitle.setAttribute('src', "chrome://quickfilters/content/skin/QuickFilters-title-pro.png");
					break;
				default:
					options.labelLicenseBtn(btnLicense, "buy");
				  btnLicense.collapsed = false;
					replaceCssClass(proTab, 'free');
			}
      options.configExtra2Button();
			util.logDebug('validateLicense - result = ' + result);
    }
    catch(ex) {
      util.logException("Error in quickFilters.Options.validateLicenseInOptions():\n", ex);
    }
  } ,
	
	get currentOptionsTab() {
		let tabpanels = document.getElementById('quickFilters-Panels');
		switch (tabpanels.selectedPanel.id) {
			case 'quickFilters-Options-actions':
			  return 'actionsTab';
			case 'quickFilters-Options-newFilterProps':
			  return 'newFilterTab';
			case 'quickFilters-Options-Advanced':
			  return 'advancedTab';
			case 'quickFilters-Options-support':
				return 'supportTab';
			case 'quickFilters-Options-goPro':
			default:
			  return 'licenseTab';
		}
	},
		
  onTabSelect: function onTabSelect(element, event) {
    let el = event.target;
    if (el.selectedPanel) {
			quickFilters.Options.configExtra2Button(el);
      quickFilters.Util.logDebug('Tab Select: ' + element.id + ' selected panel = ' + el.selectedPanel.id);
    }
  },
  
	configExtra2Button: function configExtra2Button(el) {
		const prefs = quickFilters.Preferences,
		      util = quickFilters.Util,
					options = quickFilters.Options,
		      licenser = util.Licenser,
					State = licenser.ELicenseState;
		if (!document.documentElement.getButton) {
			util.logDebug("Cannot configure extra2 button, likely because this is a modern version of Thunderbird.");
			return;
		}
		let donateButton = document.documentElement.getButton('extra2');
		if(!el) el = document.getElementById("quickFilters-Panels");
		switch (el.selectedPanel.id) {
			case 'quickFilters-Options-goPro':
				donateButton.collapsed = true;
				break;
			default:
				donateButton.collapsed = false;
				if (!prefs.getStringPref('LicenseKey')) {
					options.labelLicenseBtn(donateButton, "buy");
					donateButton.addEventListener(
						"click", 
					  function(event) { 
							licenser.showDialog('licenseTab'); 
						}, 
						false);
					
				}
				else {
					switch (licenser.ValidationStatus) {
						case State.NotValidated:
						  // options.labelLicenseBtn(donateButton, "buy"); // hide?
						  break;
						case State.Expired:
						  options.labelLicenseBtn(donateButton, "renew");
						  break;
						case State.Valid:
							donateButton.collapsed = true;
							break;
						case State.Invalid:
							options.labelLicenseBtn(donateButton, "buy");
							break;
						default:
						  options.labelLicenseBtn(donateButton, "buy");
							break;
					}
					
				}
		}
	},
	
	// put appropriate label on the license button and pass back the label text as well
	labelLicenseBtn: function labelLicenseBtn(btnLicense, validStatus) {
		const prefs = quickFilters.Preferences,
		      util = quickFilters.Util;
		switch(validStatus) {
			case  "extend":
				let txtExtend = util.getBundleString("quickfilters.notification.premium.btn.extendLicense", "Extend License!");
				btnLicense.collapsed = false
				btnLicense.label = txtExtend; // text should be extend not renew
				btnLicense.setAttribute('tooltiptext',
					util.getBundleString("quickfilters.notification.premium.btn.extendLicense.tooltip", 
						"This will extend the current license date by 1 year. It's typically cheaper than a new license."));
				return txtExtend;
			case "renew":
				let txtRenew = util.getBundleString("quickfilters.notification.premium.btn.renewLicense", "Renew License!");
				btnLicense.label = txtRenew;
			  return txtRenew;
			case "buy":
				let buyLabel = util.getBundleString("quickfilters.notification.premium.btn.getLicense", "Buy License!");
				btnLicense.label = buyLabel;
			  return buyLabel;
		}
		return "";
	} ,
  
  configureShortcut: function configureShortcut(el, scope) {
		const prefs = quickFilters.Preferences,
		      util = quickFilters.Util;
    util.logDebug("Changing shortcut setting for run filters on " + scope);
    const win = util.getMail3PaneWindow();
    setTimeout( function() { win.quickFilters.addKeyListener(); }, 1000); // will enable key listener if previously disabled.
  } ,
  
  selectMergeAutoselectMergeAuto: function(checkBox) {
    // MergeSkip must be unchecked!
    if (!checkBox.checked) {  
      let chkSkip = document.getElementById('chkMergeSkip');
      chkSkip.checked = false;
      quickFilters.Preferences.setBoolPref("merge.silent", false);
    }
  
  } ,
  
  selectMergeSkip: function selectMergeSkip(checkBox) {
    // MergeAuto must be checked!
    if (checkBox.checked) {   
      let chkMerge = document.getElementById('chkMergeAuto');
      chkMerge.checked = true;
      quickFilters.Preferences.setBoolPref("merge.autoSelect", true);
    }
  }   

} // Options


window.document.addEventListener('DOMContentLoaded', 
  quickFilters.Options.l10n.bind(quickFilters.Options) , 
  { once: true });
  
window.addEventListener('load', 
  quickFilters.Options.load.bind(quickFilters.Options) , 
  { once: true });
  




