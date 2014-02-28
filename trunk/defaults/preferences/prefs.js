// Default preference values. These are accessible via the preferences system
// or via the optional chrome/content/options.xul preferences dialog.

// These are here as an example only. Please remove them or rename them to
// something useful.
pref("extensions.quickfilters.debug", false);
pref("extensions.quickfilters.debug.default", true);
pref("extensions.quickfilters.debug.filters", false);
pref("extensions.quickfilters.debug.createFilter", false);
pref("extensions.quickfilters.debug.createFilter.refreshHeaders", false);
pref("extensions.quickfilters.debug.events", false);
pref("extensions.quickfilters.debug.dnd", false);
pref("extensions.quickfilters.debug.clipboard", false);
pref("extensions.quickfilters.debug.nostalgy", false);
pref("extensions.quickfilters.debug.quickmove",false);
pref("extensions.quickfilters.debug.template.multifrom", false);

//pref("extensions.quickfilters.intpref", 0);
//pref("extensions.quickfilters.stringpref", "A string");
pref("extensions.quickfilters.naming.parentFolder", true);
pref("extensions.quickfilters.naming.keyWord", false);
pref("extensions.quickfilters.naming.clonedLabel", ""); // set from locale!

// https://developer.mozilla.org/en/Localizing_extension_descriptions
pref("extensions.quickfilters.description", "chrome://quickfilters/locale/overlay.properties");

pref("extensions.quickfilters.abortAfterCreate", false);
pref("extensions.quickfilters.autoStart", false);
pref("extensions.quickfilters.toolbar", true);

pref("extensions.quickfilters.filters.currentTemplate", "from");
pref("extensions.quickfilters.nostalgySupport", false);
pref("extensions.quickfilters.postbox.quickmove", true);
pref("extensions.quickfilters.listener.tags", true);
pref("extensions.quickfilters.searchterm.addressesOneWay", false); // Bug 25714

pref("extensions.quickfilters.actions.tags", true);
pref("extensions.quickfilters.actions.priority", false);
pref("extensions.quickfilters.actions.star", false);
pref("extensions.quickfilters.actions.flag", false);
pref("extensions.quickfilters.actions.moveFolder", true);
pref("extensions.quickfilters.filters.showMessage", true);
pref("extensions.quickfilters.firstRun", true);
pref("extensions.quickfilters.installedVersion", "0");
pref("extensions.quickfilters.donations.askOnUpdate", true);
