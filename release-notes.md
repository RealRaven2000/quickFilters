**Release 6.13**

The full log with screenshots is available at: [quickFilters Change Log](https://quickfilters.quickfolders.org/version.html#6.13)


This release updates quickFilters to reflect recent changes in Thunderbird’s add-on platform planning. A previously announced restriction that would allow legacy Add-ons on the Release channel only has been postponed to a later ESR cycle (currently targeted for 2027).

No immediate action is required. quickFilters continues to work on both Release and ESR versions of Thunderbird where supported.

Users who rely on advanced or experimental functionality may prefer the ESR channel for a more stable environment with fewer platform changes. The recommended migration point from Release to ESR is Thunderbird 153, expected in July 2026.


**Improvements**

* Compatibility updates for Thunderbird 152
* Added Czech translation
* Search filters can now be found by target folder URI (folder path) [issue #366]
* Improved integration of QuickFolders current folder bar [issue #365]


**Bug Fixes**

* Fixed HTML Assistant issue where message preview API was not available when moving mail to local folders [issue #364]
* Set minimum supported Thunderbird version to 140 to avoid deprecated API issues [issue #362]


**Compatibility**

* Updated default GitHub branch alignment to ESR140


All development and free support work for quickFilters is financed via the [quickFilters Pro license](http://sites.fastspring.com/quickfolders/product/quickfilters?referrer=ATN) which also adds some [additional features](https://quickfilters.quickfolders.org/premium.html#featureList).