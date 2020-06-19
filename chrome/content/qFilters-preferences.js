"use strict";

/* 
BEGIN LICENSE BLOCK

quickFilters is released under the Creative Commons (CC BY-ND 4.0)
Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
For details, please refer to license.txt in the root folder of this extension

END LICENSE BLOCK 
*/


if (typeof ChromeUtils.import == "undefined")
	Components.utils.import('resource://gre/modules/Services.jsm'); // Thunderbird 52
else
	var {Services} =ChromeUtils.import('resource://gre/modules/Services.jsm');


quickFilters.Preferences = {
  Prefix: "extensions.quickfilters.",
	service: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),

	get isDebug() {
		return this.getBoolPref("debug");
	},

	isDebugOption: function(option) { // granular debugging
		if(!this.isDebug) return false;
		try {return this.getBoolPref("debug." + option);}
		catch(e) {return false;}
	},
	
	getIntPref: function(p) {
		try {
      return this.service.getIntPref(this.Prefix + p);
    } catch(e) {
			let s="Err:" +e;
			quickFilters.Util.logToConsole("getIntPref(" + this.Prefix + p + ") failed:\n" + s);
			throw(e);
		}
	},

	setIntPref: function(p, v) {
		return this.service.setIntPref(this.Prefix + p, v);
	},
	
	isAbortAfterCreateFilter: function() {
  	return this.getBoolPref("abortAfterCreate");
	},

	getBoolPrefSilent: function(p) {
		try {
			return this.getBoolPref(p);
		}
		catch(e) {
			return false;
		}
	},
	
	getBoolPrefNative: function(p) {
		try {
			return this.service.getBoolPref(p);
		} catch(e) {
			let s="Err:" +e;
			quickFilters.Util.logToConsole("getBoolPrefNative(" + p + ") failed:\n" + s);
			return false;
		}
	},

	getBoolPref: function(p) {
		return quickFilters.Preferences.getBoolPrefNative(this.Prefix + p);
	},

	setBoolPref: function(p, v) {
		return quickFilters.Preferences.setBoolPrefNative(this.Prefix + p, v);
	},

	setBoolPrefNative: function(p, v) {
		try {
			return this.service.setBoolPref(p, v);
		} catch(e) {
			let s="Err:" +e;
			return false;
		}
	} ,

	setCharPref: function(p, v) {
		return this.service.setCharPref(this.Prefix + p, v);
	} ,
	
	getCharPref: function(p) {
		return this.service.getCharPref(this.Prefix + p);
	} ,

	getStringPref: function getStringPref(p) {
    let prefString ='',
		    key = "extensions.quickfilters." + p;
    try {
			if (this.service.getStringPref)
				prefString = this.service.getStringPref(key);
			else { // Thunderbird 52.0
				const Ci = Components.interfaces;				
				prefString = Services.prefs.getComplexValue(key, Ci.nsISupportsString).data.toString();
			}
    }
    catch(ex) {
      quickFilters.Util.logDebug("Could not find string pref: " + p + "\n" + ex.message);
    }
    finally {
      return prefString;
    }
	} ,
	
	setStringPref: function setStringPref(p, v) {
		let key = "extensions.quickfilters." + p;
 		if (this.service.setStringPref)
			return this.service.setStringPref(key, v);
		else { // Tb 52.*
		  const Cc = Components.classes,
						Ci = Components.interfaces;
			let str = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
			str.data = v;
			Services.prefs.setComplexValue(key, Ci.nsISupportsString, str);			
		}
			
	} ,	
	
	existsCharPref: function(pref) {
		try {
			if(this.service.prefHasUserValue(pref))
				return true;
			if (this.service.getCharPref(pref))
				return true;
		}
		catch (e) {return false; }
		return false;
	},

	existsBoolPref: function(pref) {
		try {
			if(this.service.prefHasUserValue(pref))
				return true;
			if (this.service.getBoolPrefNative(pref))
				return true;
		}
		catch (e) {return false; }
		return false;
	},
	
	get isStarAction() {
	  let pref;
		switch(quickFilters.Util.Application) {
			case 'Thunderbird': case 'Postbox':
				pref = 'actions.star';
				break;
			case 'SeaMonkey':
				pref = 'actions.flag';
				break;
		}
		return this.getBoolPref(pref);
	} ,
	
	get isMoveFolderAction() {
	  return this.getBoolPref('actions.moveFolder');
	} ,
	
	set isMoveFolderAction(b) {
	  return this.setBoolPref('actions.moveFolder', b);
	} ,
	
  getCurrentFilterTemplate : function() {
		let current = quickFilters.Preferences.getStringPref("filters.currentTemplate");
		if (current == "undefined") current = null;
    return current;
  } ,
  
  setCurrentFilterTemplate : function(pref) {
    return quickFilters.Preferences.setStringPref("filters.currentTemplate", pref);
  } ,
  
  // scope: "folder" | "mails"
  isShortcut : function(scope) {
    switch (scope) {
      case "folder":
        break;
      case "mails":
        break;
      default: 
        return false;
    }
    try {
      return this.getBoolPref("shortcuts." + scope);
    }
    catch(x) {;}
    return false;
  } ,
  
  getShortcut : function(scope) {
    switch (scope) {
      case "folder":
        break;
      case "mails":
        break;
      default: 
        return null;
    }
    return this.getStringPref("shortcuts." + scope + ".key");
  }
  
	

}