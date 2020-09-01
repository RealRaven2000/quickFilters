var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-composer.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {
     
    window.QuickFolders.Util.logDebug('Adding Compose xul...');
}

function onUnload(isAddOnShutDown) {
}
