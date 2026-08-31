**Release 6.13.3**

The full log with screenshots is available at: [quickFilters Change Log](https://quickfilters.quickfolders.org/version.html#6.13.3)


Important for Release channel users (154 and later): With Thunderbird's new 2-week release cycle, there is an elevated risk of unexpected breakages like [issue #383]. While I regularly test quickFilters against daily builds, timely fixes depend on early reporting from Release users. Please follow the issue tracker and report any regressions promptly to help maintain compatibility.

**Maintenance version 6.13.3**
*      quickFilters is now compatible with Thunderbird 157.
*      Fixed more Filter Assistant malfunctions relating to local storage and problems with the legacy xhtml filter assistant. [issue #383]


**Maintenance version 6.13.2**

*     Fixed Filter Assistant malfunctions from a regression caused by a preferences migration related to using `.startsWith()` on a missing preference. [issue #383]
*     Fixed backup feature not working on some Linux distributions (Betterbird, OpenSuse). [issue #245]
*     Further Improved QuickFolders current folder bar integration stability [issue #365]
*     Fixed incorrect translations in Polish locale file.


**Improvements 6.13**
*     Fixed a bug where the main Thunderbird window content was moved up and caused truncation [issue #382]. If you are seeing this behavior, please restart Thunderbird to make sure the changes come into effect. 
*     Remember position of Filter Assistant window. New option to force assistant to the top. [issue #380]
*     Improved QuickFolders current folder bar integration stability [issue #365]



**Bug Fixes 6.13**

*     Fixed an issue where cached debug settings were not read after the migration to local storage. [issue #367]
*     Filter assistant not using correct built in template (domain instead of from) [issue #376] 



All development and free support work for quickFilters is financed via the [quickFilters Pro license](http://sites.fastspring.com/quickfolders/product/quickfilters?referrer=ATN) which also adds some [additional features](https://quickfilters.quickfolders.org/premium.html#featureList).