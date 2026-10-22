**Release 6.14 - Unreleased**

This release improves Filter Assistant performance when folder databases are inaccessible and updates compatibility with Thunderbird 159.

- **Improved Filter Assistant Performance:** Avoid repeated searches across accounts when a moved message cannot be found. Check the destination and source folders directly, and offer to repair the destination folder after lookup fails. #397
- **Thunderbird 159 compatibility:** Fixed message drag-and-drop after Thunderbird 159 removed `messenger.msgHdrFromURI()`. Dragging messages to folders can still open the Filter Assistant by using `MailServices.messageServiceFromURI(messageUri).messageURIToMsgHdr(messageUri)`.#399
- **Add-on integration:** Remove async from the runtime.onMessageExternal listener: an async handler implicitly returns a Promise even for unrecognized commands, claiming the response and preventing other listeners from responding. Return Promises explicitly for recognized commands and undefined for unrecognized commands, as requested during ATN review of 6.13.4.
- **License renewal:** Show a colored license-expiry countdown beside the valid-until date on the quickFilters Pro settings tab when the existing 30-day extension condition shows the Extend License button, including after the toolbar renewal indicator has been dismissed for the session.

The full history with screenshots is available in the [quickFilters Change Log](https://quickfilters.quickfolders.org/version.html).

All development and free support work for quickFilters is financed via the [quickFilters Pro license](http://sites.fastspring.com/quickfolders/product/quickfilters?referrer=ATN), which also adds [additional features](https://quickfilters.quickfolders.org/premium.html#featureList).
