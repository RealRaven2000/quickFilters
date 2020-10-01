var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");


function onLoad(activatedWhileWindowOpen) {
    let layout = WL.injectCSS("chrome://quickfilters/content/skin/quickFilters.css");
}

function onUnload(isAddOnShutDown) {
}

//Services.scriptloader.loadSubScript("chrome://quickfilters/content/quickfilters.js", window, "UTF-8");
//Services.scriptloader.loadSubScript("chrome://quickfilters/content/qFilters-preferences.js", window, "UTF-8");
