/*
 * Documentation:
 * https://github.com/thundernest/addon-developer-support/wiki/Using-the-WindowListener-API-to-convert-a-Legacy-Overlay-WebExtension-into-a-MailExtension-for-Thunderbird-78
 */

async function main() {

//TODO: textbox in CSS, search box??

  messenger.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
      
    // if (temporary) return; // skip during development
    switch (reason) {
      case "install":
      {
        let url = browser.runtime.getURL("popup/installed.html");
        //await browser.tabs.create({ url });
        await browser.windows.create({ url, type: "popup", width: 910, height: 750, });
      }
      break;
      // see below
      case "update":
      {
        let url = browser.runtime.getURL("popup/update.html");
        //await browser.tabs.create({ url });
        await browser.windows.create({ url, type: "popup", width: 910, height: 750, });
      }
      break;
    // see below
    }
  });
   
      
      
      
   





//    messenger.WindowListener.registerDefaultPrefs("chrome/content/scripts/quickfoldersDefaults.js");
    
    messenger.WindowListener.registerChromeUrl([ 
        ["content", "quickfilters", "chrome/content/"],
        ["locale", "quickfilters", "en", "chrome/locale/en/"],
//        ["locale", "quickfolders", "ca", "chrome/locale/ca/"],
        ["locale", "quickfilters", "de", "chrome/locale/de/"],
        ["locale", "quickfilters", "es-AR", "chrome/locale/es-MX/"],
        ["locale", "quickfilters", "es", "chrome/locale/es/"],
        ["locale", "quickfilters", "fr", "chrome/locale/fr/"],
        ["locale", "quickfolders", "hu-HU", "chrome/locale/hu-HU/"],
        ["locale", "quickfilters", "it", "chrome/locale/it/"],
        ["locale", "quickfilters", "ja", "chrome/locale/ja/"],
        ["locale", "quickfilters", "nl", "chrome/locale/nl/"],
//        ["locale", "quickfolders", "pl", "chrome/locale/pl/"],
//        ["locale", "quickfolders", "pt-BR", "chrome/locale/pt-BR/"],
        ["locale", "quickfilters", "ru", "chrome/locale/ru/"],
//        ["locale", "quickfolders", "sl-SI", "chrome/locale/sl-SI/"],
//        ["locale", "quickfolders", "sr", "chrome/locale/sr/"],
        ["locale", "quickfilters", "sv-SE", "chrome/locale/sv-SE/"],
        ["locale", "quickfilters", "vi", "chrome/locale/vi/"],
        ["locale", "quickfilters", "zh-CN", "chrome/locale/zh-CN/"]
//        ["locale", "quickfolders", "zh-CHS", "chrome/locale/zh-CN/"],
//        ["locale", "quickfolders", "zh", "chrome/locale/zh/"],
//        ["locale", "quickfolders", "zh-CHT", "chrome/locale/zh/"],
//        ["locale", "quickfolders", "zh-TW", "chrome/locale/zh/"]
    
      ]);
 
   // messenger.WindowListener.registerOptionsPage("chrome://quickfolders/content/options.xhtml"); 
    
 //attention: each target window (like messenger.xul) can appear only once
 // this is different from chrome.manifest
 // xhtml for Tb78
    // messenger.WindowListener.registerWindow("chrome://messenger/content/messenger.xhtml", "chrome/content/scripts/qf-messenger.js");
    /* not necessary in Tb78+    */
    messenger.WindowListener.registerWindow("chrome://messenger/content/messenger.xul", "chrome/content/scripts/qFi-messenger.js");
 /*   messenger.WindowListener.registerWindow("chrome://messenger/content/messengercompose.xul", "chrome/content/scripts/qf-composer.js");
    messenger.WindowListener.registerWindow("chrome://messenger/content/FilterListDialog.xul", "chrome/content/scripts/qf-filterlist.js");
    messenger.WindowListener.registerWindow("chrome://messenger/content/SearchDialog.xul", "chrome/content/scripts/qf-searchDialog.js");
    messenger.WindowListener.registerWindow("chrome://messenger/content/customizeToolbar.xul", "chrome/content/scripts/qf-customizetoolbar.js");
    messenger.WindowListener.registerWindow("chrome://messenger/content/messageWindow.xul", "chrome/content/scripts/qf-messageWindow.js");
   */ 
    messenger.WindowListener.registerWindow("chrome://messenger/content/messenger.xhtml", "chrome/content/scripts/qFi-messenger.js");
    messenger.WindowListener.registerWindow("chrome://messenger/content/FilterEditor.xhtml", "chrome/content/scripts/qFi-filterEditor.js");
    messenger.WindowListener.registerWindow("chrome://messenger/content/FilterListDialog.xhtml", "chrome/content/scripts/qFi-filterlist.js");
/*    messenger.WindowListener.registerWindow("chrome://messenger/content/SearchDialog.xhtml", "chrome/content/scripts/qf-searchDialog.js");
    messenger.WindowListener.registerWindow("chrome://messenger/content/customizeToolbar.xhtml", "chrome/content/scripts/qf-customizetoolbar.js");
    messenger.WindowListener.registerWindow("chrome://messenger/content/messageWindow.xhtml", "chrome/content/scripts/qf-messageWindow.js");  
  
    messenger.WindowListener.registerStartupScript("chrome/content/scripts/qf-startup.js");
    messenger.WindowListener.registerShutdownScript("chrome/content/scripts/qf-shutdown.js");
*/
 /*
  * Start listening for opened windows. Whenever a window is opened, the registered
  * JS file is loaded. To prevent namespace collisions, the files are loaded into
  * an object inside the global window. The name of that object can be specified via
  * the parameter of startListening(). This object also contains an extension member.
  */


    messenger.WindowListener.startListening();
}

main();
