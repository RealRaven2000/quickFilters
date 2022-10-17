// Default preference values. These are accessible via the preferences system
// or via the optional chrome/content/options.xul preferences dialog.
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
pref("extensions.quickfilters.debug.merge.detail", false);
pref("extensions.quickfilters.debug.nostalgy", false);
pref("extensions.quickfilters.debug.notifications", false);
pref("extensions.quickfilters.debug.msgMove",false);
pref("extensions.quickfilters.debug.replaceReservedWords",false);
pref("extensions.quickfilters.debug.template.multifrom", false);
pref("extensions.quickfilters.debug.template.custom", false);
pref("extensions.quickfilters.debug.premium", false);
pref("extensions.quickfilters.debug.premium.licenser", false);
pref("extensions.quickfilters.debug.premium.rsa", false);

pref("extensions.quickfilters.debug.functions", false);
pref("extensions.quickfilters.debug.mime", false);
pref("extensions.quickfilters.debug.mime.split", false);

pref("extensions.quickfilters.naming.parentFolder", true);
pref("extensions.quickfilters.naming.folderDelimiter", "»"); // UTF8 - for some reason not read correctly.
pref("extensions.quickfilters.naming.keyWord", false);
pref("extensions.quickfilters.naming.clonedLabel", ""); // set from locale!
pref("extensions.quickfilters.naming.mergeToken"," +m");
pref("extensions.quickfilters.newfilter.autorun", true);
pref("extensions.quickfilters.newfilter.manual", true);
pref("extensions.quickfilters.newfilter.insertAlphabetical", false);
pref("extensions.quickfilters.newfilter.runAfterPlugins", false);
pref("extensions.quickfilters.newfilter.runArchiving", false);
pref("extensions.quickfilters.newfilter.runPostOutgoing", false);
pref("extensions.quickfilters.newfilter.runPeriodically", false);
pref("extensions.quickfilters.newfilter.removeOwnAddresses", true); // Bug 26664

pref("extensions.quickfilters.files.path", "");
pref("extensions.quickfilters.warnInboxAssistant", true); // warn when creating email from message in inbox (and no tag set)

pref("extensions.quickfilters.abortAfterCreate", false);
pref("extensions.quickfilters.autoStart", false);
pref("extensions.quickfilters.toolbar", true);
pref("extensions.quickfilters.showListAfterCreateFilter", true);
pref("extensions.quickfilters.runFilterAfterCreate", false);
pref("extensions.quickfilters.showEditorAfterCreateFilter", true);
pref("extensions.quickfilters.refreshHeaders.wait", 150);
pref("extensions.quickfilters.subjectDisableKeywordsExtract", false);


pref("extensions.quickfilters.filters.currentTemplate", "from");
pref("extensions.quickfilters.nostalgySupport", false);
pref("extensions.quickfilters.listener.tags", true);
pref("extensions.quickfilters.listener.tags.autofilter", false); // Bug 26457 
pref("extensions.quickfilters.searchterm.addressesOneWay", false); // Bug 25714
pref("extensions.quickfilters.searchterm.insertOnTop", false); // Bug 26664



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
pref("extensions.quickfilters.hasNews", false); /* splash screen status after update */

pref("extensions.quickfilters.quickfolders.curFolderbar.listbutton", true);
pref("extensions.quickfilters.quickfolders.curFolderbar.folderbutton", true);
pref("extensions.quickfilters.quickfolders.curFolderbar.messagesbutton", false);
pref("extensions.quickfilters.quickfolders.curFolderbar.findfilterbutton", true);

// Troubleshooter (button in filterlist)
pref("extensions.quickfilters.troubleshoot.incomingFlag", true);
pref("extensions.quickfilters.troubleshoot.invalidTargetFolder", true);
pref("extensions.quickfilters.troubleshoot.customActions", true);
pref("extensions.quickfilters.troubleshoot.mixedAnyAndAll", true);


// filter by reply-to
pref("extensions.quickfilters.templates.replyTo", false);
// custom templates
pref("extensions.quickfilters.templates.custom", false);

// issue 20 - Remember Copied filters List to insert to other Accounts multiple times
pref("extensions.quickfilters.multipaste", false);

pref("extensions.quickfilters.notifications.runFilter", true);


// Premium features
pref("extensions.quickfilters.restrictions.advancedSearchType.countDown", 15);
pref("extensions.quickfilters.restrictions.duplicatesFinder.countDown", 10);
pref("extensions.quickfilters.restrictions.searchFolder.countDown", 15);
pref("extensions.quickfilters.restrictions.sortSearchTerms.countDown", 25); // [issue 104]
pref("extensions.quickfilters.restrictions.sortFilters.countDown", 20);
pref("extensions.quickfilters.restrictions.customTemplate.countDown", 20);
pref("extensions.quickfilters.restrictions.saveFilters.countDown", 10);
pref("extensions.quickfilters.restrictions.loadFilters.countDown", 3);

// quickFilters Pro specific:
pref("extensions.quickfilters.licenser.forceSecondaryIdentity",false);
pref("extensions.quickfilters.licenseType", 0); // private license, 1-domain
pref("extensions.quickfilters.LicenseKey", "");
pref("extensions.quickfilters.licenser.renewalReminder", 0); // 0 - no renewal necessary, 1 - renewal reminder, 2 - disable reminder
pref("extensions.quickfilters.localFoldersRun", false);
// [issue 12] Add shortcuts for run fitler buttons
pref("extensions.quickfilters.shortcuts.folder", false);
pref("extensions.quickfilters.shortcuts.mails", false);
pref("extensions.quickfilters.shortcuts.folder.key", "F");
pref("extensions.quickfilters.shortcuts.mails.key", "R");

pref("extensions.quickfilters.mime.resolveAB", false);
pref("extensions.quickfilters.mime.resolveAB.preferNick", false);
pref("extensions.quickfilters.firstLastSwap", false);


