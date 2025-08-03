
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
  