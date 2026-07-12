**Release 6.13.1**

The full log with screenshots is available at: [quickFilters Change Log](https://quickfilters.quickfolders.org/version.html#6.13)


This release updates quickFilters to reflect recent changes in Thunderbird’s add-on platform planning. A previously announced restriction that would allow legacy Add-ons on the Release channel only has been postponed to a later ESR cycle (currently targeted for 2027).

While quickFilters continues to support both Release and ESR versions of Thunderbird where compatible, it may be better to switch to the ESR channel to secure a more stable update path. 

Users who rely on advanced or experimental functionality may prefer the ESR channel for a more stable environment with fewer platform changes. The recommended migration point from Release to ESR is Thunderbird 153, expected in July 2026.


**Improvements**
*     Fixed a bug where the main Thunderbird window content was moved up and caused truncation [issue #382]. If you are seeing this behavior, please restart Thunderbird to make sure the changes come into effect. 
*     Remember position of Filter Assistant window. New option to force assistant to the top. [issue #380]
*     Improved QuickFolders current folder bar integration stability [issue #365]



**Bug Fixes**

*     Fixed an issue where cached debug settings were not read after the migration to local storage. [issue #367]
*     Filter assistant not using correct built in template (domain instead from) [issue #376] 



All development and free support work for quickFilters is financed via the [quickFilters Pro license](http://sites.fastspring.com/quickfolders/product/quickfilters?referrer=ATN) which also adds some [additional features](https://quickfilters.quickfolders.org/premium.html#featureList).