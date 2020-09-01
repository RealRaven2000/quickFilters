var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-preferences.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-util.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-search.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {
    
    window.QuickFolders.Util.logDebug('Adding Search Dialog...');
   //obsolete  window.addEventListener("load", function(e) { QuickFolders.SearchDialog.onLoad(e);}, false); 
    window.QuickFolders.SearchDialog.onLoad();  //?event needed?
 }

function onUnload(isAddOnShutDown) {
}
