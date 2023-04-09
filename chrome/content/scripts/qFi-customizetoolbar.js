
function onLoad(activatedWhileWindowOpen) {
  let layout = WL.injectCSS("chrome://quickfilters/content/skin/quickFilters.css");
  let layout2 = WL.injectCSS("chrome://quickfilters/content/skin/quickFilters-toolbar.css");
  
  // we may have to relabel the main toolbar button after 
  // the window calls its buildPalette() function (see customizeToolbar.js)
  // DOMContentLoaded is probably not called at this stage anymore? 
  /*
  document.addEventListener(
    "DOMContentLoaded",
    () => {
        let btnTool = document.getElementById("quickfilters-toolbar-button");
        if (btnTool) {
          btnTool.label = "quickFilters";
        }
    },
    { once: true }
  );
  */
 let wrappedBuildPalette = window.buildPalette.bind(window);
 if (wrappedBuildPalette && !window.buildPalette.isPatched ) {
    window.buildPalette = function() {
      wrappedBuildPalette();
      let btnTool = window.document.getElementById("quickfilters-toolbar-button");
      if (btnTool) {
        btnTool.label = "quickFilters";
        let label = btnTool.querySelector("label.toolbarbutton-text");
        if (label) label.value = "quickFilters";
      }      
    }
 }


}

function onUnload(isAddOnShutDown) {
}

