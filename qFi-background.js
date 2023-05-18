import * as util from "./scripts/qi-util.mjs.js";
import {Licenser} from "./scripts/Licenser.mjs.js";

var currentLicense;
var startupFinished = false;
var callbacks = [];
// Worker.FilterMode
var AssistantActive = false;

//TODO: textbox in CSS, search box??
//TODO mailWindowOverlay: was never in use??
//debugger;
messenger.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
  let isDebug = await messenger.LegacyPrefs.getPref("extensions.quickfilters.debug");
  
  // Wait until the main startup routine has finished!
  await new Promise((resolve) => {
    if (startupFinished) {
      if (isDebug) console.log("quickFilters - startup code finished.");
      // Looks like we missed the one send by main()
      resolve();
    }
    callbacks.push(resolve);
  });
  if (isDebug) {
    console.log("Startup has finished");
    console.log("quickFilters - currentLicense", currentLicense);
  }
  
  
  // if (temporary) return; // skip during development
  switch (reason) {
    case "install":
    {
      if (isDebug) console.log("quickFilters onInstalled Listener - install...");
      let url = browser.runtime.getURL("popup/installed.html");
      await browser.windows.create({ url, type: "popup", width: 900, height: 750, });
    }
      break;
    // see below
    case "update":
    {
      // set a flag which will be cleared by clicking the [quickFilters assistant] button once
      setTimeout(
        async function() {
          let origVer = await messenger.LegacyPrefs.getPref("extensions.quickfilters.installedVersion","0");
          const manifest = await messenger.runtime.getManifest();
          let installedVersion = manifest.version.replace(/pre.*/,""); 
          if (installedVersion > origVer) {
            // only show news if major or minor version have changed:
            messenger.LegacyPrefs.setPref("extensions.quickfilters.hasNews", true);
            // we need to move this to local Storage so that it will be removed if the Add-on is removed.
          }
          messenger.NotifyTools.notifyExperiment({event: "updatequickFiltersLabel"});
        },
        200
      ); 
      
    }
      break;
    default:
      messenger.NotifyTools.notifyExperiment({event: "updatequickFiltersLabel"});
      break;
  }
});



function showSplash() {
  // alternatively display this info in a tab with browser.tabs.create(...)  
  let url = browser.runtime.getURL("popup/update.html");
  let screenH = window.screen.height,
      windowHeight = (screenH > 870) ? 870 : screenH;  
  browser.windows.create({ url, type: "popup", width: 1000, height: windowHeight, allowScriptsToClose: true,});
}

async function main() {
  const legacy_root = "extensions.quickfilters.";
  // load defaults
  messenger.WindowListener.registerDefaultPrefs("chrome/content/scripts/quickFilter-prefs.js");
  
  let key = await messenger.LegacyPrefs.getPref(legacy_root + "LicenseKey"),
      forceSecondaryIdentity = await messenger.LegacyPrefs.getPref(legacy_root + "licenser.forceSecondaryIdentity"),
      isDebug = await messenger.LegacyPrefs.getPref(legacy_root + "debug"),
      isDebugLicenser = await messenger.LegacyPrefs.getPref(legacy_root + "debug.premium.licenser");

  currentLicense = new Licenser(key, { forceSecondaryIdentity, debug: isDebugLicenser });
  await currentLicense.validate();

  // All important stuff has been done.
  // resolve all promises on the stack
  if (isDebug) console.log("Finished setting up license startup code");
  callbacks.forEach(callback => callback());
  startupFinished = true;
  
  // listeners for splash pages
  messenger.runtime.onMessage.addListener(async (data, sender) => {
    if (data.command) {
      switch (data.command) {
        case "getLicenseInfo": 
          return currentLicense.info;
      }
    }
  });
    
  messenger.NotifyTools.onNotifyBackground.addListener(async (data) => {
    let isLog = await messenger.LegacyPrefs.getPref(legacy_root + "debug.notifications");
    if (isLog && data.func) {
      console.log ("=========================\n" +
                   "BACKGROUND LISTENER received: " + data.func + "\n" +
                   "=========================");
    }
    switch (data.func) {
      case "slideAlert":
        util.slideAlert(...data.args); // title, text, [icon]
        break;
        
      case "splashScreen":
        showSplash();
        break;
      
      case "getLicenseInfo": 
        return currentLicense.info;
      
      case "getPlatformInfo": 
        return messenger.runtime.getPlatformInfo();

      case "getBrowserInfo": 
        return messenger.runtime.getBrowserInfo();

      case "getAddonInfo": 
        return messenger.management.getSelf();
        
      case "getAssistantMode":  // is assistant active or not?
        return AssistantActive; // replaced worker.FilterMode, it's stored here and updated through Util
        
      case "setAssistantMode":  // toggle "FilterMode"
        AssistantActive = data.active;
        messenger.NotifyTools.notifyExperiment({event: "setAssistantMode", detail: {active: AssistantActive} });
        break;        
        
      // future use - update all toolbar buttons for assistant state
      case "updateToolbars":
        messenger.NotifyTools.notifyExperiment({event: "updateToolbars"});
        break;
        
      case "setAssistantButton":
        messenger.NotifyTools.notifyExperiment({event: "setAssistantButton", detail: {active: data.active} });
        break;
        
      case "setupListToolbar":
        messenger.NotifyTools.notifyExperiment({event: "setupListToolbar"});
        break;
        
      case "toggleCurrentFolderButtons":
        messenger.NotifyTools.notifyExperiment({event: "toggleCurrentFolderButtons"});
        break;
        
      case "updatequickFiltersLabel":
        messenger.NotifyTools.notifyExperiment({event: "updatequickFiltersLabel"});
        break;
        
      case "updateLicense":
        let forceSecondaryIdentity = await messenger.LegacyPrefs.getPref(legacy_root + "licenser.forceSecondaryIdentity"),
            isDebugLicenser = await messenger.LegacyPrefs.getPref(legacy_root + "debug.premium.licenser");
            
        // we create a new Licenser object for overwriting, this will also ensure that key_type can be changed.
        let newLicense = new Licenser(data.key, { forceSecondaryIdentity, debug: isDebugLicenser });
        await newLicense.validate();
        // Check new license and accept if ok.
        // You may return values here, which will be send back to the caller.
        // return false;
        
        // Update background license.
        await messenger.LegacyPrefs.setPref(legacy_root + "LicenseKey", newLicense.info.licenseKey);
        currentLicense = newLicense;
        // Broadcast -without event is used for the licenser.
        messenger.NotifyTools.notifyExperiment({licenseInfo: currentLicense.info});
        messenger.NotifyTools.notifyExperiment({event: "updatequickFiltersLabel"});
        return true;
    }
  });
  
    
  messenger.runtime.onMessageExternal.addListener( async  (message, sender) =>  
  {
    switch(message.command) {
      case "injectButtonsQFNavigationBar":
        // call the code for injecting the toolbar buttons that integrate with QF current folder bar
        // this is called from onLoad in qFi-messenger.js
        if (isDebug) {
          console.log("received external message 'injectButtonsQFNavigationBar'", message);
        }
        messenger.NotifyTools.notifyExperiment({event: "toggleCurrentFolderButtons"});
        break;
    }
  });
      
    
  messenger.WindowListener.registerChromeUrl([ 
        ["content", "quickfilters", "chrome/content/"],
        ["locale",  "quickfilters", "en",    "chrome/locale/en/"],
        ["locale",  "quickfilters", "de",    "chrome/locale/de/"],
        ["locale",  "quickfilters", "es",    "chrome/locale/es/"],
        ["locale",  "quickfilters", "es-AR", "chrome/locale/es-AR/"],
        ["locale",  "quickfilters", "fr",    "chrome/locale/fr/"],
        ["locale",  "quickfilters", "it",    "chrome/locale/it/"],
        ["locale",  "quickfilters", "ja",    "chrome/locale/ja/"],
        ["locale",  "quickfilters", "nl",    "chrome/locale/nl/"],
        ["locale",  "quickfilters", "ru",    "chrome/locale/ru/"],
        ["locale",  "quickfilters", "sv",    "chrome/locale/sv/"],
        ["locale",  "quickfilters", "vi",    "chrome/locale/vi/"],
        ["locale",  "quickfilters", "zh-CN", "chrome/locale/zh-CN/"]
    
      ]);
 
  messenger.WindowListener.registerOptionsPage("chrome://quickfilters/content/quickFilters-options.xhtml"); 
   
    
 //attention: each target window (like messenger.xul) can appear only once
 // this is different from chrome.manifest
 // xhtml for Tb78
  messenger.WindowListener.registerWindow("chrome://messenger/content/messenger.xhtml", "chrome/content/scripts/qFi-messenger.js");
  messenger.WindowListener.registerWindow("chrome://messenger/content/customizeToolbar.xhtml", "chrome/content/scripts/qFi-customizetoolbar.js");
  messenger.WindowListener.registerWindow("chrome://messenger/content/FilterEditor.xhtml", "chrome/content/scripts/qFi-filterEditor.js");
  messenger.WindowListener.registerWindow("chrome://messenger/content/FilterListDialog.xhtml", "chrome/content/scripts/qFi-filterlist.js");
    
  // how to add a click event
  // browser.actionButton.onClicked.addListener(() => { …. });
  
 /*
  * Start listening for opened windows. Whenever a window is opened, the registered
  * JS file is loaded. To prevent namespace collisions, the files are loaded into
  * an object inside the global window. The name of that object can be specified via
  * the parameter of startListening(). This object also contains an extension member.
  */
  messenger.WindowListener.startListening();
  
  let browserInfo = await messenger.runtime.getBrowserInfo();
  function getThunderbirdVersion() {
    let parts = browserInfo.version.split(".");
    return {
      major: parseInt(parts[0]),
      minor: parseInt(parts[1]),
      revision: parts.length > 2 ? parseInt(parts[2]) : 0,
    }
  }  
  let tbVer = getThunderbirdVersion();
  
  // [issue 125] Exchange account validation
  if (tbVer.major>=98) {
    messenger.accounts.onCreated.addListener( async(id, account) => {
      if (currentLicense.info.status == "MailNotConfigured") {
        // redo license validation!
        if (isDebugLicenser) console.log("Account added, redoing license validation", id, account); // test
        currentLicense = new Licenser(key, { forceSecondaryIdentity, debug: isDebugLicenser });
        await currentLicense.validate();
        if(currentLicense.info.status != "MailNotConfigured") {
          if (isDebugLicenser) console.log("notify experiment code of new license status: " + currentLicense.info.status);
          messenger.NotifyTools.notifyExperiment({licenseInfo: currentLicense.info});
        }
        if (isDebugLicenser) console.log("quickFilters license info:", currentLicense.info); // test
      }
      else {
        if (isDebugLicenser) console.log("quickFilters license state after adding account:", currentLicense.info)
      }
    });
  }  
  

}

main();
