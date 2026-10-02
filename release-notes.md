
The full log with screenshots is available at: [quickFilters Change Log](https://quickfilters.quickfolders.org/version.html#6.13.4)

**Release 6.13.4**

This maintenance release improves startup reliability, settings handling, and dialog layout following the migration to local storage.

- **Compatibility:** quickFilters is now compatible with Thunderbird 159.
- **Settings and storage:** Preserve existing settings and migrate only explicitly set legacy preferences. Restore current defaults for missing or null settings and fix live updates to the preference cache, including the selected Filter Assistant template. #392
- **Storage startup:** Retry temporary storage failures and report when settings cannot be loaded. A notification now asks users to restart Thunderbird instead of leaving quickFilters waiting indefinitely. For diagnostics on Thunderbird 154+, enable [Browser] and [Content] in Error Console. #392
- **Main toolbar menu:** Fix the popup remaining on “Let me load the menu instead...” when opened before startup initialization has finished. #391
- **QuickFolders integration:** Restore missing quickFilters buttons in the Current Folder toolbar after a slow Thunderbird startup. #396
- **Dialogs and appearance:** Keep the Filter Assistant's Next button visible on hover, improve control sizing, spacing, and alignment, and correct toolbar hover styling for Thunderbird 157+. #393

Version 6.13 moved settings from Thunderbird's global preferences to local storage. Earlier maintenance releases addressed related Filter Assistant regressions and compatibility problems, but missing preference values and delayed storage startup required further changes. Version 6.13.4 builds on those fixes to make settings migration, default values, and startup failure handling more reliable. #367 #383 #392

The full history with screenshots is available in the [quickFilters Change Log](https://quickfilters.quickfolders.org/version.html#6.13.4).

All development and free support work for quickFilters is financed via the [quickFilters Pro license](http://sites.fastspring.com/quickfolders/product/quickfilters?referrer=ATN), which also adds [additional features](https://quickfilters.quickfolders.org/premium.html#featureList).
