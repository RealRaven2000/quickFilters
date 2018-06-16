// Default preference values. These are accessible via the preferences system
// or via the optional chrome/content/options.xul preferences dialog.

// These are here as an example only. Please remove them or rename them to
// something useful.
pref("extensions.quickfilters.debug", false);
pref("extensions.quickfilters.debug.buildFilter", false);
pref("extensions.quickfilters.debug.clipboard", false);
pref("extensions.quickfilters.debug.createFilter", false);
pref("extensions.quickfilters.debug.createFilter.refreshHeaders", false);
pref("extensions.quickfilters.debug.default", true);
pref("extensions.quickfilters.debug.dnd", false);
pref("extensions.quickfilters.debug.events", false);
pref("extensions.quickfilters.debug.filters", false);
pref("extensions.quickfilters.debug.filterList",false);
pref("extensions.quickfilters.debug.filterSearch",false);
pref("extensions.quickfilters.debug.filterSearch.detail",false);
pref("extensions.quickfilters.debug.getSourceFolder", false);
pref("extensions.quickfilters.debug.identities", false);
pref("extensions.quickfilters.debug.listeners", false);
pref("extensions.quickfilters.debug.merge", false);
pref("extensions.quickfilters.debug.nostalgy", false);
pref("extensions.quickfilters.debug.msgMove",false);
pref("extensions.quickfilters.debug.replaceReservedWords",false);
pref("extensions.quickfilters.debug.template.multifrom", false);
pref("extensions.quickfilters.debug.template.custom", false);
pref("extensions.quickfilters.debug.premium", false);
pref("extensions.quickfilters.debug.premium.licenser", false);
pref("extensions.quickfilters.debug.premium.rsa", false);

// from smartTemplate4
pref("extensions.quickfilters.debug.functions", false);
pref("extensions.quickfilters.debug.mime", false);
pref("extensions.quickfilters.debug.mime.split", false);

//pref("extensions.quickfilters.intpref", 0);
//pref("extensions.quickfilters.stringpref", "A string");
pref("extensions.quickfilters.naming.parentFolder", true);
pref("extensions.quickfilters.naming.keyWord", false);
pref("extensions.quickfilters.naming.clonedLabel", ""); // set from locale!
pref("extensions.quickfilters.naming.mergeToken"," +m");
pref("extensions.quickfilters.newfilter.autorun", true);
pref("extensions.quickfilters.newfilter.insertAlphabetical", false);

// https://developer.mozilla.org/en/Localizing_extension_descriptions
pref("extensions.quickfilters.description", "chrome://quickfilters/locale/overlay.properties");

pref("extensions.quickfilters.abortAfterCreate", false);
pref("extensions.quickfilters.autoStart", false);
pref("extensions.quickfilters.toolbar", true);
pref("extensions.quickfilters.showListAfterCreateFilter", true);
pref("extensions.quickfilters.showEditorAfterCreateFilter", true);
pref("extensions.quickfilters.refreshHeaders.wait", 150);

pref("extensions.quickfilters.filters.currentTemplate", "from");
pref("extensions.quickfilters.nostalgySupport", false);
pref("extensions.quickfilters.postbox.quickmove", true);
pref("extensions.quickfilters.listener.tags", true);
pref("extensions.quickfilters.listener.tags.autofilter", false); // Bug 26457 
pref("extensions.quickfilters.searchterm.addressesOneWay", false); // Bug 25714

pref("extensions.quickfilters.merge.autoSelect", false);
pref("extensions.quickfilters.merge.silent", false);

pref("extensions.quickfilters.actions.tags", true);
pref("extensions.quickfilters.actions.priority", false);
pref("extensions.quickfilters.actions.star", false);
pref("extensions.quickfilters.actions.flag", false);
pref("extensions.quickfilters.actions.moveFolder", true);
pref("extensions.quickfilters.filters.showMessage", true);
pref("extensions.quickfilters.firstRun", true);
pref("extensions.quickfilters.installedVersion", "0");
pref("extensions.quickfilters.donations.askOnUpdate", true);

pref("extensions.quickfilters.quickfolders.curFolderbar.listbutton", true);
pref("extensions.quickfilters.quickfolders.curFolderbar.folderbutton", true);
pref("extensions.quickfilters.quickfolders.curFolderbar.messagesbutton", false);
pref("extensions.quickfilters.quickfolders.curFolderbar.findfilterbutton", true);
pref("extensions.quickfilters.notTB.searchbox", false);

// filter by reply-to
pref("extensions.quickfilters.templates.replyTo", false);
// custom templates
pref("extensions.quickfilters.templates.custom", false);

pref("extensions.quickfilters.notifications.runFilter", true);

// Premium features
pref("extensions.quickfilters.proNotify.duplicatesFinder", true);
pref("extensions.quickfilters.proNotify.duplicatesFinder.countDown", 10);
pref("extensions.quickfilters.proNotify.searchFolder", true);
pref("extensions.quickfilters.proNotify.searchFolder.countDown", 15);
pref("extensions.quickfilters.proNotify.sortFilters", true);
pref("extensions.quickfilters.proNotify.sortFilters.countDown", 20);
pref("extensions.quickfilters.proNotify.customTemplate", true);
pref("extensions.quickfilters.proNotify.customTemplate.countDown", 20);
pref("extensions.quickfilters.proNotify.save_template", true);
pref("extensions.quickfilters.proNotify.save_template.countDown", 3);
pref("extensions.quickfilters.proNotify.load_template", true);
pref("extensions.quickfilters.proNotify.load_template.countDown", 2);

// quickFilters Pro specific:
pref("extensions.quickfilters.licenser.forceSecondaryIdentity",false);
pref("extensions.quickfilters.licenseType", 0); // private license, 1-domain
pref("extensions.quickfilters.LicenseKey", "");


pref("extensions.quickfilters.mime.resolveAB", false);
pref("extensions.quickfilters.mime.resolveAB.preferNick", false);
pref("extensions.quickfilters.firstLastSwap", false);


