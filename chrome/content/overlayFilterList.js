/* 
BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK 
*/

/* OBSOLETE - CALLED FROM qFi-filterlist.js DIRECTLY */
quickFilters.Util.logDebugOptional('filterList', 'Adding event listener for onLoadFilterList()');
window.addEventListener("load", function(e) { quickFilters.List.onLoadFilterList(e);}, false); 

