
"use strict";
/* 
BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK 
*/

/* 
  globals 
*/


const startup = async () => {
  i18n.updateDocument();

  document.getElementById("btnNext").addEventListener("click", (event) => {
    event.preventDefault(); 
    return quickFilters.Assistant.next();
  });
  document.getElementById("btnCancel").addEventListener("click", (_e) => {
    return quickFilters.Assistant.cancelTemplate();
  });  

  const filterMatches = document.getElementById("filterMatches");
  filterMatches.addEventListener("click", (event) => {
    quickFilters.Assistant.selectMatchFromList(event.currentTarget);
  });
  filterMatches.addEventListener("dblclick", (event) => {
    quickFilters.Assistant.selectMatch(event.currentTarget);
  });

  document.getElementById("chkMerge").addEventListener("change", (event) => {
    quickFilters.Assistant.selectMerge(event.currentTarget);
  });
  document.getElementById("chkCreateNew").addEventListener("change", (event) => {
    quickFilters.Assistant.selectCreateNew(event.currentTarget);
  });

  document.getElementById("quickFiltersBtnHelp").addEventListener("click", () => {
    quickFilters.Assistant.help();
  });
  

  window.addEventListener("beforeunload", () => {
    if (!quickFilters.Assistant.hasSentResult) {
      quickFilters.Assistant.cancelTemplate();
    }
  });

  // default dialog key handlers [Enter] = Next [Cancel] = close dialog
  document.body.addEventListener("keydown", (ev) => {
    // Ignore Enter on elements where it has its own default behavior
    if (
      ev.key === "Enter" &&
      ev.target.matches("textarea, input[type=checkbox], input[type=radio]")
    ) {
      return; // let default happen
    }

  switch (ev.key) {
    case "Enter":
      ev.preventDefault();
      document.getElementById("btnNext")?.click();
      break;
    case "Escape":
      ev.preventDefault();
      document.getElementById("btnCancel")?.click();
      break;
    }

  });  

}

window.document.addEventListener(
  "DOMContentLoaded",
  startup,
  { once: true }
);

window.addEventListener(
  "load",
  (e) => {
    console.log("load event fired!");
    quickFilters.Assistant.loadAssistant.bind(quickFilters.Assistant)(e);
  },
  { once: true }
);
  