The full log with screenshots is available at: [quickFilters Change Log](https://quickfilters.quickfolders.org/version.html#6.10) 


**Improvements**

*   Set Compatibility with Thunderbird 148 - unfortunately the Add-on review policies for Add-ons with "experimental" APIs do not allow us to remove `strict_max_version` from manifest.json
*   Improved startup stability [issue #339]
*   Improved default filter names based on Custom Templates [issue #335]
*   Added a configurable keyboard shortcut for 'Create Filter from Message' [issue #334]
*   If the quickFilters assistant is already open, trying to start a new one will bring the existing window to the front instead of opening another. (`quickFilters.Worker.createQuickFilterLock`)


**Bug Fixes**

*   Fixed: The Thunderbird filter editor was missing the search term edit box when search terms did not retrieve any value (e.g. no Reply-To, missing mail tags) [issue #338]
*   Fixed: After quickFilters 6.9.2 HTML Assistant - "Automatically select Merge"  was not honored (needed to be selected each time) [issue #331]
*   Fixed: Extend License button opens 2 tabs [issue #333]

**Miscellaneus**

*   Custom Template Editor / Filter Editor: gFilter was removed in modern versions of Thunderbird
*   Removed invalid permissions `folders` and `mailTab` from manifest.




All development and free support work for quickFilters is financed via the [quickFilters Pro license](http://sites.fastspring.com/quickfolders/product/quickfilters?referrer=ATN) which also adds some [additional features.](https://quickfilters.quickfolders.org/premium.html#featureList)