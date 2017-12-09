"use strict";
/* 
BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK 
*/

// qFilters-server.js
// overload into chrome://messenger/content/am-server.xul
// in order to automate runnnig filters on all mail
// when get mail is clicked (or automatically run)

/* quickFilters.openSettings = function() {
	let ac = top.getCurrentAccount();
	let id = ac.defaultIdentity;
}
 */
// onload

var quickFilters_OnLoad = function() {
  let quickFilters_serverVbox = document.getElementById('server.quickFilters-runFilter'),
      quickFilters_downLoadOnBiff = document.getElementById('server.downloadOnBiff');

  if (quickFilters_downLoadOnBiff && quickFilters_serverVbox) {
    let par = quickFilters_downLoadOnBiff.parentNode;
    par.parentNode.insertBefore(
      par,
      quickFilters_serverVbox.parentNode);
  }
  else {
    let txt = 'not found:';
    if (!quickFilters_downLoadOnBiff)   
      txt +='\n  server.downloadOnBiff';
    if (!quickFilters_serverVbox)   
      txt +='\n  server.quickFilters-runFilter';
    alert(txt);
  }

}

/* great if there was an onload event for the page? */
setTimeout(function() {quickFilters_OnLoad();}, 200);


