
This release adds multi-account filter backup and restore, a dedicated filter troubleshooter, and improved handling of premium feature usage.


**Improvements**

- **Backup and restore:** Save and restore filters for multiple accounts or selected accounts. Backup and restore trials allow repeated uses during the same Thunderbird session or local calendar day, and show remaining trial sessions. #193
- **Multiple messages:** Create or merge filters from multiple selected messages and browse their previews in the assistant. Fixed previews when moving messages using the Thunderbird context menu. #405 #407
- **Filter troubleshooter:** Open a dedicated page from the filter-list toolbar or the license settings tab’s Premium Features box. Run individual checks or all checks, inspect per-filter problems and read-only conditions, and choose confirmed remedies. Mixed/grouped conditions are preserved and can be disabled without opening the filter editor. The checks panel can be collapsed, with compact actions and more room for results. Shows remaining trial sessions and includes eight trial uses without a Pro license: the first check in a tab uses one trial, with further checks in that tab included. #401
- **License registration:** A new registration tab replaces the old dialog, with clearer license status, renewal options and dark mode support. #406
- **Filter assistant:** Show the selected merge target's actions using Thunderbird's localized action labels. Keep the summary visible but dimmed when creating a new filter, and adapt the layout to the window width. Fix reopening the assistant after closing or cancelling it. #404
- **Premium feature usage:** Fix blocking warnings for filter sorting and advanced filter search. Explain when all free trial attempts for a Pro feature have been used. Reset trial usage through Config Editor without importing old countdown values. Treat negative usage counts as zero. Enforce folder-search trial limits and require a valid Pro license for Local Folders autorun. #400

**Miscellaneous**

- Refactor troubleshooter checks into a stateless MailExtension analysis component with a versioned inspection data contract, preserving the existing workflow. #403
- Code cleanup: Moved backup/restore and filter-review operations into the experimental Filters API. #193 #401
- Remove redundant add-on prefixes from localization keys. #402 

The full history with screenshots is available in the [quickFilters Change Log](https://quickfilters.quickfolders.org/version.html#6.15).

All development and free support work for quickFilters is financed via the [quickFilters Pro license](http://sites.fastspring.com/quickfolders/product/quickfilters?referrer=ATN), which also adds [additional features](https://quickfilters.quickfolders.org/premium.html#featureList).
