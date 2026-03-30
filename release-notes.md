**Release 6.15**

QuickFolders has been fully modernized for 2026, with a refreshed user interface, improved usability, and enhanced theme support — making your folder management faster, cleaner, and more intuitive than ever. Try the new **Thunderbird Tabs** theme for a fresh, minimalist experience.

**Improvements**

* Flat Style improvement: the active folder now highlights with the user-assigned tab color (if set). You can revert to the original behavior in theme settings [issue #646]  
* Redesigned themes: Native Tabs and Pushbuttons refreshed with a new layout [issue #643]  
* Toolbar icons now reflect the main theme colors instead of using hard-coded values, improving consistency especially in custom themes [issue #655]  
* Improved theme handling: switching themes now resets layout rules for full fidelity [issue #650]  
* New Pro feature: show the account name of the current folder instead of the QuickFolders label [issue #648]  
* Custom icons in the folder tree are now automatically resized and no longer cropped when too large [issue #619]  
* Added an option to temporarily switch to the Basic version after license expiry without losing your license. The license key is backed up locally and can be restored later [issue #652]  

**Bug Fixes**

* Fixed duplicate custom icons in the folder tree on Thunderbird 148 [issue #633]  
* Fixed non-working menu items in the QuickFolders Commands submenu [issue #639]  
* Fixed broken XHTML dialog "Change order of tabs" [issue #647]  
* Fixed: Removed custom folder icon reappeared after restarting Thunderbird [issue #651]  
* Fixed: Changes in Advanced search settings ("quickMove Advanced Settings") were not stored [issue #654]  

**Miscellaneous**

* Removed usage of PluralForm.sys.mjs to align with Thunderbird code changes [issue #653]  
* Removed unnecessary console errors from quickfolders-util.js  