"use strict";

/*
 ***** BEGIN LICENSE BLOCK *****
 * for detail, please refer to license.txt in the root folder of this extension
 * 
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 3
 * of the License, or (at your option) any later version.
 * 
 * If you use large portions of the code please attribute to the authors
 * (Axel Grude)
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You can download a copy of the GNU General Public License at
 * http://www.gnu.org/licenses/gpl-3.0.txt or get a free printed
 * copy by writing to:
 *   Free Software Foundation, Inc.,
 *   51 Franklin Street, Fifth Floor,
 *   Boston, MA 02110-1301, USA.
 *
 * ***** END LICENSE BLOCK *****
 */

if (Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo).ID != "postbox@postbox-inc.com")
{
  Components.utils.import("resource:///modules/MailUtils.js");
  // Here, Postbox declares fixIterator
  Components.utils.import("resource:///modules/iteratorUtils.jsm");  
}

quickFilters.Properties = {
  bundle: Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService).createBundle("chrome://quickfilters/locale/overlay.properties"),

  getLocalized: function QFProps_getLocalized(msg) {
    let b = this.bundle;
    if (!b)
      b = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService).createBundle("chrome://quickfilters/locale/overlay.properties");
    return b.GetStringFromName(msg);
    //return quickFilters.Properties.bundle.GetStringFromName(msg);
  }
};

var QuickFilters_TabURIregexp = {
  get _thunderbirdRegExp() {
    delete this._thunderbirdRegExp;
    return this._thunderbirdRegExp = new RegExp("^http://quickfilters.mozdev.org/");
  }
};


quickFilters.Util = {
  HARDCODED_EXTENSION_VERSION : "2.9",
  HARDCODED_EXTENSION_TOKEN : ".hc",
  ADDON_ID: "quickFilters@axelg.com",
  VersionProxyRunning: false,
  mAppver: null,
  mAppName: null,
  mHost: null,
  mExtensionVer: null,
  ConsoleService: null,
  lastTime: 0,
  _tabContainer: null,
  tempFolderTab: null,	 // likely obsolete ###

  // return main quickFilters instance (if we are in a child window / dialog or come from an event)
  get mainInstance() {
    let win = this.getMail3PaneWindow();
    return win.quickFilters;
  } ,

	get FolderFlags() {
	  if (Components.interfaces.nsMsgFolderFlags)
	    return Components.interfaces.nsMsgFolderFlags;
		else { // sigh. Postbox doesn't have this?
		  // from https://developer.mozilla.org/en-US/docs/nsMsgFolderFlags.idl
		  return {
			  Inbox: 0x00001000,
				Drafts: 0x00000400,
				Queue: 0x00000800,
				SentMail: 0x00000200,
				Newsgroup: 0x00000001,
				Templates: 0x00400000,
        Virtual: 0x00000020				
			}
		}
	},
		
  getMsgFolderFromUri:  function getMsgFolderFromUri(uri, checkFolderAttributes) {
    let msgfolder = null;
    if (typeof MailUtils != 'undefined' && MailUtils.getFolderForURI) {
      return MailUtils.getFolderForURI(uri, checkFolderAttributes);
    }
    try {
      let main = this.getMail3PaneWindow(),
          resource = main.GetMsgFolderFromUri ? main.GetMsgFolderFromUri(uri, checkFolderAttributes) : main.GetResourceFromUri(uri); // Postbox: this should be defined in widgetglue.js
      msgfolder = resource.QueryInterface(Components.interfaces.nsIMsgFolder);
      if (checkFolderAttributes) {
        if (!(msgfolder && (msgfolder.parent || msgfolder.isServer))) {
          msgfolder = null;
        }
      }
    }
    catch (ex) {
       //dump("failed to get the folder resource\n");
       quickFilters.Util.logException("getMsgFolderFromUri( " + uri + ")", ex);
    }
    return msgfolder;
  } ,

  // gets string from overlay.properties
  getBundleString: function getBundleString(id, defaultText) {
    let s;
    try {
      s= quickFilters.Properties.getLocalized(id); 
    }
    catch(e) {
      s = defaultText;
      this.logException ("Could not retrieve bundle string: " + id, e);
    }
    return s;
  } ,

  getMail3PaneWindow: function getMail3PaneWindow() {
    let windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1']
        .getService(Components.interfaces.nsIWindowMediator),
        win3pane = windowManager.getMostRecentWindow("mail:3pane");
    return win3pane;
  } ,
  
  getLastFilterListWindow: function getLastFilterListWindow() {
    let mediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    return mediator.getMostRecentWindow('mailnews:filterlist');
  } ,

  get AppverFull() {
    let appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
            .getService(Components.interfaces.nsIXULAppInfo);
    return appInfo.version;
  },

  get Appver() {
    if (null === this.mAppver) {
    let appVer=this.AppverFull.substr(0,3); // only use 1st three letters - that's all we need for compatibility checking!
      this.mAppver = parseFloat(appVer); // quick n dirty!
    }
    return this.mAppver;
  },

  get Application() {
    if (null===this.mAppName) {
    let appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
            .getService(Components.interfaces.nsIXULAppInfo);
      const FIREFOX_ID = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
      const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
      const SEAMONKEY_ID = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";
      const POSTBOX_ID = "postbox@postbox-inc.com";
      switch(appInfo.ID) {
        case FIREFOX_ID:
          return this.mAppName='Firefox';
        case THUNDERBIRD_ID:
          return this.mAppName='Thunderbird';
        case SEAMONKEY_ID:
          return this.mAppName='SeaMonkey';
        case POSTBOX_ID:
          return this.mAppName='Postbox';
        default:
          this.mAppName=appInfo.name;
          this.logDebug ( 'Unknown Application: ' + appInfo.name);
          return appInfo.name;
      }
    }
    return this.mAppName;
  },
  
  get HostSystem() {
    if (null===this.mHost) {
      let osString = Components.classes["@mozilla.org/xre/app-info;1"]
            .getService(Components.interfaces.nsIXULRuntime).OS;
      this.mHost = osString.toLowerCase();
    }
    return this.mHost; // linux - winnt - darwin
  },

  // this is done asynchronously, so it respawns itself
  VersionProxy: function VersionProxy() {
    try {
      if (quickFilters.Util.mExtensionVer // early exit, we got the version!
        ||
          quickFilters.Util.VersionProxyRunning) // no recursion...
        return;
      quickFilters.Util.VersionProxyRunning = true;
      quickFilters.Util.logDebug("Util.VersionProxy() started.");
      let myId = quickFilters.Util.ADDON_ID;
      if (Components.utils.import) {
        Components.utils.import("resource://gre/modules/AddonManager.jsm");

        AddonManager.getAddonByID(myId, function(addon) {
          quickFilters.Util.mExtensionVer = addon.version;
          quickFilters.Util.logDebug("AddonManager: quickFilters extension's version is " + addon.version);
          let versionLabel = window.document.getElementById("qf-options-version");
          if(versionLabel) {
            versionLabel.setAttribute("value", addon.version);
            // move version into the box, depending on label length
            quickFilters.Util.logDebug("Version Box: " + versionLabel.boxObject.width + "px");
            versionLabel.style.setProperty('margin-left', ((versionLabel.boxObject.width + 32)*(-1)).toString() + 'px', 'important');
          }
        });
      }
      quickFilters.Util.logDebug("AddonManager.getAddonByID .. added callback for setting extensionVer.");

    }
    catch(ex) {
      quickFilters.Util.logToConsole("QuickFilters VersionProxy failed - are you using an old version of " + quickFilters.Util.Application + "?"
        + "\n" + ex);
    }
    finally {
      quickFilters.Util.VersionProxyRunning=false;
    }
  },

  get Version() {
    //returns the current QF version number.
    if(quickFilters.Util.mExtensionVer)
      return quickFilters.Util.mExtensionVer;
    let current = quickFilters.Util.HARDCODED_EXTENSION_VERSION + quickFilters.Util.HARDCODED_EXTENSION_TOKEN,
        Cc = Components.classes;

    if (!Cc["@mozilla.org/extensions/manager;1"]) {
      // Addon Manager: use Proxy code to retrieve version asynchronously
      quickFilters.Util.VersionProxy(); // modern Mozilla builds.
                        // these will set mExtensionVer (eventually)
                        // also we will delay FirstRun.init() until we _know_ the version number
    }
    else  // --- older code: extensions manager.
    {
      try {
        if (Cc["@mozilla.org/extensions/manager;1"]) {
          let gExtensionManager = Cc["@mozilla.org/extensions/manager;1"]
                                    .getService(Components.interfaces.nsIExtensionManager);
          current = gExtensionManager.getItemForID(quickFilters.Util.ADDON_ID).version;
        }
        else {
          current = current + "(?)";
        }
        quickFilters.Util.mExtensionVer = current;

      }
      catch(ex) {
        current = current + "(?ex?)" // hardcoded, program this for Tb 3.3 later
        quickFilters.Util.logToConsole("QuickFilters Version retrieval failed - are you using an old version of " + quickFilters.Util.Application + "?");
      }
    }
    return current;
  } ,

  get VersionSanitized() {
    return this.getVersionSimple(this.Version);
  } ,
  
  getVersionSimple: function getVersionSimple(ver) {
    let pureVersion = ver,  // default to returning unchanged
        // get first match starting with numbers mixed with .   
        reg = new RegExp("[0-9.]*"),
        results = ver.match(reg); 
    if (results) 
      pureVersion = results[0];
    return pureVersion;
  } ,

  isVirtual: function isVirtual(folder) {
    if (!folder)
      return true;
		if (quickFilters.Util.FolderFlags.Virtual & folder.flags)
		  return true;
    return (folder.username && folder.username == 'nobody') || (folder.hostname == 'smart mailboxes');
  } ,

	get tabContainer() {
		if (!this._tabContainer) {
		  let doc = this.getMail3PaneWindow().document;
			if (this.Application=='Postbox')
				this._tabContainer = doc.getElementById('tabmail').mTabContainer;
			else
				this._tabContainer = doc.getElementById('tabmail').tabContainer;
		}
		return this._tabContainer;
	} ,
	
	getTabInfoByIndex: function getTabInfoByIndex(tabmail, idx) {
		if (tabmail.tabInfo)
			return tabmail.tabInfo[idx];
		if (tabmail.tabOwners)
		  return tabmail.tabOwners[idx];  // Postbox
		return null;
	} ,	
	
	get mailFolderTypeName() {
		switch(this.Application) {
			case "Thunderbird": return "folder";
			case "SeaMonkey": return "3pane";
			default: return "folder";
		}
		return "";
	} ,	
	
	get tabmail() {
		let doc = this.getMail3PaneWindow().document,
		    tabmail = doc.getElementById("tabmail");
		return tabmail;
	} ,
	
	// likely obsolete ###
	// use this to temporarily open a tab for a folder if the msgDatabase remains invalid.
	// there should be another way to do this, but for the moment this is the workaround.
	openTempFolderInNewTab: function openTempFolderInNewTab(folder, background) {
		let win = this.getMail3PaneWindow(),
		    tabmail = this.tabmail;
		if (tabmail) {
		  let tabName = folder.name;
			switch (this.Application) {
				case 'Thunderbird':
				  this.tempFolderTab = tabmail.openTab(this.mailFolderTypeName, 
					  {folder: folder, messagePaneVisible: true, background: background, disregardOpener: true, 
						title: tabName} ) ; 
					break;
				case 'SeaMonkey':
					this.tempFolderTab = tabmail.openTab(this.mailFolderTypeName, 7, folder.URI); // '3pane'; how to implement background?
					this.tabContainer.selectedIndex = tabmail.tabContainer.childNodes.length - 1;
					break;
				case 'Postbox':
					win.MsgOpenNewTabForFolder(folder.URI, 
					  null /* messageKey */, 
						background);
					let info = this.getTabInfoByIndex(tabmail, tabmail.mTabContainer.childNodes.length-1);
					this.tempFolderTab = info;  
					break;
			}
		}
	} ,
	
	// likely obsolete ###
	closeTempFolderTab: function closeTempFolderTab() {
	  if(this.tempFolderTab) {
		  if (this.tabmail.closeTab)
				this.tabmail.closeTab(this.tempFolderTab);
			else  // postbox
				this.tabmail.removeTab(this.tempFolderTab, {skipAnimation: true});
			this.tempFolderTab = null;
		}
	} ,
	
  slideAlert: function slideAlert(text, title, icon) {
    try {
      if (!icon)
        icon = "chrome://quickfilters/skin/QuickFilters_32.png";
      else
        icon = "chrome://quickfilters/skin/" + icon;
      if (!title)
        title = "quickFilters";
      quickFilters.Util.logToConsole('popupAlert(' + text + ', ' + title + ')');
      Components.classes['@mozilla.org/alerts-service;1'].
                getService(Components.interfaces.nsIAlertsService).
                showAlertNotification(icon, title, text, false, '', null);
    }
    catch(e) {
      // prevents runtime error on platforms that don't implement nsIAlertsService
      alert(text);
    }
  } ,
  
  popupAlert: function popupAlert(text, title, icon) {
    try {
      if (!icon)
        icon = "chrome://quickfilters/skin/QuickFilters_32.png";
      else
        icon = "chrome://quickfilters/skin/" + icon;
      if (!title)
        title = "quickFilters";
      let panel = document.getElementById('quickFilterNotification');
      if (panel) {
        panel.openPopup(null, "after_start", 0, 0, false, false);
        let notificationBox = document.getElementById('quickFilterNotificationBox'),
            priority = notificationBox.PRIORITY_WARNING_MEDIUM,
            // appendNotification( label , value , image , priority , buttons, eventCallback )
            note = notificationBox.appendNotification( text , null , icon , priority, null, null ); 
        notificationBox.addEventListener('alertclose', function() { alert('test'); });
        window.setTimeout(function() {try{notificationBox.removeNotification(note)}catch(e){};panel.hidePopup();}, 4000);
        //let note = document.createElement('notification');
        //note.setAttribute(label, text);
        //note.setAttribute(image, icon);
        //panel.appendChild(note);
      }
      else {
        let prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                      .getService(Components.interfaces.nsIPromptService);
        prompts.alert(window, title, text); 
      }
    }
    catch(e) {
      // prevents runtime error on platforms that don't implement nsIAlertsService
      this.logException ("quickFilters.util.popupAlert() ", e);
      alert(text);
    }
  } ,
  
	disableFeatureNotification: function disableFeatureNotification(featureName) {
		quickFilters.Preferences.setBoolPref("proNotify." + featureName, false);
	} ,  
  
	popupProFeature: function popupProFeature(featureName, text, isDonate, isRegister) {
		let notificationId,
        util = quickFilters.Util;
		// is notification disabled?
		// check setting extensions.quickfilters.proNotify.<featureName>
    try {
      if (!quickFilters.Preferences.getBoolPref("proNotify." + featureName))
        return;
    } catch(ex) {return;}

		switch(util.Application) {
			case 'Postbox': 
				notificationId = 'pbSearchThresholdNotifcationBar';  // msgNotificationBar
				break;
			case 'Thunderbird': 
				notificationId = 'mail-notification-box'
				break;
			case 'SeaMonkey':
				notificationId = null;
				break;
		}
		let notifyBox = document.getElementById (notificationId);
    if (!notifyBox) {
      notifyBox = util.getMail3PaneWindow().document.getElementById (notificationId);
    }
		let title=util.getBundleString("quickfilters.notification.proFeature.title",
				"Premium Feature"),
		    theText = util.getBundleString("quickfilters.notification.proFeature.notificationText",
				"The {1} feature is a Premium feature, if you use it regularly consider donating to development of quickFilters this year. "),
        featureTitle = util.getBundleString('quickfilters.premium.title.' + featureName, featureName);
		theText = theText.replace ("{1}", "'" + featureTitle + "'");
		let nbox_buttons = [],
        dontShow = util.getBundleString("quickfilters.notification.dontShowAgain", "Do not show this message again.") + ' [' + featureTitle + ']';
		if (notifyBox) {
			let notificationKey = "quickfilters-proFeature",      
          countDown = quickFilters.Preferences.getIntPref("proNotify." + featureName + ".countDown") ;
      if (notifyBox.getNotificationWithValue(notificationKey)) {
        // notification is already shown on screen.
        quickFilters.Util.logDebug('notifyBox for [' + notificationKey + '] is already displayed, no action necessary.\n'
                                   + 'Countdown is ' + countDown);
        return;
      }
      countDown--;
      quickFilters.Preferences.setIntPref("proNotify." + featureName + ".countDown", countDown);
      quickFilters.Util.logDebug('Showing notifyBox for [' + notificationKey + ']...\n'
                                 + 'Countdown is ' + countDown);
      
			// button for disabling this notification in the future
			if (countDown>0) {
        // registration button
        if (isRegister) {
          let registerMsg = util.getBundleString("quickfilters.notification.register", "Register {1}");
          registerMsg = registerMsg.replace('{1}', 'quickFilters');
          nbox_buttons.push(
            {
              label: registerMsg,
              accessKey: null, 
              callback: function() { alert('not implemented yet'); quickFilters.Util.showDonatePage(); }, // need to implement this
              popup: null
            }
          )
        }
        
        // donate button
        if (isDonate) {
          let donateMsg = util.getBundleString("quickfilters.notification.donate", "Donate");
          nbox_buttons.push(
            {
              label: donateMsg,
              accessKey: null, 
              callback: function() { 
                quickFilters.Util.showDonatePage(); 
                let item = notifyBox.getNotificationWithValue(notificationKey); // notifyBox, notificationKey are closured
                notifyBox.removeNotification(item, (quickFilters.Util.Application == 'Postbox'))
              },
              popup: null
            }
          )
        }
        
			}
			else {
				nbox_buttons.push(
					{
						label: dontShow,
						accessKey: null, 
						callback: function() { quickFilters.Util.disableFeatureNotification(featureName); },
						popup: null
					}
				);
			}
			
			if (notifyBox) {
				let item = notifyBox.getNotificationWithValue(notificationKey);
				if (item)
					notifyBox.removeNotification(item, (util.Application == 'Postbox'));
			}
		
			notifyBox.appendNotification( theText, 
					notificationKey , 
					"chrome://quickfilters/skin/proFeature.png" , 
					notifyBox.PRIORITY_INFO_HIGH, 
					nbox_buttons ); // , eventCallback
			if (util.Application == 'Postbox') {
				this.fixLineWrap(notifyBox, notificationKey);
			}
		}
		else {
			// fallback for systems that do not support notification (currently: SeaMonkey)
			let prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]  
															.getService(Components.interfaces.nsIPromptService),  
			    check = {value: false},   // default the checkbox to true  
			    result = prompts.alertCheck(null, title, theText, dontShow, check);
			if (check.value==true)
				util.disableFeatureNotification(featureName);
		}
	} ,  

  showStatusMessage: function showStatusMessage(s) {
    try {
      let sb = this.getMail3PaneWindow().document.getElementById('status-bar'),
          el, sbt;
      if (sb) {
        for(let i = 0; i < sb.childNodes.length; i++)
        {
          el = sb.childNodes[i];
          if (el.nodeType === 1 && el.id === 'statusTextBox') {
            sbt = el;
              break;
          }
        }
        for(let i = 0; i < sbt.childNodes.length; i++)
        {
          el = sbt.childNodes[i];
          if (el.nodeType === 1 && el.id === 'statusText') {
              el.label = s;
              break;
          }
        }
      }
      else
        MsgStatusFeedback.showStatusString(s);
    }
    catch(ex) {
      this.logToConsole("showStatusMessage - " +  ex);
      MsgStatusFeedback.showStatusString(s);
    }
  } ,

  getCurrentFolder: function getCurrentFolder() {
    let aFolder;
    if (typeof(GetLoadedMsgFolder) != 'undefined') {
      aFolder = GetLoadedMsgFolder();
    }
    else
    {
      let currentURI;
      if (quickFilters.Util.Application==='Postbox') {
        currentURI = GetSelectedFolderURI();
      }
      else {
        if (gFolderDisplay.displayedFolder)
          currentURI = gFolderDisplay.displayedFolder.URI;
        // aFolder = FolderParam.QueryInterface(Components.interfaces.nsIMsgFolder);
      }
      // in search result folders, there is no current URI!
      if (!currentURI)
        return null;
      aFolder = quickFilters.Util.getMsgFolderFromUri(currentURI, true).QueryInterface(Components.interfaces.nsIMsgFolder); // inPB case this is just the URI, not the folder itself??
    }
    return aFolder;
  } ,
	
  pbGetSelectedMessageUris: function pbGetSelectedMessageUris() {
    let messageArray = {},
        length = {},
        view = GetDBView();
    view.getURIsForSelection(messageArray, length);
    if (length.value) {
      return messageArray.value;
    }
    else
      return null;
  },
  
	// postbox helper function
	pbGetSelectedMessages : function pbGetSelectedMessages() {
	  let messageList = [];
	  // guard against any other callers.
	  if (quickFilters.Util.Application != 'Postbox')
		  throw('pbGetSelectedMessages: Postbox specific function!');
			
	  try {
      let messageUris = quickFilters.Util.pbGetSelectedMessageUris();
      //let messageIdList = [];
      // messageList = Components.classes["@mozilla.org/supports-array;1"].createInstance(Components.interfaces.nsISupportsArray);
      for (let i = 0; i < messageUris.length; i++) {
        let messageUri = messageUris[i],
            Message = messenger.messageServiceFromURI(messageUri).messageURIToMsgHdr(messageUri);
        messageList.push(Message);
      }
      return messageList;
	  }
	  catch (ex) {
	    dump("GetSelectedMessages ex = " + ex + "\n");
	    return null;
	  }
	} ,

  logTime: function logTime() {
    let timePassed = '',
        end = new Date(),
        endTime = end.getTime();
    try { // AG added time logging for test
      if (this.lastTime === 0) {
        this.lastTime = endTime;
        return "[logTime init]"
      }
      let elapsed = new String(endTime - this.lastTime); // time in milliseconds
      timePassed = '[' + elapsed + ' ms]   ';
      this.lastTime = endTime; // remember last time
    }
    catch(e) {;}
    return end.getHours() + ':' + end.getMinutes() + ':' + end.getSeconds() + '.' + end.getMilliseconds() + '  ' + timePassed;
  },

  logToConsole: function logToConsole(msg, optionTag) {
    let qF = quickFilters ? quickFilters : this.mainInstance,
        util = qF.Util;
    if (util.ConsoleService === null)
      util.ConsoleService = Components.classes["@mozilla.org/consoleservice;1"]
                  .getService(Components.interfaces.nsIConsoleService);
    util.ConsoleService.logStringMessage("quickFilters " 
			+ (optionTag ? '{' + optionTag.toUpperCase() + '} ' : '')
			+ this.logTime() + "\n"+ msg);
  },

  // flags
  // errorFlag    0x0   Error messages. A pseudo-flag for the default, error case.
  // warningFlag    0x1   Warning messages.
  // exceptionFlag  0x2   An exception was thrown for this case - exception-aware hosts can ignore this.
  // strictFlag     0x4
  logError: function logError(aMessage, aSourceName, aSourceLine, aLineNumber, aColumnNumber, aFlags) {
    let consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                                   .getService(Components.interfaces.nsIConsoleService),
        aCategory = '',
        scriptError = Components.classes["@mozilla.org/scripterror;1"].createInstance(Components.interfaces.nsIScriptError);
    scriptError.init(aMessage, aSourceName, aSourceLine, aLineNumber, aColumnNumber, aFlags, aCategory);
    consoleService.logMessage(scriptError);
  } ,

  logException: function logException(aMessage, ex) {
    let stack = '';
    if (typeof ex.stack!='undefined')
      stack= ex.stack.replace("@","\n  ");

    let srcName = ex.fileName ? ex.fileName : "";
    this.logError(aMessage + "\n" + ex.message, srcName, stack, ex.lineNumber, 0, 0x1); // use warning flag, as this is an exception we caught ourselves
  } ,
  
  logDebug: function logDebug(msg) {
    let qF = quickFilters ? quickFilters : this.mainInstance;
    if (qF.Preferences.Debug)
      this.logToConsole(msg);
  },

  /** 
	* only logs if debug mode is set and specific debug option are active
	* 
	* @optionString {string}: comma delimited options
  * @msg {string}: text to log 
	*/   
  logDebugOptional: function logDebugOptional(optionString, msg) {
    let qF = quickFilters ? quickFilters : this.mainInstance,
        options = optionString.split(',');
    for (let i=0; i<options.length; i++) {
      let option = options[i];
      if (qF.Preferences.isDebugOption(option)) {
        this.logToConsole(msg, option);
        break; // only log once, in case multiple log switches are on
      }
    }        
  },
	
  /** 
	* getAccountsPostbox() return an Array of mail Accounts for Postbox
	*/   
	getAccountsPostbox: function getAccountsPostbox() {
	  let accounts=[],
        Ci = Components.interfaces,
		    smartServers = accountManager.allSmartServers;
		for (let i = 0; i < smartServers.Count(); i++) {
			let smartServer = smartServers.QueryElementAt(i, Ci.nsIMsgIncomingServer),
			    account_groups = smartServer.getCharValue("group_accounts");
			if (account_groups)
			{
				let groups = account_groups.split(",");
        for (let c=0; c < groups.length; c++) {
          let accountKey = groups[c],
					    account = accountManager.getAccount(accountKey);
					if (account)
					{
						accounts.push(account);
					}
				}
			}
		}
		return accounts;
	},

  // dedicated function for email clients which don't support tabs
  // and for secured pages (donation page).
  openLinkInBrowserForced: function openLinkInBrowserForced(linkURI) {
    let Ci = Components.interfaces,
        Cc = Components.classes;
    try {
      this.logDebug("openLinkInBrowserForced (" + linkURI + ")");
      if (quickFilters.Util.Application==='SeaMonkey') {
        let windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator),
            browserWin = windowManager.getMostRecentWindow( "navigator:browser" );
        if (browserWin) {
          let URI = linkURI;
          setTimeout(function() { 
						let tabBrowser = browserWin.getBrowser(),
						    params = {"selected":true};
					  browserWin.currentTab = tabBrowser.addTab(URI, params); 
						if (browserWin.currentTab.reload) browserWin.currentTab.reload(); 
						// activate last tab
						if (tabBrowser && tabBrowser.tabContainer)
							tabBrowser.tabContainer.selectedIndex = tabBrowser.tabContainer.childNodes.length-1;
					}, 250);
        }
        else {
          this.getMail3PaneWindow().window.openDialog(getBrowserURL(), "_blank", "all,dialog=no", linkURI, null, 'QuickFilters');
        }

        return;
      }
      let service = Cc["@mozilla.org/uriloader/external-protocol-service;1"]
                              .getService(Ci.nsIExternalProtocolService),
          ioservice = Cc["@mozilla.org/network/io-service;1"].
            getService(Ci.nsIIOService),
          uri = ioservice.newURI(linkURI, null, null);
      service.loadURI(uri);
    }
    catch(e) { this.logDebug("openLinkInBrowserForced (" + linkURI + ") " + e.toString()); }
  },

  // moved from options.js
  // use this to follow a href that did not trigger the browser to open (from a XUL file)
  openLinkInBrowser: function openLinkInBrowser(evt,linkURI) {
    let Cc = Components.classes,
        Ci = Components.interfaces;
    if (quickFilters.Util.Application === 'Thunderbird') {
      let service = Cc["@mozilla.org/uriloader/external-protocol-service;1"]
                      .getService(Ci.nsIExternalProtocolService),
          ioservice = Cc["@mozilla.org/network/io-service;1"]
                        .getService(Ci.nsIIOService);
      service.loadURI(ioservice.newURI(linkURI, null, null));
      if(null !== evt)
        evt.stopPropagation();
    }
    else {
      this.openLinkInBrowserForced(linkURI);
    }
  },

  // moved from options.js (then called
  openURL: function openURL(evt,URL) { // workaround for a bug in TB3 that causes href's not be followed anymore.
    let ioservice,iuri,eps;

    if (quickFilters.Util.Application==='SeaMonkey' || quickFilters.Util.Application==='Postbox')
    {
      this.openLinkInBrowserForced(URL);
      if(null!=evt) evt.stopPropagation();
    }
    else {
      if (this.openURLInTab(URL) && null!=evt) {
        if (evt.preventDefault)  evt.preventDefault();
        if (evt.stopPropagation)  evt.stopPropagation();
      }
    }
  },

  openURLInTab: function openURLInTab(URL) {
    try {
		  switch(quickFilters.Util.Application) {
			  case "SeaMonkey":
					this.openLinkInBrowserForced(URL);
					return;
				case "Postbox":
					this.openLinkInBrowser(null, URL);
					return;
				case "Thunderbird":
					let sTabMode="",
					    tabmail = this.tabmail;
					if (!tabmail) {
						// Try opening new tabs in an existing 3pane window
						let mail3PaneWindow = this.getMail3PaneWindow();
						if (mail3PaneWindow) {
							tabmail = mail3PaneWindow.document.getElementById("tabmail");
							mail3PaneWindow.focus();
						}
					}
					if (tabmail) {
						sTabMode = (quickFilters.Util.Application === "Thunderbird" && quickFilters.Util.Appver >= 3) ? "contentTab" : "3pane";
						tabmail.openTab(sTabMode,
						{contentPage: URL, clickHandler: "specialTabs.siteClickHandler(event, QuickFilters_TabURIregexp._thunderbirdRegExp);"});
					}
					else {
						window.openDialog("chrome://messenger/content/", "_blank",
											"chrome,dialog=no,all", null,
						{ tabType: "contentTab", tabParams: {contentPage: URL, clickHandler: "specialTabs.siteClickHandler(event, QuickFilters_TabURIregexp._thunderbirdRegExp);", id:"QuickFilters_Weblink"} } );
					}
			}
    }
    catch(e) { return false; }
    return true;
  } ,
	
	debugMsgAndFolders: function debugMsgAndFolders(label1, val1, targetFolder, msg, filterAction) {
	  if (!quickFilters.Preferences.isDebugOption("createFilter"))
		  return;
	  try {
			if (msg)
				quickFilters.Util.logDebugOptional ("createFilter",
						"Message(\n"
							+ label1 + "=" + val1 + "\n"
							+ " target folder="+ (targetFolder ? targetFolder.prettyName || '' : 'missing') + "\n"
							+ " message Id=" + msg.messageId + "\n"
							+ " author=" + (msg.mime2DecodedAuthor || '') + "\n"
							+ " subject=" + (msg.mime2DecodedSubject || '') + "\n"
							+ " recipients=" + (msg.mime2DecodedRecipients || '') + "\n"
							+ " filterAction=" + (filterAction || '') + "\n"
							+ " cc=" + (msg.ccList || '') + "\n"
							+ " bcc=" + (msg.bccList || '') + "\n"
							+ " author=" +( msg.author || '')
							+ ")");	
			else {
				quickFilters.Util.logDebugOptional ("createFilter",
						"Message(\n"
							+ label1 + "=" + val1 + "\n"
							+ " target folder="+ (targetFolder ? targetFolder.prettyName || '' : 'missing') + "\n"
							+ "msg is null.");
			}
		}
		catch(ex) {
		  quickFilters.Util.logDebugOptional ("createFilter", "Exception: " + ex);
		}
	} ,
	
	// ### [Bug 25688] Creating Filter on IMAP fails after 7 attempts ###
	// so let's store the header itself as well, just in case
	makeMessageListEntry: function makeMessageListEntry(msgHeader, Uri) {
	  return {"messageId":msgHeader.messageId, "msgHeader":msgHeader, "messageURI":Uri};
	} ,

  createMessageIdArray: function createMessageIdArray(targetFolder, messageUris) {
    let Ci = Components.interfaces;
    try {
      try {quickFilters.Util.logDebugOptional('dnd', 'quickFilters.Util.createMessageIdArray: target = ' + targetFolder.prettiestName );}
      catch(e) { alert('quickFilters.Util.createMessageIdArray:' + e); }

      if (targetFolder.flags & this.FolderFlags.Virtual) {  // Ci.nsMsgFolderFlags.Virtual
        return null;
      }

      let messageIdList = [];
      for (let i = 0; i < messageUris.length; i++) {
        let Uri = messageUris[i];
        let msgHeader = messenger.messageServiceFromURI(Uri).messageURIToMsgHdr(Uri); // retrieve nsIMsgDBHdr
        messageIdList.push(this.makeMessageListEntry(msgHeader, Uri));  // ### [Bug 25688] Creating Filter on IMAP fails after 7 attempts ###
				quickFilters.Util.debugMsgAndFolders('Uri', Uri.toString(), targetFolder, msgHeader, "--");
      }

      return messageIdList;
    }
    catch(e) {
      this.logToConsole('Exception in quickFilters.Util.createMessageIdArray \n' + e);
      return null;
    };
    return null;
  } ,

  /**
   * Installs the toolbar button with the given ID into the given
   * toolbar, if it is not already present in the document.
   *
   * @param {string} toolbarId The ID of the toolbar to install to.
   * @param {string} id The ID of the button to install.
   * @param {string} afterId The ID of the element to insert after. @optional
   */
  installButton: function installButton(toolbarId, id, afterId) {
    if (!document.getElementById(id)) {
      this.logDebug("installButton(" + toolbarId + "," + id + "," + afterId + ")");

      let toolbar = document.getElementById(toolbarId),
          before = null;
      // If no afterId is given, then append the item to the toolbar
      if (afterId) {
        let elem = document.getElementById(afterId);
        if (elem && elem.parentNode == toolbar)
            before = elem.nextElementSibling;
      }

      this.logDebug("toolbar.insertItem(" + id  + "," + before + ")");
      toolbar.insertItem(id, before);
      toolbar.setAttribute("currentset", toolbar.currentSet);
      this.logDebug("document.persist" + toolbar.id + ")");
      document.persist(toolbar.id, "currentset");

    }
  }  ,

  showVersionHistory: function showVersionHistory(ask) {
    let version = quickFilters.Util.VersionSanitized;
    let sPrompt = quickFilters.Util.getBundleString("quickfilters.confirmVersionLink", "Display version history for quickFilters")
    if (!ask || confirm(sPrompt)) {
      quickFilters.Util.openURL(null, "http://quickfilters.mozdev.org/version.html#" + version);
    }
  } ,

  showDonatePage: function showDonatePage() {
    quickFilters.Util.openURLInTab('http://quickfilters.mozdev.org/donate.html');
  }  ,

  showHomePage: function showHomePage(queryString) {
	  if (!queryString) queryString='index.html';
    quickFilters.Util.openURLInTab('http://quickfilters.mozdev.org/' + queryString);
  } ,
	
  showBug: function showBug(bugNumber) {
    quickFilters.Util.openURLInTab('https://www.mozdev.org/bugs/show_bug.cgi?id=' + bugNumber);
  } ,
  
	toggleDonations: function toggleDonations() {
		let isAsk = quickFilters.Preferences.getBoolPref('donations.askOnUpdate');
		let question = this.getBundleString("quickfilters.donationToggle","Do you want to {0} the donations screen which is displayed whenever quickFilters updates?");
		
		question = question.replace('{0}', isAsk ? 
               this.getBundleString("quickfilters.donationToggle.disable", 'disable') : 
							 this.getBundleString("quickfilters.donationToggle.enable", 're-enable'));
		if (confirm(question)) {
		  isAsk = !isAsk;
			quickFilters.Preferences.setBoolPref('donations.askOnUpdate', isAsk);
			let message = this.getBundleString("quickfilters.donationIsToggled", "The donations screen is now {0}.");
			message = message.replace('{0}', isAsk ? 
			  this.getBundleString("quickfilters.donationIsToggled.enabled",'enabled'): 
				this.getBundleString("quickfilters.donationIsToggled.disabled",'disabled'));
			alert(message);	
		}
	},  	
  
  // Postbox special functions to avoid line being truncated
  // removes description.value and adds it into inner text
  fixLineWrap: function fixLineWrap(notifyBox, notificationKey) {
    try {
      if (!notifyBox || !notificationKey)
        return;
      let note = notifyBox.getNotificationWithValue(notificationKey);
      // if we  could get at the description element within the notificaiton 
      // we could empty the value and stick thje text into textContent instead!
      let hbox = note.boxObject.firstChild.firstChild;
      if (hbox) {
        this.logDebug('hbox = ' + hbox.tagName + ' hbox.childNodes: ' + hbox.childNodes.length);
        let desc = hbox.childNodes[1];
        desc.textContent = desc.value.toString();
        desc.removeAttribute('value');
      }
    }
    catch(ex) {
      this.logException('Postbox notification: ', ex);
    }
  } ,
  
  versionLower: function versionLower(a, b) {
    let versionComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                            .getService(Components.interfaces.nsIVersionComparator);
    return (versionComparator.compare(a, b) < 0);
  } ,
  
  versionHigher: function versionHigher(a, b) {
    let versionComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                            .getService(Components.interfaces.nsIVersionComparator);
    return (versionComparator.compare(a, b) > 0);
  } ,
	
	isStringAttrib: function isStringAttrib(attr) {
	  let AC = Components.interfaces.nsMsgSearchAttrib;
		let isString =
	    !( attr == AC.Priority || attr == AC.Date || attr == AC.MsgStatus || attr == AC.MessageKey || attr == AC.Size || attr == AC.AgeInDays
		  || attr == AC.FolderInfo || attr == AC.Location || attr == AC.Label || attr == AC.JunkStatus || attr == AC.Uint32HdrProperty
			|| attr == AC.JunkPercent || attr == AC.HasAttachmentStatus);
		// what about To, Sender, CC, Subject
		return isString;   
	},

  replaceReservedWords: function(dmy, token, arg)	{
    let util = quickFilters.Util,
        msgDbHdr = util.CurrentMessage,
        hdr = util.CurrentHeader;
        
    function getNewsgroup() {
      util.logDebugOptional('regularize', 'getNewsgroup()');
      let acctKey = msgDbHdr.accountKey;
      //const account = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Ci.nsIMsgAccountManager).getAccount(acctKey);
      //dump ("acctKey:"+ acctKey);
      //return account.incomingServer.prettyName;
      return acctKey;
    }
        
	  // calling this function just for logging purposes
		function finalize(tok, s, comment) {
			if (s) {
				let text = "replaceReservedWords( %" + tok + "% ) = " + s;
				if (comment) {
					text += '\n' + comment;
				}
				util.logDebugOptional ('replaceReservedWords', text);
			};
			return s;
		} 
		
    let tm = new Date(),
        date = msgDbHdr.date,
        charset = msgDbHdr.Charset,
		    expand = function(str) { return str.replace(/%([\w-]+)%/gm, util.replaceReservedWords); }

		// time of when original message was sent.
    tm.setTime(date / 1000);

		try {
			switch(token) {
				case "subject":
					let ret = quickFilters.mimeDecoder.decode(hdr.get("Subject"), charset);
					return finalize(token, ret);
				case "newsgroup":
					return finalize(token, getNewsgroup());
				case "identity":
				  /////
					let fullId = identity.fullName + ' <' + identity.email + '>';
					// we need the split to support (name,link) etc.
					token = quickFilters.mimeDecoder.split(fullId, charset, arg, true); // disable charsets decoding!
					break;
				default:
					let isStripQuote = RegExp(" " + token + " ", "i").test(
					                   " Bcc Cc Disposition-Notification-To Errors-To From Mail-Followup-To Mail-Reply-To Reply-To" +
					                   " Resent-From Resent-Sender Resent-To Resent-cc Resent-bcc Return-Path Return-Receipt-To Sender To "),
              theHeader = hdr.get(token);
          // make sure empty header stays empty for this special case
          if (!theHeader && RegExp(" " + token + " ", "i").test(" Bcc Cc "))
            return '';
					if (isStripQuote) {
						token = quickFilters.mimeDecoder.split(theHeader, charset, arg);
					}
					else {
						token = quickFilters.mimeDecoder.decode(theHeader, charset);
					}
					break;
					// unreachable code! =>
					// token = token.replace(/\r\n|\r|\n/g, ""); //remove line breaks from 'other headers'
			}
		}
		catch(ex) {
			util.logException('replaceReservedWords(dmy, ' + token + ', ' + arg +') failed - unknown token?', ex);
			token="??";
		}
		return token; // this.escapeHtml(token);
	},	
    
	// replaceTerms [ {msgHdr, messageURI} ] - pass message header and message URI replace term variables like %from% %to% etc.
	copyTerms: function copyTerms(fromFilter, toFilter, isCopy, replaceTerms) {
		const AC = Components.interfaces.nsMsgSearchAttrib;
    let util = quickFilters.Util,
		    stCollection = fromFilter.searchTerms.QueryInterface(Components.interfaces.nsICollection);
    if (replaceTerms) {
      if (replaceTerms.messageURI) {
        util.CurrentMessage = replaceTerms.msgHdr;
        util.CurrentHeader = new quickFilters.clsGetHeaders(replaceTerms.messageURI); //.bind(util.clsGetHeaders);
      }
      else {
        util.popupAlert('Sorry, without messageURI I cannot parse mime headers - therefore cannot replace any variables. Tag listener with custom templates are currently not supported.'); 
        replaceTerms = false; // do conventional copy!
      }
    }
		for (let t = 0; t < stCollection.Count(); t++) {
			// let searchTerm = stCollection.GetElementAt(t);
			let searchTerm = stCollection.QueryElementAt(t, Components.interfaces.nsIMsgSearchTerm),
			    newTerm;
			if (isCopy) {
			  newTerm = toFilter.createTerm();
				if (searchTerm.attrib) {
					newTerm.attrib = searchTerm.attrib;
				}
				// nsMsgSearchOpValue
				if (searchTerm.op) newTerm.op = searchTerm.op; 
				if (searchTerm.value) {
				  let val = newTerm.value; // nsIMsgSearchValue
					val.attrib = searchTerm.value.attrib;  
					if (quickFilters.Util.isStringAttrib(val.attrib)) {
            let replaceVal = searchTerm.value.str || ''; // guard against invalid str value. 
            if (replaceTerms) {
              let newVal = replaceVal.replace(/%([\w-:=]+)(\([^)]+\))*%/gm, util.replaceReservedWords);
              this.logDebugOptional ('replaceReservedWords', replaceVal + ' ==> ' + newVal);
              replaceVal = newVal;
            }
					  val.str = replaceVal;  // .toLocaleString() ?
					}
					else switch (val.attrib) {
					  case AC.Priority:
						  val.priority = searchTerm.value.priority;
							break;
						case AC.MessageKey:
						  val.msgKey = searchTerm.value.msgKey;
							break;
						case AC.AgeInDays:
						  val.age = searchTerm.value.age;
							break;
						case AC.Date:
						  val.date = searchTerm.value.date;
							break;
					  case AC.MsgStatus: 
						  val.status = searchTerm.value.status;
							break;
					  case AC.JunkStatus:
						  val.junkStatus = searchTerm.value.junkStatus;
							break;
					  case AC.Size:
						  val.size = searchTerm.value.size;
							break;
					  case AC.Label:
						  val.label = searchTerm.value.label; // might need special code for copying.
							break;
						case AC.FolderInfo:
						  val.folder = searchTerm.value.folder; // might need special code for copying.
							break;
						case AC.JunkPercent:
						  val.junkPercent = searchTerm.value.junkPercent; 
							break;
					}
					newTerm.value = val;
				}
				newTerm.booleanAnd = searchTerm.booleanAnd;
				if ('arbitraryHeader' in searchTerm) newTerm.arbitraryHeader = new String(searchTerm.arbitraryHeader);
				if ('hdrProperty' in searchTerm) newTerm.hdrProperty = new String(searchTerm.hdrProperty);
				if ('customId' in searchTerm) newTerm.customId = searchTerm.customId;
				newTerm.beginsGrouping = searchTerm.beginsGrouping;
				newTerm.endsGrouping = searchTerm.endsGrouping;
				
			}
			else
			  newTerm = searchTerm;
			// append newTerm ONLY if it deos not already exist (avoid duplicates!)
			// however: this logic is probably not desired if AND + OR are mixed!  (A && B) || (A && C)
			toFilter.appendTerm(newTerm);
		}
        // remove special variables
    if (replaceTerms) {
      delete (util.CurrentHeader);   
      delete (util.CurrentMessage);
    }
	} ,
	
	getActionCount: function getActionCount(filter) {
	  let actions = filter.actionList ? filter.actionList : filter.sortedActionList,
		    actionCount = actions.Count ? actions.Count() : actions.length;
		return actionCount;
	} ,
	
	copyActions: function copyActions(fromFilter, toFilter, suppressTargetFolder) {
    const Ci = Components.interfaces,
          FA = Ci.nsMsgFilterAction;
		let actionCount = this.getActionCount(fromFilter);
		for (let a = 0; a < actionCount; a++) {
			let action = fromFilter.getActionAt(a).QueryInterface(Ci.nsIMsgRuleAction),
			    append = true,
			    newActions = toFilter.actionList ? toFilter.actionList : toFilter.sortedActionList;
      // don't add dummy action to filter (customTemplate uses set prio=normal as only action)
      if (actionCount==1 
        &&
          action.type == FA.ChangePriority
        && 
          action.priority == Ci.nsMsgPriority.normal) {
          continue;
      }
			for (let b = 0; b < this.getActionCount(toFilter); b++) { 
				let ac = newActions.queryElementAt ?
					newActions.queryElementAt(b, Ci.nsIMsgRuleAction):
					newActions.QueryElementAt(b, Ci.nsIMsgRuleAction);
        // eliminate duplicates
				if (ac.type == action.type
						&& 
						ac.strValue == action.strValue) {
					append = false;
					break;
				}
			}
      if (suppressTargetFolder && action.type == FA.MoveToFolder)
        continue; // for custom filter templates, avoids duplicate folder move nonsense
			if (append)
				toFilter.appendAction(action);
		}
	} ,
  
  getIdentityMailAddresses: function getIdentityMailAddresses() {
    this.logDebug('getIdentityMailAddresses()');
    // make a stop list (my own email addresses)
    let acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
                        .getService(Components.interfaces.nsIMsgAccountManager);
                        
    let myMailAddresses = [];
    for (let account in fixIterator(acctMgr.accounts, Components.interfaces.nsIMsgAccount)) {
      try {
        let idMail = '';
        if (account.defaultIdentity) {
          idMail = account.defaultIdentity.email;
        }
        else if (account.identities.length) {
          idMail = account.identities[0].email; // outgoing identities
        }
        else {
          this.logDebug('getIdentityMailAddresses() found account without identities: ' + account.key);
        }
        if (idMail) {
          idMail = idMail.toLowerCase();
          if (idMail && myMailAddresses.indexOf(idMail)==-1) 
            myMailAddresses.push(idMail);
        }
      }
      catch(ex) {
        this.logException ('getIdentityMailAddresses()', ex);
      }
    }
    this.logDebugOptional("default", 'getIdentityMailAddresses - retrieved ' + myMailAddresses.length + ' Addresses' );
    return myMailAddresses;
  } ,
  
  extractEmail: function extractEmail(address, domainSwitch) {
    // filter out only mail portion
    let adp = address.match(/[^@<\s]+@[^@\s>]+/g)[0];
    if (!adp) adp = address
    // regex to strip out the email address
    if (domainSwitch) {
      let at = adp.indexOf('@');
      if (at>0) {
        return adp.substr(at);
      }
    }
    return adp;
  }  ,
  
  filterCustomTemplates: function filterCustomTemplates(attempt) {
    const util = quickFilters.Util;
    attempt++;
    util.logDebugOptional('template.custom','filterCustomTemplates(' + attempt + ')');
    let fWin = util.getLastFilterListWindow(),
        isProcessed = false;
    if (fWin) { 
      let list = fWin.quickFilters.List;
      if (list) {
        list.toggleSearchType('name');
        // this will currently not work with SeaMonkey / Postbox (no search box)
        let searchBox = fWin.document.getElementById("searchBox");
        util.logDebugOptional('template.custom','filterCustomTemplates - searchBox=' + searchBox);
        if (searchBox) {
          searchBox.value = 'quickFilterCustomTemplate';
          isProcessed = true;
          util.logDebugOptional('template.custom','getLastFilterListWindow() calls onFindFilter...');
          list.onFindFilter(false);
        }
      }
    }
    if (!isProcessed) {
      util.logDebugOptional('template.custom','getLastFilterListWindow() not able to process yet...');
      if (attempt<10) {
        window.setTimeout(function() { 
          debugger;
          const util = quickFilters.Util;
          util.logDebugOptional('template.custom','timeout - filterCustomTemplates(' + attempt + ')..');
          util.filterCustomTemplates(attempt); 
        }, 250);
      }
      else
        util.logDebugOptional('template.custom','Giving up on filtering for custom templates.');
    }
  } ,

  editCustomTemplates: function editCustomTemplates() {
      const util = quickFilters.Util;
      try {
        // we need to select Local Folders
        // and then filter for name "quickFilterCustomTemplate:"
        // see searchFiltersFromFolder
        let win = util.getMail3PaneWindow(),
            localFolder = util.getMsgFolderFromUri('mailbox://nobody@Local%20Folders'),
            qF = win.quickFilters; // , filtersList = localFolder.getEditableFilterList(null)
        qF.Worker.openFilterList(true, localFolder, null, null);
        // only show custom templates, on timeout if not ready
        // we are not using this Util as the originating window will be closed
        qF.Util.filterCustomTemplates(0); 
      } 
      catch (ex) {
        util.logException('editCustomTemplates failed', ex);
      }
  } ,
  
  getFilterList: function getFilterList(folder, win) {
    if (typeof folder.getEditableFilterList === "undefined" || !win)
      return folder.server.getFilterList(null); // Postbox
    return folder.getEditableFilterList(win);
  },
  
  createCustomTemplate: function editCustomTemplates() {
    const Ci = Components.interfaces, 
          Cc = Components.classes,
          nsMsgFilterType = Ci.nsMsgFilterType,    
          nsMsgFilterAction = Ci.nsMsgFilterAction,
          nsMsgPriority = Ci.nsMsgPriority,
          typeAttrib = Ci.nsMsgSearchAttrib,
          typeOperator = Ci.nsMsgSearchOp;
    let util = quickFilters.Util,
        prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService),
        input = {value: ""},
        check = {value: false},
        promptLabel = util.getBundleString('quickfilters.prompt.customTemplateName', 
                             'Name of Custom Template:'),
        result = prompts.prompt(window, 'quickFilters', promptLabel, input, null, check); 
    if (!result)
      return false;
    else {
      // make new filter
      let filterName = 'quickFilterCustomTemplate: ' + input.value,
          localFolder = util.getMsgFolderFromUri('mailbox://nobody@Local%20Folders'),
          filtersList = util.getFilterList(localFolder),
          filterCount = filtersList.filterCount;
      // make sure it is unique
      for (let i = 0; i < filterCount; i++) {
        let filter = filtersList.getFilterAt(i);
        if (filterName == filter.filterName) {
          let wrn = util.getBundleString('quickfilters.warning.templateNameNotUnique', 
                                         'A filter of this name already exists! It must be unique.');

          util.popupAlert(wrn);
          return false;
        }
      }
      let targetFilter = filtersList.createFilter(filterName);
      // at least one action is necessary!
      let dummyAction = targetFilter.createAction();
      dummyAction.type = nsMsgFilterAction.ChangePriority; 
      dummyAction.priority = nsMsgPriority.normal; // 4
      targetFilter.appendAction(dummyAction);
      let searchTerm = targetFilter.createTerm();
      searchTerm.attrib = typeAttrib.Sender;
      searchTerm.op = typeOperator.Contains;
      // at least one search Term is necessary
      let value = searchTerm.value,
          val = "%from(mail)%";
      value.attrib = searchTerm.attrib;
      value.str = val;
      searchTerm.value = value;
      targetFilter.appendTerm(searchTerm);
      // name it and open editor
      targetFilter.filterType = nsMsgFilterType.Manual;
      targetFilter.filterName = filterName;
      
      filtersList.insertFilterAt(0, targetFilter);
      
      /************************************
        ***  OPEN FILTER RULES DIALOG   ***
        ***********************************
        */
      setTimeout( function() {
        let args = { filter:targetFilter, filterList: filtersList};
        util.getMail3PaneWindow().openDialog("chrome://messenger/content/FilterEditor.xul", "",
                          "chrome, modal, resizable,centerscreen,dialog=yes", args);
        if ("refresh" in args && args.refresh) {
          // [Ok]
          if (quickFilters.Preferences.getBoolPref("showListAfterCreateFilter")) {
            quickFilters.Worker.openFilterList(true, localFolder, targetFilter);
          }
        }
        else {
          // [Cancel]
          filtersList.removeFilterAt(0);
        }
      } );
      return true;
    }
  }
  
}; // Util

  // -------------------------------------------------------------------
  // Get header string
  // -------------------------------------------------------------------
quickFilters.clsGetHeaders = function classGetHeaders(messageURI) {
  const Ci = Components.interfaces,
        Cc = Components.classes;
  let util = quickFilters.Util,
      messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger),
      messageService = messenger.messageServiceFromURI(messageURI),
      messageStream = Cc["@mozilla.org/network/sync-stream-listener;1"].createInstance().QueryInterface(Ci.nsIInputStream),
      inputStream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance().QueryInterface(Ci.nsIScriptableInputStream);

  util.logDebugOptional('functions','clsGetHeaders(' + messageURI + ')');
  let headers = Cc["@mozilla.org/messenger/mimeheaders;1"]
              .createInstance().QueryInterface(Ci.nsIMimeHeaders);
/*   
  // ASYNC MIME HEADERS

  let testStreamHeaders = true; // new code!
  var asyncUrlListener = new AsyncUrlListener();
  
  if (testStreamHeaders) {
    // http://mxr.mozilla.org/comm-central/source/mailnews/base/public/nsIMsgMessageService.idl#190
    
    // http://mxr.mozilla.org/comm-central/source/mailnews/imap/test/unit/test_imapHdrStreaming.js#101
    let messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
    let msgService = messenger.messageServiceFromURI(messageURI); // get nsIMsgMessageService
    msgService.streamHeaders(msgURI, streamListenerST4, asyncUrlListener,true);    
    yield false;
  }
  // ==
  let msgContent = new String(streamListenerST4._data);
  headers.initialize(msgContent, msgContent.length);
*/  
  
  inputStream.init(messageStream);
  try {
    messageService.streamMessage(messageURI, messageStream, msgWindow, null, false, null);
  }
  catch (ex) {
    util.logException('clsGetHeaders - constructor - messageService.streamMessage failed', ex);
    return null;
  }

  let msgContent = "",
      contentCache = "";
  try {
    while (inputStream.available()) { 
      msgContent = msgContent + inputStream.read(2048); 
      let p = msgContent.search(/\r\n\r\n|\r\r|\n\n/); //todo: it would be faster to just search in the new block (but also needs to check the last 3 bytes)
      if (p > 0) {
        contentCache = msgContent.substr(p + (msgContent[p] == msgContent[p+1] ? 2 : 4));
        msgContent = msgContent.substr(0, p) + "\r\n";
        break;
      }
      if (msgContent.length > 2048 * 8) {
        util.logDebug('clsGetHeaders - early exit - msgContent length>16kB: ' + msgContent.length);
        return null;
      }
    }
  }
  catch(ex) {
    util.logException('Reading inputStream failed:', ex);
    if (!msgContent) throw(ex);
  }
  
  headers.initialize(msgContent, msgContent.length);
  util.logDebugOptional('mime','allHeaders: \n' +  headers.allHeaders);

  // -----------------------------------
  // Get header
  function get(header) {
    // /nsIMimeHeaders.extractHeader
    let retValue = '',
        str = headers.extractHeader(header, false),
        isUnescapeQuotes = false;
    // for names maybe use nsIMsgHeaderParser.extractHeaderAddressName instead?
    if (str && isUnescapeQuotes) {
      // if a string has nested escaped quotes in it, should we unescape them?
      // "Al \"Karsten\" Seltzer" <fxxxx@gmail.com>
      retValue = str.replace(/\\\"/g, "\""); // unescape
    }
    else
      retValue = str ? str : "";
    // SmartTemplate4.regularize.headersDump += 'extractHeader(' + header + ') = ' + retValue + '\n';
    return retValue;
  };
  
  // -----------------------------------
  // Get content
  /*
  function content(size) {
    while (inputStream.available() && contentCache.length < size) 
      contentCache += inputStream.read(2048);
    if (contentCache.length > size) return contentCache.substr(0, size);
    else return contentCache;
  };*/

  // -----------------------------------
  // Public methods
  this.get = get;
  // this.content = content;
  return null;    
} ; // clsGetHeaders


quickFilters.mimeDecoder = {
	headerParam: Components
	             .classes["@mozilla.org/network/mime-hdrparam;1"]
	             .getService(Components.interfaces.nsIMIMEHeaderParam),
	cvtUTF8 : Components
	             .classes["@mozilla.org/intl/utf8converterservice;1"]
	             .getService(Components.interfaces.nsIUTF8ConverterService),
	// -----------------------------------
	// Detect character set
	// jcranmer: this is really impossible based on such short fields
	// see also: hg.mozilla.org/users/Pidgeot18_gmail.com/patch-queues/file/cd19874b48f8/patches-newmime/parser-charsets
	//           http://encoding.spec.whatwg.org/#interface-textdecoder
	//           
	detectCharset: function mime_detectCharset(str) {
		let charset = "", 
        util = quickFilters.Util;
		 // not supported                  
		 // #    RFC1555 ISO-8859-8 (Hebrew)
		 // #    RFC1922 iso-2022-cn-ext (Chinese extended)

		if (str.search(/\x1b\$[@B]|\x1b\(J|\x1b\$\(D/gi) !== -1) {   // RFC1468 (Japanese)
		  charset = "iso-2022-jp"; 
		} 
		if (str.search(/\x1b\$\)C/gi) !== -1)                    {   // RFC1557 (Korean)
		  charset = "iso-2022-kr"; 
		} 
		if (str.search(/~{/gi) !== -1)                           {   // RFC1842 (Chinese ASCII)
		  charset = "HZ-GB-2312"; 
		}
		if (str.search(/\x1b\$\)[AG]|\x1b\$\*H/gi) !== -1)       {   // RFC1922 (Chinese) 
		  charset = "iso-2022-cn"; 
		}
		if (str.search(/\x1b\$\(D/gi) !== -1) {  // RFC2237 (Japanese 1)
		  charset = "iso-2022-jp-1"; 
		}
		if (!charset) { 
			let defaultSet = "ISO-8859-1"; // SmartTemplate4.Preferences.getMyStringPref ('defaultCharset');
			charset = defaultSet ? defaultSet : '';  // should we take this from Thunderbird instead?
		}
		util.logDebugOptional('mime','mimeDecoder.detectCharset guessed charset: ' + charset +'...');
		return charset;
	},

	// -----------------------------------
	// MIME decoding.
	decode: function mime_decode(theString, charset) {
		let decodedStr = "";

		try {
			if (/=\?/.test(theString)) {
				// RFC2231/2047 encoding.
				// We need to escape the space and split by line-breaks,
				// because getParameter stops convert at the space/line-breaks.
        // => some russian mail servers use tab character as delimiter
        //    some even use a space character between 2 encoding blocks
        theString = theString.replace ("?= =?", "?=\n=?"); // space problem
				let array = theString.split(/\s*\r\n\s*|\s*\r\s*|\s*\n\s*|\s*\t\s*/g);
				for (let i = 0; i < array.length; i++) {
					decodedStr += this.headerParam
					                  .getParameter(array[i].replace(/%/g, "%%").replace(/ /g, "-%-"), null, charset, true, { value: null })
					                  .replace(/-%-/g, " ").replace(/%%/g, "%");
				}
			}
			else {
				// for Mailers who have no manners.
				if (charset === "")
					charset = this.detectCharset(theString);
				let skip = charset.search(/ISO-2022|HZ-GB|UTF-7/gmi) !== -1;
				// this will always fail if theString is not an ACString?
				decodedStr = this.cvtUTF8.convertStringToUTF8(theString, charset, skip);
			}
		}
		catch(ex) {
			quickFilters.Util.logDebugOptional('mime','mimeDecoder.decode(' + theString + ') failed with charset: ' + charset
			    + '...\n' + ex);
			return theString;
		}
		return decodedStr;
	} ,

	// -----------------------------------
	// Split addresses and change encoding.
  // addrstr - comma separated string of address-parts
  // charset - character set of target string (probably silly to have one for all)
  // format - list of parts for target string: name, firstName, lastName, mail, link, bracketMail()
	split: function mime_split(addrstr, charset, format, bypassCharsetDecoder)	{
    let util = quickFilters.Util
	  // jcranmer: you want to use parseHeadersWithArray
		//           that gives you three arrays
	  //           the first is an array of strings "a@b.com", "b@b.com", etc.
		//           the second is an array of the display names, I think fully unquoted
    //           the third is an array of strings "Hello <a@b.com>"
		//           preserveIntegrity is used, so someone with the string "Dole, Bob" will have that be quoted I think
		//           if you don't want that, you'd have to pass to unquotePhraseOrAddrWString(value, false)
		//           oh, and you *don't* need to decode first, though you might want to
		// see also: https://bugzilla.mozilla.org/show_bug.cgi?id=858337
		//           hg.mozilla.org/users/Pidgeot18_gmail.com/patch-queues/file/587dc0232d8a/patches-newmime/parser-tokens#l78
		// use https://developer.mozilla.org/en-US/docs/XPCOM_Interface_Reference/nsIMsgDBHdr
		// mime2DecodedAuthor, mime2DecodedSubject, mime2DecodedRecipients!
	  function _getEmailAddress(a) {
			return a.replace(/.*<(\S+)>.*/g, "$1");
		}

		function _isLastName(format) { return (format.search(/^\(lastname[,\)]/, "i") != -1); };
    function _getBracketAddressArgs(format) { 
      let reg = /bracketMail\[(.+?)\]/g, // we have previously replaced bracketMail(*) with bracketMail[*] !
          ar = reg.exec(format);
      if (ar && ar.length>1)
        return ar[1];
      return '';
    };
    function _getCardFromAB(mail) {
      if (!mail) return null;
      // https://developer.mozilla.org/en-US/docs/Mozilla/Thunderbird/Address_Book_Examples
      // http://mxr.mozilla.org/comm-central/source/mailnews/addrbook/public/nsIAbCard.idl
      
      let allAddressBooks;

      if (util.Application === "Postbox") {
         // mailCore.js:2201 
         // abCardForEmailAddress(aEmailAddress, aAddressBookOperations, aAddressBook)
         let card = abCardForEmailAddress(mail,  Components.interfaces.nsIAbDirectory.opRead, {});
         if (card) return card;
         return null;
      }
      else {
        let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
        allAddressBooks = abManager.directories; 
      }
      while (allAddressBooks.hasMoreElements()) {
        let addressBook = allAddressBooks.getNext()
                                         .QueryInterface(Components.interfaces.nsIAbDirectory);
        if (addressBook instanceof Components.interfaces.nsIAbDirectory) { // or nsIAbItem or nsIAbCollection
          // alert ("Directory Name:" + addressBook.dirName);
          try {
            let card = addressBook.cardForEmailAddress(mail);
            if (card)
              return card;
          }
          catch(ex) {
            util.logDebug('Problem with Addressbook: ' + addressBook.dirName + '\n' + ex) ;
          }
        }
      }
      return null;
    }

    // return the bracket delimiteds
		function _getBracketDelimiters(element) {
      let del1='', del2='',
          bracketExp = element.field;
      if (bracketExp) {
        // bracketMail()% use to "wrap" mail address with non-standard characters
        // bracketMail(square)%    [email]  - square brackets
        // bracketMail(round)%     (email)   - round brackets
        // bracketMail(angle)%     <email>   - angled brackets
        // bracketMail(;)%      email
        // bracketMail(<;>)%    <email>
        // bracketMail(";")%    "email"
        // bracketMail(= ;)%     = email
        // etc.
        // the expression between brackets can also have empty delimiters; e.g. bracketMail(- ;) will prefix "- " and append nothing
        // we use ; as delimiter between the bracket expressions to avoid wrongly splitting format string elsewhere
        // (Should we allow escaped round brackets?)
        if (!bracketParams.trim())
          bracketParams = 'angle';
        let delimiters = bracketParams.split(';');
        switch(delimiters.length) {
          case 0: // error
            break;
          case 1: // special case
            switch(delimiters[0]) {
              case 'square':
                del1 = '[';
                del2 = ']';
                break;
              case 'round':
                del1 = '(';
                del2 = ')';
                break;
              case 'angle': case 'angled':
                del1 = '<'; // <
                del2 = '>';  // >
                break;
              default:
                del1 = '?';
                del2 = '?';
            }
            break;
          default: // delimiters separated by ; 3 and more are ignored.
            del1 = delimiters[0];
            del2 = delimiters[1];
            break;
        }
      }
      return [del1, del2];
    }
    
    //  %from% and %to% default to mail only for filtering
    if (typeof format=='undefined' || format == '') {
      format = 'mail'; 
    }
    
		util.logDebugOptional('mime.split',
         '====================================================\n'
       + 'mimeDecoder.split(charset decoding=' + (bypassCharsetDecoder ? 'bypassed' : 'active') + ')\n'
       + '  addrstr:' +  addrstr + '\n'
       + '  charset: ' + charset + '\n'
       + '  format: ' + format + '\n'
       + '====================================================');
		// if (!bypassCharsetDecoder)
			// addrstr = this.decode(addrstr, charset);
		// Escape % and , characters in mail addresses
		addrstr = addrstr.replace(/"[^"]*"/g, function(s){ return s.replace(/%/g, "%%").replace(/,/g, "-%-"); });
		util.logDebugOptional('mime.split', 'After escaping special chars in mail address field:\n' + addrstr);

    /** SPLIT ADDRESSES **/
		let array = addrstr.split(/\s*,\s*/);
    
    /** SPLIT FORMAT PLACEHOLDERS **/
		// possible values for format are:
		// name, firstname, lastname, mail - fields (to be extended)
    // bracketMail(args) - special function (we replaced the round brackets with [] for parsing)
    // link, islinkable  - these are "modifiers" for the previous list element
    let formatArray = [];
    if (format) {
      // remove parentheses
      if (format.charAt(0)=='(')
        format = format.slice(1);
      if (format.charAt(format.length-1)==')')
        format = format.slice(0, -1);
      
      let fs=format.split(',');
      for(let i=0; i<fs.length; i++) {
        let ff = fs[i].trim();
        // if next one is a link modifier, modify previous element and continue
        switch(ff.toLowerCase()) {
          case 'link':
            formatArray[formatArray.length-1].modifier = 'linkTo';
            continue;
          case 'islinkable':
            formatArray[formatArray.length-1].modifier = 'linkable';
            continue;
        }
        formatArray.push ({ field: ff, modifier: ''}); // modifier: linkTo
      }
    }
    
    let dbgText = 'addrstr.split() found [' + array.length + '] addresses \n' + 'Formats:\n';
    for (let i=0; i<formatArray.length; i++) {
      dbgText += formatArray[i].field;
      if (formatArray[i].modifier)  
        dbgText += '(' + formatArray[i].modifier + ')';
      dbgText += '\n';
    }
    util.logDebugOptional('mime.split', dbgText);
    
		let addresses = "",
        address,
        bracketParams = _getBracketAddressArgs(format); 

    // if (SmartTemplate4.Preferences.Debug) debugger;
    /** ITERATE ADDRESSES  **/
		for (let i = 0; i < array.length; i++) {
			if (i > 0) {
				addresses += ", ";
			}
      let addressee = '',
          firstName = '', 
          lastName = '',
          fullName = '',
          emailAddress = '',
          addressField = array[i];
      // [Bug 25816] - missing names caused by differing encoding
      // MIME decode (moved into the loop)
      if (!bypassCharsetDecoder)
        addressField = this.decode(array[i], charset);
      
			// Escape "," in mail addresses
			array[i] = addressField.replace(/\r\n|\r|\n/g, "")
			                   .replace(/"[^"]*"/,
			                   function(s){ return s.replace(/-%-/g, ",").replace(/%%/g, "%"); });
			// name or/and address
			address = array[i].replace(/^\s*([^<]\S+[^>])\s*$/, "<$1>").replace(/^\s*(\S+)\s*\((.*)\)\s*$/, "$2 <$1>");
      
      util.logDebugOptional('mime.split', 'processing: ' + addressField + ' => ' + array[i] + '\n'
                                           + 'address: ' + address);
      // [Bug 25643] get name from Addressbook
      emailAddress = _getEmailAddress(address); // get this always
      // this cuts off the angle-bracket address part: <fredflintstone@fire.com>
      addressee = address.replace(/\s*<\S+>\s*$/, "")
                      .replace(/^\s*\"|\"\s*$/g, "");  // %to% / %to(name)%
      if (!addressee) { // if no addressee part found we probably have only an email address.; take first part before the @
        addressee = address.slice(0, address.indexOf('@'));
        if (addressee.charAt('0')=='<')
          addressee = addressee.slice(1);
      }
      // if somebody repeats the email address instead of a name at front, e.g. a.x@tcom, we cut the domain off anyway
      if (addressee.indexOf('@')>0)
        addressee = addressee.slice(0, addressee.indexOf('@'));
			fullName = addressee.trim();
      
      let names = fullName.split(' '),
          isOnlyOneName = (names.length==1) ? true : false;
      if (!firstName) firstName = (names.length) ? names[0] : '';
      if (!lastName) lastName = (names.length>1) ? names[names.length-1] : '';
      
      // build the part!
      addressField = ''; // reset to finalize
      for (let j=0; j<formatArray.length; j++)  {
        let element = formatArray[j],
            part = ''; 
        switch(element.field.toLowerCase()) {
          case 'mail':
            part = emailAddress;
            break;
          case 'name':
            if (fullName)
              part = fullName;
            else
              part = address.replace(/.*<(\S+)@\S+>.*/g, "$1"); // email first part fallback
            break;
          case 'firstname':
            part = firstName;
            break;
          case 'domain': // cut off 'name@' to retrieve only domain portion of mail
            part = emailAddress.substring(emailAddress.indexOf('@')+1);
            break;
          case 'lastname':
            if (isOnlyOneName && format.indexOf('firstname')<0) {
              part = firstName; // fall back to first name if lastName was 
                                // 'emptied' because of duplication
            }
            else
              part = lastName;
            break;
          default:
            if (element.field.indexOf('bracketMail[')==0) {
              let open, close;
              [open, close] = _getBracketDelimiters(element);
              part = emailAddress ? open + emailAddress + close : '';
            }
            break;
        }
        if (element.modifier =='linkTo') {
          part = "<a href=mailto:" + emailAddress + ">" + part + "</a>"; // mailto
        }

        // append the next part
        if (part.length>1) {
          // space to append next parts
          if(j) addressField += ' ';
          addressField += part;
        }
      }
      
      util.logDebugOptional('mime.split', 'adding formatted address: ' + addressField);
      addresses += addressField;
		}
		return addresses;
	} // split
};  // mimeDecoder