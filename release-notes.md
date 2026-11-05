
This release adds multi-account filter backup and restore, a dedicated filter troubleshooter, and improved handling of premium feature usage.


**Improvements**

- **Backup and restore:** Save and restore filters for multiple accounts or selected accounts. Restore trials allow repeated restores during the same Thunderbird session or local calendar day. #193
- **Filter troubleshooter:** Open a dedicated page from the filter-list toolbar or the license settings tab’s Premium Features box. Run individual checks or all checks, inspect per-filter problems and read-only conditions, and choose confirmed remedies. Mixed/grouped conditions are preserved and can be disabled without opening the filter editor. Includes eight trial uses without a Pro license: the first check in a tab uses one trial, with further checks in that tab included. #401
- **Premium feature usage:** Fix blocking warnings for filter sorting and advanced filter search. Explain when all free trial attempts for a Pro feature have been used. Reset trial usage through Config Editor without importing old countdown values. Treat negative usage counts as zero. Enforce folder-search trial limits and require a valid Pro license for Local Folders autorun. #400

**Miscellaneus**

- Code cleanup: Moved backup/restore and filter-review operations into the experimental Filters API. #193 #401
- Remove redundant add-on prefixes from localization keys. #402 

The full history with screenshots is available in the [quickFilters Change Log](https://quickfilters.quickfolders.org/version.html#6.15).

All development and free support work for quickFilters is financed via the [quickFilters Pro license](http://sites.fastspring.com/quickfolders/product/quickfilters?referrer=ATN), which also adds [additional features](https://quickfilters.quickfolders.org/premium.html#featureList).
