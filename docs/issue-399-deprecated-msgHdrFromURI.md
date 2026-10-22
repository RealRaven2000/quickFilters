# Deprecated header lookup can break drag-and-drop assistant

Tracked in #399.

## Problem

The folder-tree drag-and-drop handler, `quickFilters.onFolderTreeViewDrop` in `chrome/content/quickFilters.js`, used the deprecated `messenger.msgHdrFromURI(messageUri)` method to obtain the dragged message's header and source folder.

When Thunderbird removes or no longer supports this method, the call can throw an uncaught error and prevent the Filter Assistant from opening after a message drop. The lookup is outside the handler's `try` block, so its error handler cannot catch the exception.

This failure is inferred from the code and has not yet been reproduced in a Thunderbird runtime. Deprecation alone does not establish that the method already fails in every supported version.

## User impact

- Dragging messages onto a folder with the Filter Assistant enabled can fail to open the assistant, preventing the expected filter-creation workflow.
- A multi-message drop is also affected because the lookup runs for the first dragged message.
- The exception bypasses the handler's `Exception in onFolderTreeViewDrop` logger and may appear as an uncaught error in Thunderbird's Error Console, for example that `messenger.msgHdrFromURI` is not a function.
- The later source-folder fallback cannot recover because execution stops before reaching it.

Thunderbird's native move or copy may still complete, leaving the user without the expected assistant prompt. This needs runtime verification; the code does not establish message loss or corruption.

## Steps to reproduce

Use a quickFilters build containing the deprecated call and a Thunderbird version in which that method is unavailable.

1. Open Thunderbird's Error Console.
2. Enable the quickFilters Filter Assistant.
3. Drag a message from one folder onto another folder in the folder tree.
4. Check whether the assistant opens and whether an uncaught error is logged.
5. Repeat with multiple messages and verify whether the native move or copy completes.

Record the Thunderbird version, quickFilters version, and exact console error when confirming this issue.

## Expected behavior

For an eligible message drop, quickFilters resolves the source folder and opens the Filter Assistant without an uncaught header-lookup error.

## Fix

The working-tree fix replaces the deprecated call with:

```js
let msgHdr = MailServices.messageServiceFromURI(messageUri).messageURIToMsgHdr(messageUri);
```

It also removes the unused local messenger instance. The replacement preserves the existing source-folder and assistant flow. Runtime validation is still needed. Invalid URIs or inaccessible messages can still cause lookup failures outside the existing `try` block; broader error handling is not part of this replacement.

Related cross-project report: [FiltaQuilla issue 421](https://github.com/RealRaven2000/FiltaQuilla/issues/421).
