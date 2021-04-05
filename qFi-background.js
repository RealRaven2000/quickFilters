/*
 * Documentation:
 * https://github.com/thundernest/addon-developer-support/wiki/Using-the-WindowListener-API-to-convert-a-Legacy-Overlay-WebExtension-into-a-MailExtension-for-Thunderbird-78
 */

async function main() {

//TODO: textbox in CSS, search box??
//TODO mailWindowOverlay: was never in use??
//debugger;
  messenger.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
    console.log("onInstalled - Listener(reason: " + reason + ")");
    // if (temporary) return; // skip during development
    switch (reason) {
      case "install":
      {
        console.log("install...");
        let url = browser.runtime.getURL("popup/installed.html");
        //await browser.tabs.create({ url });
        await browser.windows.create({ url, type: "popup", width: 900, height: 750, });
      }
      break;
      // see below
      case "update":
      {
        const mxUtilties = messenger.Utilities;
        let isLicensed = await mxUtilties.isLicensed(true);
        if (isLicensed) {
          // suppress update popup for users with licenses that have been recently renewed
          let gpdays = await mxUtilties.LicensedDaysLeft();
          console.log("Licensed - " + gpdays  + " Days left.");
          if (gpdays>40) {
            console.log("Omitting update popup!");
            return;
          }
        }
        
        let url = browser.runtime.getURL("popup/update.html");
        //await browser.tabs.create({ url });
        let screenH = window.screen.height,
            windowHeight = (screenH > 870) ? 870 : screenH;
        await browser.windows.create({ url, type: "popup", width: 850, height: windowHeight, });
      }
      break;
    // see below
    }
  });
      
  // load defaults
  messenger.WindowListener.registerDefaultPrefs("chrome/content/scripts/quickFilter-prefs.js");
    
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
        ["locale",  "quickfilters", "sv-SE", "chrome/locale/sv-SE/"],
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
    
 /*
  * Start listening for opened windows. Whenever a window is opened, the registered
  * JS file is loaded. To prevent namespace collisions, the files are loaded into
  * an object inside the global window. The name of that object can be specified via
  * the parameter of startListening(). This object also contains an extension member.
  */


    messenger.WindowListener.startListening();
}

main();
