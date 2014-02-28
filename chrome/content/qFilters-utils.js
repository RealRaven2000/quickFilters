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

if (Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo).ID != "postbox@postbox-inc.com")
{
  Components.utils.import("resource:///modules/MailUtils.js");
}

quickFilters.Properties = {
  bundle: Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService).createBundle("chrome://quickfilters/locale/overlay.properties"),

  getLocalized: function(msg) {
    // var testB = this.bundle.createBundle("chrome://quickfilters/locale/overlay.properties");

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
  HARDCODED_EXTENSION_VERSION : "2.4.1",
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
		
  getMsgFolderFromUri:  function(uri, checkFolderAttributes) {
    let msgfolder = null;
    if (typeof MailUtils != 'undefined' && MailUtils.getFolderForURI) {
      return MailUtils.getFolderForURI(uri, checkFolderAttributes);
    }
    try {
      let resource = GetResourceFromUri(uri);
      msgfolder = resource.QueryInterface(Components.interfaces.nsIMsgFolder);
      if (checkFolderAttributes) {
        if (!(msgfolder && (msgfolder.parent || msgfolder.isServer))) {
          msgfolder = null;
        }
      }
    }
    catch (ex) {
       //dump("failed to get the folder resource\n");
    }
    return msgfolder;
  } ,

  getBundleString: function(id, defaultText) {
    try {
      var s= quickFilters.Properties.getLocalized(id);
    }
    catch(e) {
      s = defaultText;
      this.logException ("Could not retrieve bundle string: " + id, e);
    }
    return s;
  } ,

  getMail3PaneWindow: function() {
    let windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1']
        .getService(Components.interfaces.nsIWindowMediator);
    var win3pane = windowManager.getMostRecentWindow("mail:3pane");
    return win3pane;
  } ,

  get AppverFull() {
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
            .getService(Components.interfaces.nsIXULAppInfo);
    return appInfo.version;
  },

  get Appver() {
    if (null === this.mAppver) {
    var appVer=this.AppverFull.substr(0,3); // only use 1st three letters - that's all we need for compatibility checking!
      this.mAppver = parseFloat(appVer); // quick n dirty!
    }
    return this.mAppver;
  },

  get Application() {
    if (null===this.mAppName) {
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
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
      var osString = Components.classes["@mozilla.org/xre/app-info;1"]
            .getService(Components.interfaces.nsIXULRuntime).OS;
      this.mHost = osString.toLowerCase();
    }
    return this.mHost; // linux - winnt - darwin
  },

  // this is done asynchronously, so it respawns itself
  VersionProxy: function() {
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
      quickFilters.Util.logToConsole("QuickFolder VersionProxy failed - are you using an old version of " + quickFilters.Util.Application + "?"
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
    var current = quickFilters.Util.HARDCODED_EXTENSION_VERSION + quickFilters.Util.HARDCODED_EXTENSION_TOKEN;

    if (!Components.classes["@mozilla.org/extensions/manager;1"]) {
      // Addon Manager: use Proxy code to retrieve version asynchronously
      quickFilters.Util.VersionProxy(); // modern Mozilla builds.
                        // these will set mExtensionVer (eventually)
                        // also we will delay FirstRun.init() until we _know_ the version number
    }
    else  // --- older code: extensions manager.
    {
      try {
        if(Components.classes["@mozilla.org/extensions/manager;1"])
        {
          var gExtensionManager = Components.classes["@mozilla.org/extensions/manager;1"]
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
  
  getVersionSimple: function(ver) {
    let pureVersion = ver;  // default to returning unchanged
    // get first match starting with numbers mixed with .   
    let reg = new RegExp("[0-9.]*");
    let results = ver.match(reg); 
    if (results) 
      pureVersion = results[0];
    return pureVersion;
  } ,

  isVirtual: function(folder) {
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
	
	getTabInfoByIndex: function(tabmail, idx) {
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
		var doc = this.getMail3PaneWindow().document;
		let tabmail = doc.getElementById("tabmail");
		return tabmail;
	} ,
	
	// likely obsolete ###
	// use this to temporarily open a tab for a folder if the msgDatabase remains invalid.
	// there should be another way to do this, but for the moment this is the workaround.
	openTempFolderInNewTab: function(folder, background) {
		var win = this.getMail3PaneWindow();
		let tabmail = this.tabmail;
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
	closeTempFolderTab: function() {
	  if(this.tempFolderTab) {
		  if (this.tabmail.closeTab)
				this.tabmail.closeTab(this.tempFolderTab);
			else  // postbox
				this.tabmail.removeTab(this.tempFolderTab, {skipAnimation: true});
			this.tempFolderTab = null;
		}
	} ,
	
  slideAlert: function (text, title, icon) {
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
  
  popupAlert: function (text, title, icon) {
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
        let notificationBox = document.getElementById('quickFilterNotificationBox');
        let priority = notificationBox.PRIORITY_WARNING_MEDIUM;
        // appendNotification( label , value , image , priority , buttons, eventCallback )
        let note = notificationBox.appendNotification( text , null , icon , priority, null, null ); 
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

        //let check = {value: false};   // default the checkbox to true
        prompts.alert(window, title, text); 
      }
    }
    catch(e) {
      // prevents runtime error on platforms that don't implement nsIAlertsService
      this.logException ("quickFilter.util.popupAlert() ", e);
      alert(text);
    }
  } ,

  showStatusMessage: function(s) {
    try {
      var sb = this.getMail3PaneWindow().document.getElementById('status-bar');
      var el, sbt;
      if (sb) {
        for(var i = 0; i < sb.childNodes.length; i++)
        {
          el = sb.childNodes[i];
          if (el.nodeType === 1 && el.id === 'statusTextBox') {
            sbt = el;
              break;
          }
        }
        for(var i = 0; i < sbt.childNodes.length; i++)
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

  getCurrentFolder: function() {
    var aFolder;
    if (typeof(GetLoadedMsgFolder) != 'undefined') {
      aFolder = GetLoadedMsgFolder();
    }
    else
    {
      var currentURI;
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
	
	// postbox helper function
	pbGetSelectedMessages : function ()
	{
	  var messageList = [];
	  // guard against any other callers.
	  if (quickFilters.Util.Application != 'Postbox')
		  throw('pbGetSelectedMessages: Postbox specific function!');
			
	  try {
	    var messageArray = {};
	    var length = {};
	    var view = GetDBView();
	    view.getURIsForSelection(messageArray, length);
	    if (length.value) {
			  let messageUris = messageArray.value;
				//let messageIdList = [];
				// messageList = Components.classes["@mozilla.org/supports-array;1"].createInstance(Components.interfaces.nsISupportsArray);
				for (let i = 0; i < messageUris.length; i++) {
					let messageUri = messageUris[i];
					let Message = messenger.messageServiceFromURI(messageUri).messageURIToMsgHdr(messageUri);
					messageList.push(Message);
				}
	    	return messageList;
			}
	    else
	    	return null;
	  }
	  catch (ex) {
	    dump("GetSelectedMessages ex = " + ex + "\n");
	    return null;
	  }
	} ,
	

  logTime: function() {
    var timePassed = '';
    try { // AG added time logging for test
      var end= new Date();
      var endTime = end.getTime();
      if (this.lastTime === 0) {
        this.lastTime = endTime;
        return "[logTime init]"
      }
      var elapsed = new String(endTime - this.lastTime); // time in milliseconds
      timePassed = '[' + elapsed + ' ms]   ';
      this.lastTime = endTime; // remember last time
    }
    catch(e) {;}
    return end.getHours() + ':' + end.getMinutes() + ':' + end.getSeconds() + '.' + end.getMilliseconds() + '  ' + timePassed;
  },

  logToConsole: function (msg, optionTag) {
    if (quickFilters.Util.ConsoleService === null)
      quickFilters.Util.ConsoleService = Components.classes["@mozilla.org/consoleservice;1"]
                  .getService(Components.interfaces.nsIConsoleService);
    quickFilters.Util.ConsoleService.logStringMessage("quickFilters " 
			+ (optionTag ? '{' + optionTag.toUpperCase() + '} ' : '')
			+ this.logTime() + "\n"+ msg);
  },

  // flags
  // errorFlag    0x0   Error messages. A pseudo-flag for the default, error case.
  // warningFlag    0x1   Warning messages.
  // exceptionFlag  0x2   An exception was thrown for this case - exception-aware hosts can ignore this.
  // strictFlag     0x4
  logError: function (aMessage, aSourceName, aSourceLine, aLineNumber, aColumnNumber, aFlags)
  {
    var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                                   .getService(Components.interfaces.nsIConsoleService);
    var aCategory = '';

    var scriptError = Components.classes["@mozilla.org/scripterror;1"].createInstance(Components.interfaces.nsIScriptError);
    scriptError.init(aMessage, aSourceName, aSourceLine, aLineNumber, aColumnNumber, aFlags, aCategory);
    consoleService.logMessage(scriptError);
  } ,

  logException: function (aMessage, ex) {
    var stack = '';
    if (typeof ex.stack!='undefined')
      stack= ex.stack.replace("@","\n  ");

    let srcName = ex.fileName ? ex.fileName : "";
    this.logError(aMessage + "\n" + ex.message, srcName, stack, ex.lineNumber, 0, 0x1); // use warning flag, as this is an exception we caught ourselves
  } ,

  logDebug: function (msg) {
    if (quickFilters.Preferences.Debug)
      this.logToConsole(msg);
  },

  logDebugOptional: function (option, msg) {
    if (quickFilters.Preferences.isDebugOption(option))
      this.logToConsole(msg, option);
  },
	
	getAccountsPostbox: function() {
	  let accounts=[];
		var smartServers = accountManager.allSmartServers;
		for (var i = 0; i < smartServers.Count(); i++)
		{
			var smartServer = smartServers.QueryElementAt(i, Ci.nsIMsgIncomingServer);
			var account_groups = smartServer.getCharValue("group_accounts");
			if (account_groups)
			{
				var groups = account_groups.split(",");
				for each (var accountKey in groups)
				{
					var account = accountManager.getAccount(accountKey);
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
  openLinkInBrowserForced: function(linkURI) {
    let Ci = Components.interfaces;
    try {
      this.logDebug("openLinkInBrowserForced (" + linkURI + ")");
      if (quickFilters.Util.Application==='SeaMonkey') {
        var windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
        var browserWin = windowManager.getMostRecentWindow( "navigator:browser" );
        if (browserWin) {
          let URI = linkURI;
          setTimeout(function() { 
						let tabBrowser = browserWin.getBrowser();
						let params = {"selected":true};
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
      var service = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
        .getService(Ci.nsIExternalProtocolService);
      var ioservice = Components.classes["@mozilla.org/network/io-service;1"].
            getService(Ci.nsIIOService);
      var uri = ioservice.newURI(linkURI, null, null);
      service.loadURI(uri);
    }
    catch(e) { this.logDebug("openLinkInBrowserForced (" + linkURI + ") " + e.toString()); }
  },


  // moved from options.js
  // use this to follow a href that did not trigger the browser to open (from a XUL file)
  openLinkInBrowser: function(evt,linkURI) {
    let Cc = Components.classes;
    let Ci = Components.interfaces;
    if (quickFilters.Util.Application === 'Thunderbird') {
      var service = Cc["@mozilla.org/uriloader/external-protocol-service;1"]
        .getService(Ci.nsIExternalProtocolService);
      var ioservice = Cc["@mozilla.org/network/io-service;1"].
            getService(Ci.nsIIOService);
      service.loadURI(ioservice.newURI(linkURI, null, null));
      if(null !== evt)
        evt.stopPropagation();
    }
    else {
      this.openLinkInBrowserForced(linkURI);
    }
  },

  // moved from options.js (then called
  openURL: function(evt,URL) { // workaround for a bug in TB3 that causes href's not be followed anymore.
    var ioservice,iuri,eps;

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

  openURLInTab: function (URL) {
    try {
		  switch(quickFilters.Util.Application) {
			  case "SeaMonkey":
					this.openLinkInBrowserForced(URL);
					return;
				case "Postbox":
					this.openLinkInBrowser(null, URL);
					return;
				case "Thunderbird":
					var sTabMode="";
					let tabmail = this.tabmail;
					if (!tabmail) {
						// Try opening new tabs in an existing 3pane window
						var mail3PaneWindow = this.getMail3PaneWindow();
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
	
	debugMsgAndFolders: function(label1, val1, targetFolder, msg, filterAction) {
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
	makeMessageListEntry: function (msgHeader) {
	  return {"messageId":msgHeader.messageId, "msgHeader":msgHeader};
	} ,

  createMessageIdArray: function(targetFolder, messageUris) {
    let Ci = Components.interfaces;
    try {
      try {quickFilters.Util.logDebugOptional('dnd', 'quickFilters.Util.createMessageIdArray: target = ' + targetFolder.prettiestName );}
      catch(e) { alert('quickFilters.Util.createMessageIdArray:' + e); }

      if (targetFolder.flags & this.FolderFlags.Virtual) {  // Ci.nsMsgFolderFlags.Virtual
        return null;
      }

      let messageIdList = [];
      for (var i = 0; i < messageUris.length; i++) {
        let Uri = messageUris[i];
        let msgHeader = messenger.messageServiceFromURI(Uri).messageURIToMsgHdr(Uri); // retrieve nsIMsgDBHdr
        messageIdList.push(this.makeMessageListEntry(msgHeader));  // ### [Bug 25688] Creating Filter on IMAP fails after 7 attempts ###
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
  installButton: function(toolbarId, id, afterId) {
    if (!document.getElementById(id)) {
      this.logDebug("installButton(" + toolbarId + "," + id + "," + afterId + ")");

      var toolbar = document.getElementById(toolbarId);

      // If no afterId is given, then append the item to the toolbar
      var before = null;
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

  showVersionHistory: function(ask) {
    let version = quickFilters.Util.VersionSanitized;
    let sPrompt = quickFilters.Util.getBundleString("quickfilters.confirmVersionLink", "Display version history for quickFilters")
    if (!ask || confirm(sPrompt)) {
      quickFilters.Util.openURL(null, "http://quickfilters.mozdev.org/version.html#" + version);
    }
  } ,

  showDonatePage: function () {
    quickFilters.Util.openURLInTab('http://quickfilters.mozdev.org/donate.html');
  }  ,

  showHomePage: function (queryString) {
	  if (!queryString) queryString='index.html';
    quickFilters.Util.openURLInTab('http://quickfilters.mozdev.org/' + queryString);
  } ,
	
	toggleDonations: function() {
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
  fixLineWrap: function(notifyBox, notificationKey) {
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
  
  versionSmaller: function(a, b) {
    /*
      Compares Application Versions
      returns
      - is smaller than 0, then A < B
      -  equals 0 then Version, then A==B
      - is bigger than 0, then A > B
    */
    let versionComparator = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                            .getService(Components.interfaces.nsIVersionComparator);
     return (versionComparator.compare(a, b) < 0);
  } ,
	
	isStringAttrib: function(attr) {
	  let AC = Components.interfaces.nsMsgSearchAttrib;
		let isString =
	    !( attr == AC.Priority || attr == AC.Date || attr == AC.MsgStatus || attr == AC.MessageKey || attr == AC.Size || attr == AC.AgeInDays
		  || attr == AC.FolderInfo || attr == AC.Location || attr == AC.Label || attr == AC.JunkStatus || attr == AC.Uint32HdrProperty
			|| attr == AC.JunkPercent || attr == AC.HasAttachmentStatus);
		// what about To, Sender, CC, Subject
		return isString;   
	},

	// isHead - first filter, determines whether ANY or ALL applies
	copyTerms: function(fromFilter, toFilter, isCopy, isHead) {
		let stCollection = fromFilter.searchTerms.QueryInterface(Components.interfaces.nsICollection);
		for (let t = 0; t < stCollection.Count(); t++) {
			// let searchTerm = stCollection.GetElementAt(t);
			let searchTerm = stCollection.QueryElementAt(t, Components.interfaces.nsIMsgSearchTerm);
			let newTerm;
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
					let AC = Components.interfaces.nsMsgSearchAttrib;
					if (quickFilters.Util.isStringAttrib(val.attrib)) {
					  val.str = searchTerm.value.str || '';  // guard against invalid str value.
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
				if (searchTerm.arbitraryHeader) newTerm.arbitraryHeader = new String(searchTerm.arbitraryHeader);
				if (searchTerm.hdrProperty) newTerm.hdrProperty = new String(searchTerm.hdrProperty);
				if (searchTerm.customId) newTerm.customId = searchTerm.customId;
				newTerm.beginsGrouping = searchTerm.beginsGrouping;
				newTerm.endsGrouping = searchTerm.endsGrouping;
				
			}
			else
			  newTerm = searchTerm;
			// append newTerm ONLY if it deos not already exist (avoid duplicates!)
			// however: this logic is probably not desired if AND + OR are mixed!  (A && B) || (A && C)
			toFilter.appendTerm(newTerm);
		}
	} ,
	
	getActionCount: function(filter) {
	  let actions = filter.actionList ? filter.actionList : filter.sortedActionList;
		let actionCount = actions.Count ? actions.Count() : actions.length;
		return actionCount;
	} ,
	
	copyActions: function(fromFilter, toFilter) {
		let actionCount = this.getActionCount(fromFilter);
		for (let a = 0; a < actionCount; a++) {
			let action = fromFilter.getActionAt(a).QueryInterface(Components.interfaces.nsIMsgRuleAction);
			let append = true;
			let newActions = toFilter.actionList ? toFilter.actionList : toFilter.sortedActionList;
			for (let b = 0; b < this.getActionCount(toFilter); b++) { 
				let ac = newActions.queryElementAt ?
					newActions.queryElementAt(b, Components.interfaces.nsIMsgRuleAction):
					newActions.QueryElementAt(b, Components.interfaces.nsIMsgRuleAction);
				if (ac.type == action.type
						&& 
						ac.strValue == action.strValue) {
					append = false;
					break;
				}
			}
			if (append)
				toFilter.appendAction(action);
		}
	}
	
	
  
}