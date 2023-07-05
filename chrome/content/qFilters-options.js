"use strict";

/* 
BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK 
*/

var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

quickFilters.Options = {
	optionsMode : "",  // filter out certain pages (for support / help only)
  load: async function() {
		const util = quickFilters.Util,
		      prefs = quickFilters.Preferences,
          options = quickFilters.Options,
					getElement = window.document.getElementById.bind(window.document),
					nsMsgFilterType = Components.interfaces.nsMsgFilterType;
          
    await quickFilters.Util.init();
    quickFilters.Options.updateLicenseOptionsUI();
					
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
    
    getElement('txtLicenseKey').value = quickFilters.Util.licenseInfo.licenseKey;
    if (quickFilters.Util.licenseInfo.licenseKey) {
      this.validateLicenseInOptions();
    }
    // add an event listener for changes:
    window.addEventListener("quickFilters.BackgroundUpdate", this.validateLicenseInOptions.bind(this));
    
		
    let getCopyBtn = getElement('getCopySentToCurrent'),
        getCopyText = quickFilters.Util.getBundleString('quickfilters.button.getOtherAddon','Get {1}');
    getCopyBtn.textContent = getCopyText.replace('{1}','\'Copy Sent to Current\'');
    
    options.configExtra2Button();		
		let panels = getElement('quickFilters-Panels');
		panels.addEventListener('select', function(evt) { quickFilters.Options.onTabSelect(panels,event); } );
		
    // dialog buttons are in a shadow DOM which needs to load its own css.
    // https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM
    let linkEl = document.createElement("link");
    linkEl.setAttribute("href", "chrome://quickfilters/content/contribute.css");
    linkEl.setAttribute("type", "text/css");
    linkEl.setAttribute("rel", "stylesheet");
    document.documentElement.shadowRoot.appendChild(linkEl);

    // [issue 92] allow premature extension
    getElement("licenseDate").addEventListener("click", options.showExtensionButton);
    
    // add tooltips:
    for (let node of document.querySelectorAll(".helpLink[clickyTooltip]")) {
      node.addEventListener("click",
        (event) => {
          window.quickFilters.Util.openTooltipPopup(node);
        }
      );    
    } 

    getElement("chkReplyTo").addEventListener("click", 
      function(evt) { 
        if (evt.target.checked) {
          quickFilters.Util.promptToRestart(); 
        }
      } 
    );
    
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
        title = quickFilters.Util.getBundleString('quickfilters.prompt.contact.title', "Contact quickFilters Support"),
        text = quickFilters.Util.getBundleString('quickfilters.prompt.contact.subject', "Please enter a short subject line:"),
        input = {value: ""},
        check = {value: false},
        result = Services.prompt.prompt(window, title, text, input, null, check); 
    if (!result) return;
  
    let sURL="mailto:" + mailto + "?subject=[quickFilters]" + encodeURI(" " + input.value), // urlencode
        // make the URI
        ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService),
        aURI = ioService.newURI(sURL, null, null);
    // open new message
    MailServices.compose.OpenComposeWindowWithURI (null, aURI);
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
        chkMultiPaste = getElement('chkMultiPaste'),
        newCustomFilter = getElement('newCustomFilter'),
        chkNotifyRunFilter = getElement('chkNotifyRunFilter');
    chkLocalFoldersAutorun.disabled = !isEnabled;
    chkFoldersShortcut.disabled = !isEnabled;
    chkMailsShortcut.disabled = !isEnabled;
    chkMultiPaste.disabled = !isEnabled;
    newCustomFilter.disabled = !isEnabled;
    chkNotifyRunFilter.disabled = !isEnabled;
    
  },
  
  // [issue 92] allow license extension
  // show the extension button if user is elligible
  showExtensionButton: function() {
    if (quickFilters.Util.licenseInfo.status == "Valid") {
      if (quickFilters.Util.licenseInfo.keyType!=2) { // PRO + Domain
        let btnLicense = document.getElementById("btnLicense");
        quickFilters.Options.labelLicenseBtn(btnLicense, "extend");
      }
      else { // standard function - go to License screen to upgrade!
        quickFilters.Util.showLicenseDialog("licenseTab");  
      }
    }
  },  
  
  updateLicenseOptionsUI: function updateLicenseOptionsUI() {
		const util = quickFilters.Util;
    let getElement = document.getElementById.bind(document),
        validationPassed       = getElement('validationPassed'),
        validationFailed       = getElement('validationFailed'),
				validationInvalidAddon = getElement('validationInvalidAddon'),
        validationExpired      = getElement('validationExpired'),
        validationInvalidEmail = getElement('validationInvalidEmail'),
        validationEmailNoMatch = getElement('validationEmailNoMatch'),
				validationDate         = getElement('validationDate'),
        decryptedMail = quickFilters.Util.licenseInfo.email , 
        decryptedDate = quickFilters.Util.licenseInfo.expiryDate,
				result = quickFilters.Util.licenseInfo.status;
    validationPassed.collapsed = true;
    validationFailed.collapsed = true;
		validationInvalidAddon.collapsed = true;
    validationExpired.collapsed = true;
    validationInvalidEmail.collapsed = true;
    validationEmailNoMatch.collapsed = true;
		validationDate.collapsed = false;
    this.enablePremiumConfig(false);
    try {
      let licenseDate = getElement("licenseDate");
      licenseDate.value = decryptedDate; 
      switch(result) {
        case "Valid":
          this.enablePremiumConfig(true);
          validationPassed.collapsed=false;
          licenseDate.classList.add('valid'); // [issue 92]
          break;
        case "Invalid":
				  validationDate.collapsed=true;
				  let addonName = '';
				  switch (quickFilters.Util.licenseInfo.licenseKey.substr(0,2)) {
						case "QF":
						case "QS":
							addonName = "QuickFolders";
						  break;
						case "ST":
						case "S1":
							addonName = "SmartTemplate4";
						  break;
						case "QI":
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
        case "Expired":
          validationExpired.collapsed=false;
          break;
        case "MailNotConfigured":
					validationDate.collapsed=true;
          validationInvalidEmail.collapsed=false;
          // if mail was already replaced the string will contain [mail address] in square brackets
          validationInvalidEmail.textContent = validationInvalidEmail.textContent.replace(/\[.*\]/,"{1}").replace("{1}", '[' + decryptedMail + ']');
          break;
        case "MailDifferent":
          validationFailed.collapsed=false;
          validationEmailNoMatch.collapsed=false;
          break;
        case "Empty":
          validationDate.collapsed=true;
          break;
        default:
					validationDate.collapsed=true;
          Services.prompt.alert(null,"quickFilters",'Unknown license status: ' + result);
          break;
      }
    }    
    catch(ex) {
      util.logException("Error in quickFilters.Options.decryptLicense():\n", ex);
    }
		return result;
  } ,
  
  validateNewKey: async function validateNewKey() {
    this.trimLicense();
    let rv = await quickFilters.Util.notifyTools.notifyBackground({ func: "updateLicense", key: document.getElementById("txtLicenseKey").value });
    // The background script will validate the new key and send a broadcast to all consumers on sucess.
    // In this script, the consumer is onBackgroundUpdate.
  },
  
  pasteLicense: function pasteLicense() {
    let trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable),
        str       = {},
        strLength = {},
        finalLicense = '';        
    trans.init(null);
    trans.addDataFlavor("text/unicode");
    trans.addDataFlavor("text/plain");
    Services.clipboard.getData(trans, Services.clipboard.kGlobalClipboard);

    trans.getTransferData("text/plain", str, strLength);
		if (str && (strLength.value || str.value)) {
			let pastetext = str.value.QueryInterface(Components.interfaces.nsISupportsString).data,
					txtBox = document.getElementById('txtLicenseKey'),
					strLicense = pastetext.toString();
			txtBox.value = strLicense;
			finalLicense = this.trimLicense();
		}    
    this.validateNewKey();
  } ,
  
  validateLicenseInOptions: function validateLicenseInOptions(testMode) {
		function replaceCssClass(el,addedClass) {
			el.classList.add(addedClass);
			if (addedClass!='paid')	el.classList.remove('paid');
			if (addedClass!='expired')	el.classList.remove('expired');
			if (addedClass!='free')	el.classList.remove('free');
		}
		const util = quickFilters.Util,
					options = quickFilters.Options; 
    let wd = window.document,
        getElement = wd.getElementById.bind(wd),
        btnLicense = getElement("btnLicense"),
				proTab = getElement("quickFilters-Pro"),
        titleContainer = getElement("qf-options-header"),
				beautyTitle = getElement("qf-title");
    try {
      // old call to decryptLicense was here
      // 1 - sanitize License
      // 2 - validate license
      // 3 - update options ui with reaction messages; make expiry date visible or hide!; 
      this.updateLicenseOptionsUI(); // async!
      
      // do any notifications for background
      
      
			let result = quickFilters.Util.licenseInfo.status;
			switch(result) {
				case "Valid":
					let today = new Date(),
					    later = new Date(today.setDate(today.getDate()+30)), // pretend it's a month later:
							dateString = later.toISOString().substr(0, 10);
					// if we were a month ahead would this be expired?
					if (quickFilters.Util.licenseInfo.expiryDate < dateString) {
						options.labelLicenseBtn(btnLicense, "extend");
					}
					else
				  	btnLicense.collapsed = true;
					replaceCssClass(proTab, 'paid');
					replaceCssClass(btnLicense, 'paid');
          titleContainer.classList.add("pro");
				  break;
				case "Expired":
					options.labelLicenseBtn(btnLicense, "renew");
					replaceCssClass(proTab, 'expired');
					replaceCssClass(btnLicense, 'expired');
				  btnLicense.collapsed = false;
          titleContainer.classList.add("pro");
					break;
				default:
					options.labelLicenseBtn(btnLicense, "buy");
				  btnLicense.collapsed = false;
					replaceCssClass(proTab, 'free');
          titleContainer.classList.remove("pro");
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
		      State = quickFilters.Util.licenseInfo.status;
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
              quickFilters.Util.showLicenseDialog('licenseTab'); 
						}, 
						false);
					
				}
				else {
					switch (State) {
						case "NotValidated":
						  // options.labelLicenseBtn(donateButton, "buy"); // hide?
						  break;
						case "Expired":
						  options.labelLicenseBtn(donateButton, "renew");
						  break;
						case "Valid":
							donateButton.collapsed = true;
							break;
						case "Invalid":
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
  
  // scope = "folder" or "mails"
  configureShortcut: function configureShortcut(el, scope) {
		const prefs = quickFilters.Preferences,
		      util = quickFilters.Util;
    util.logDebug("Changing shortcut setting for run filters on " + scope);
    const win = util.getMail3PaneWindow();
    setTimeout( function() { win.quickFilters.addKeyListener(win); }, 1000); // will enable key listener if previously disabled.
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
  }   ,
  
  notifyToolbars: function() {
    // update toolbar of message list window
    quickFilters.Util.notifyTools.notifyBackground({ func: "setupListToolbar" });
  }

} // Options


window.document.addEventListener('DOMContentLoaded', 
  quickFilters.Options.l10n.bind(quickFilters.Options) , 
  { once: true });
  
window.addEventListener('load', 
  quickFilters.Options.load.bind(quickFilters.Options) , 
  { once: true });
  




