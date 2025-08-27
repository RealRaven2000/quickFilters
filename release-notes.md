The full log with screenshots is available at: [quickFilters Change Log](https://quickfilters.quickfolders.org/version.html#6.8.1) 


**Maintenance Release 6.8.2**
*   Made quickFilters compatible with Tb 143.*
*   Regression Fixed: Cannot copy messages using the "Move To" / "copy To" messages context menu [issue #320]
*   Regression Fixed - (Thunderbird 143 and later): menu icons of main toolbar button missing [issue #317]
*   added switch extensions.quickfilters.notifications.changelog to disable version tab [issue #318]



**Improvements**

*   Made quickFilters compatible with Tb 142.*
*   Converted Filter Assistant window from XUL to HTML for better responsiveness and readability. This change future-proofs quickFilters, as the old XUL-based format will eventually be unsupported. [issue #309]
*   Added option in quickFilters settings (Actions page) to enable the new HTML interface.
*   Improved settings dialog to avoid vertical truncation.
*   Improved handling of recipients/author retrieved from a message during the assistant.
*   Improved filter search: avoids being misled by old/incorrect account keys which can result from importing account data or renaming/moving accounts.


**Bug Fixes**

*   Fixed “Find filters” and “Run Filters” items in the folder context menu so they now work on the right-clicked folder rather than the selected mails. [issue #313]#

**6.8.1 Changes**

*   6.8.1: Call new html assistent dialog from "merge" function in filter list.
*   6.8.1: During merge, removed code that disabled target folder option (triggered by starred mails)


All development and free support work for quickFilters is financed via the [quickFilters Pro license](http://sites.fastspring.com/quickfolders/product/quickfilters?referrer=ATN) which also adds some [additional features.](https://quickfilters.quickfolders.org/premium.html#featureList)