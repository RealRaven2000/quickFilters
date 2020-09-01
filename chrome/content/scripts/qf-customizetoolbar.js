var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://quickfolders/content/quickfolders-preferences.js", window, "UTF-8");

function onLoad(activatedWhileWindowOpen) {
    let layout = WL.injectCSS("chrome://quickfolders/content/quickfolders-layout.css");
  
			  // note: we only use this for testing on how "small icons" would work
				//       this will mainly affect "full themes" or remnant settings from full themes
				//       that left the "small icons" sitch activated
				//       to activate this code, set extensions.quickfolders.toolbarpalette.showSmallIcons = true
				//       this will unhide the "small icons" checkbox on the customize toolbar window
                QuickFolders.Preferences.unhideSmallIcons();


}

function onUnload(isAddOnShutDown) {
}
