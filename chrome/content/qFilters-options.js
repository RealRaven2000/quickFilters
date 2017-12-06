"use strict";

/* BEGIN LICENSE BLOCK

for detail, please refer to license.txt in the root folder of this extension

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 3
of the License, or (at your option) any later version.

If you use large portions of the code please attribute to the authors
(Axel Grude)

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You can download a copy of the GNU General Public License at
http://www.gnu.org/licenses/gpl-3.0.txt or get a free printed
copy by writing to:
  Free Software Foundation, Inc.,
  51 Franklin Street, Fifth Floor,
  Boston, MA 02110-1301, USA.
  
END LICENSE BLOCK 
*/

Components.utils.import('resource://gre/modules/Services.jsm');

quickFilters.Options = {
	optionsMode : "",  // filter out certain pages (for support / help only)
  load: function() {
		const util = quickFilters.Util,
		      prefs = quickFilters.Preferences,
					licenser = util.Licenser,					
					getElement = window.document.getElementById.bind(window.document);
					
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
    let buyLabel = util.getBundleString("quickfilters.notification.premium.btn.getLicense", "Buy License!");

    getElement("btnLicense").label = buyLabel;
    // validate License key
    licenser.LicenseKey = prefs.getStringPref('LicenseKey');
    getElement('txtLicenseKey').value = licenser.LicenseKey;
    if (licenser.LicenseKey) {
      this.validateLicenseInOptions(false);
    }
		
		
		// no donation loophoole
		let donateButton = document.documentElement.getButton('extra2');
		if (donateButton) {
			donateButton.addEventListener("click", 
				function(evt) { 
					quickFilters.Util.logDebugOptional("default", "donateButton event:\n" + evt.toString());
					if(evt.button == 2) {
						quickFilters.Util.toggleDonations();
						evt.preventDefault();
						evt.stopPropagation();
					}; }, false);
		}		
    let getCopyBtn = getElement('getCopySentToCurrent');
    let getCopyText = quickFilters.Util.getBundleString('quickfilters.button.getOtherAddon','Get {1}');
    getCopyBtn.textContent = getCopyText.replace('{1}','\'Copy Sent to Current\'');
  } ,
  
  toggleBoolPreference: function(cb, noUpdate) {
    let prefString = cb.getAttribute("preference");
    let pref = document.getElementById(prefString);
    
    if (pref)
      quickFilters.Preferences.setBoolPrefNative(pref.getAttribute('name'), cb.checked);
    if (noUpdate)
      return true;
    return false // this.updateMainWindow();
  },
  
  showAboutConfig: function(clickedElement, filter, readOnly) {

    const name = "Preferences:ConfigManager";
    const uri = "chrome://global/content/config.xul";

    let mediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    let w = mediator.getMostRecentWindow(name);

    let win = clickedElement ?
		          (clickedElement.ownerDocument.defaultView ? clickedElement.ownerDocument.defaultView : window)
							: window;
    if (!w) {
      let watcher = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher);
      w = watcher.openWindow(win, uri, name, "dependent,chrome,resizable,centerscreen,alwaysRaised,width=500px,height=350px", null);
    }
    w.focus();
    w.addEventListener('load', 
      function () {
        let flt = w.document.getElementById("textbox");
        if (flt) {
          flt.value=filter;
          // make filter box readonly to prevent damage!
          if (!readOnly)
            flt.focus();
          else
            flt.setAttribute('readonly',true);
          if (w.self.FilterPrefs) {
            w.self.FilterPrefs();
          }
        }
      });
  },

  addConfigFeature: function(filter, Default, textPrompt) {
    // adds a new boolean option to about:config, that isn't there by default
    if (confirm(textPrompt)) {
      // create (non existent filter setting:
      quickFilters.Preferences.setBoolPrefNative(filter, Default);

      // last parameter is Readonly.
      quickFilters.Options.showAboutConfig(null, filter, true); 
    }

  },
  
  sendMail: function(mailto)  {
    const Ci = Components.interfaces, 
          Cc = Components.classes;
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
    setTimeout(function() {quickFilters.toggleCurrentFolderButtons();},200);
  } ,
	
  trimLicense: function trimLicense() {
		const util = quickFilters.Util;
    let txtBox = document.getElementById('txtLicenseKey'),
        strLicense = txtBox.value.toString();
    util.logDebug('trimLicense() : ' + strLicense);
    strLicense = strLicense.replace(/^\s+|\s+$/g, ''); // remove line breaks
    strLicense = strLicense.replace('\[at\]','@');
    txtBox.value = strLicense;
    util.logDebug('trimLicense() result : ' + strLicense);
    return strLicense;
  } ,
  
  enablePremiumConfig: function enablePremiumConfig(isEnabled) {
		/* future function: enables premium configuration UI
    let getElement      = document.getElementById.bind(document),
        premiumConfig   = getElement('premiumConfig'),
        quickJump       = getElement('chkQuickJumpHotkey'),
        quickMove       = getElement('chkQuickMoveHotkey'),
        quickCopy       = getElement('chkQuickCopyHotkey'),
        quickJumpTxt    = getElement('qf-QuickJumpShortcut'),
        quickMoveTxt    = getElement('qf-QuickMoveShortcut'),
        quickCopyTxt    = getElement('qf-QuickCopyShortcut'),
        quickMoveFormat = getElement('menuQuickMoveFormat'),
        quickMoveDepth  = getElement('quickmove-path-depth'),
        multiCategories = getElement('chkCategories');
    premiumConfig.disabled = !isEnabled;
    quickJump.disabled = !isEnabled;
    quickMove.disabled = !isEnabled;
    quickCopy.disabled = !isEnabled;
    quickJumpTxt.disabled = !isEnabled;
    quickMoveTxt.disabled = !isEnabled;
    quickCopyTxt.disabled = !isEnabled;
    quickMoveFormat.disabled = !isEnabled;
    quickMoveDepth.disabled = !isEnabled;
    multiCategories.disabled = !isEnabled;
		*/
  },
  
  decryptLicense: function decryptLicense(testMode) {
		const util = quickFilters.Util,
		      licenser = util.Licenser,
					State = licenser.ELicenseState;
    let getElement = document.getElementById.bind(document),
        validationPassed       = getElement('validationPassed'),
        validationFailed       = getElement('validationFailed'),
        validationExpired      = getElement('validationExpired'),
        validationInvalidEmail = getElement('validationInvalidEmail'),
        validationEmailNoMatch = getElement('validationEmailNoMatch'),
        decryptedMail, decryptedDate,
				result = State.NotValidated;
    validationPassed.collapsed = true;
    validationFailed.collapsed = true;
    validationExpired.collapsed = true;
    validationInvalidEmail.collapsed = true;
    validationEmailNoMatch.collapsed = true;
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
          validationFailed.collapsed=false;
          break;
        case State.Expired:
          validationExpired.collapsed=false;
          break;
        case State.MailNotConfigured:
          validationInvalidEmail.collapsed=false;
          // if mail was already replaced the string will contain [mail address] in square brackets
          validationInvalidEmail.textContent = validationInvalidEmail.textContent.replace(/\[.*\]/,"{1}").replace("{1}", '[' + decryptedMail + ']');
          break;
        case State.MailDifferent:
          validationFailed.collapsed=false;
          validationEmailNoMatch.collapsed=false;
          break;
        default:
          Services.prompt.alert(null,"quickFilters",'Unknown license status: ' + result);
          break;
      }
      if (testMode) {
      //  getElement('txtEncrypt').value = 'Date = ' + decryptedDate + '    Mail = ' +  decryptedMail +  '  Result = ' + result;
      }
      else {
        // reset License status of main instance
        if (window.arguments && window.arguments[1].inn.instance) {
          let mainLicenser = window.arguments[1].inn.instance.Licenser;
          if (mainLicenser) {
            mainLicenser.ValidationStatus =
              result != State.Valid ? State.NotValidated : result;
            mainLicenser.wasValidityTested = true; // no need to re-validate there
          }
        }
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
    if (strLength.value) {
      if (str) {
        let pastetext = str.value.QueryInterface(Components.interfaces.nsISupportsString).data,
            txtBox = document.getElementById('txtLicenseKey'),
            strLicense = pastetext.toString();
        txtBox.value = strLicense;
        finalLicense = this.trimLicense();
      }    
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
					State = util.Licenser.ELicenseState,
					QI = util.getMail3PaneWindow().quickFilters.Interface; // main window (for reminders etec)
    let wd = window.document,
        getElement = wd.getElementById.bind(wd),
        btnLicense = getElement("btnLicense"),
				proTab = getElement("quickFilters-Pro"),
				beautyTitle = getElement("qf-title");
    try {
			let result = this.decryptLicense(testMode);
			switch(result) {
				case State.Valid:
				  btnLicense.collapsed = true;
					replaceCssClass(proTab, 'paid');
					replaceCssClass(btnLicense, 'paid');
					beautyTitle.setAttribute('src', "chrome://quickfilters/skin/QuickFilters-title-pro.png");
				  break;
				case State.Expired:
					btnLicense.label = util.getBundleString("quickfilters.notification.premium.btn.renewLicense", "Renew License!");
				  btnLicense.collapsed = false;
					replaceCssClass(proTab, 'expired');
					replaceCssClass(btnLicense, 'expired');
					beautyTitle.setAttribute('src', "chrome://quickfilters/skin/QuickFilters-title-pro.png");
					break;
				default:
				  btnLicense.collapsed = false;
					replaceCssClass(proTab, 'free');
				  btnLicense.label = util.getBundleString("quickfilters.notification.premium.btn.getLicense", "Buy License!");
			}
			util.logDebug('validateLicense - result = ' + result);
    }
    catch(ex) {
      util.logException("Error in quickFilters.Options.validateLicenseInOptions():\n", ex);
    }
  } 
  
	

}