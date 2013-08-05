"use strict";

/* BEGIN LICENSE BLOCK

for detail, please refer to license.txt in the root folder of this extension

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 3
of the License, or (at your option) any later version.

If you use large portions of the code please attribute to the authors
(Axel Grude)

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You can download a copy of the GNU General Public License at
http://www.gnu.org/licenses/gpl-3.0.txt or get a free printed
copy by writing to:
  Free Software Foundation, Inc.,
  51 Franklin Street, Fifth Floor,
  Boston, MA 02110-1301, USA.
  
END LICENSE BLOCK 
*/


quickFilters.Options = {
  load: function() {
    let version=quickFilters.Util.Version;
    if (version=="") version='version?';

    let versionLabel = window.document.getElementById("qf-options-version");
    versionLabel.setAttribute("value", version);
    

  } ,
  
  toggleBoolPreference: function(cb, noUpdate) {
    let prefString = cb.getAttribute("preference");
    let pref = document.getElementById(prefString);
    
    if (pref)
      quickFilters.Preferences.setBoolPref(pref.getAttribute('name'), cb.checked);
    if (noUpdate)
      return true;
    return false // this.updateMainWindow();
  },
  
  showAboutConfig: function(clickedElement, filter, readOnly) {

    const name = "Preferences:ConfigManager";
    const uri = "chrome://global/content/config.xul";

    let mediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    let w = mediator.getMostRecentWindow(name);

    let win = clickedElement.ownerDocument.defaultView ? clickedElement.ownerDocument.defaultView : window;
    if (!w) {
      let watcher = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].getService(Components.interfaces.nsIWindowWatcher);
      w = watcher.openWindow(win, uri, name, "dependent,chrome,resizable,centerscreen,alwaysRaised,width=500px,height=350px", null);
    }
    w.focus();
    w.setTimeout(
      function (readOnly) {
        let flt = w.document.getElementById("textbox");
        if (flt) {
           flt.value=filter;
          // make filter box readonly to prevent damage!
           if (!readOnly)
            flt.focus();
           else
            flt.setAttribute('readonly',true);
           if (w.self.FilterPrefs) {
            w.self.FilterPrefs();
          }
        }
      }, 300);
  },


  addConfigFeature: function(filter, Default, textPrompt) {
    // adds a new option to about:config, that isn't there by default
    if (confirm(textPrompt)) {
      // create (non existent filter setting:
      quickFilters.Preferences.setBoolPref(filter, Default);

      // last parameter is Readonly.
      quickFilters.Options.showAboutConfig(filter, true, true); // TEMPORARILY SET TO WRITEABLE!!! !quickFilters.Preferences.Debug
    }

  },
  
  sendMail: function(mailto)  {
    let sURL="mailto:" + mailto + "?subject=[quickFilters]%20add%20your%20own%20subject%20line%20here%20beside%20the%20tag";
    let messageComposeService=Components.classes["@mozilla.org/messengercompose;1"].getService(Components.interfaces.nsIMsgComposeService);
    // make the URI
    let ioService = Components.classes["@mozilla.org/network/io-service;1"]
              .getService(Components.interfaces.nsIIOService);
    let aURI = ioService.newURI(sURL, null, null);
    // open new message
    messageComposeService.OpenComposeWindowWithURI (null, aURI);

  }

  
  

}