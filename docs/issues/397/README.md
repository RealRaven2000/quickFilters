# Issue #397: quickMove assistant lookup timeout

When the quickFilters assistant was enabled, moving mail through QuickFolders quickMove to a folder with an inaccessible summary could stall Thunderbird and eventually fail to create a filter.

## Findings

The legacy `createFilterAsync()` called `MailUtils.getMsgHdrForMsgId(messageId, targetServer)` before checking the destination database. Thunderbird treats that server as the first server to search, rather than a search boundary. The helper recursively searches folders and can continue into other accounts. Each retry repeated that broad synchronous search.

The original puremix run took approximately six minutes from the quickMove request to failure. It included 1,000 inaccessible-database warnings across 58 folders. Thunderbird reported a summary-building failure and folder-busy state before the assistant request.

After manually repairing puremix, the assistant opened, but the original code still logged 13 warnings for unrelated folders. With direct lookups, those warnings disappeared and the assistant loaded within 427 ms of the first visible QuickFolders preference update. That interval is not an exact move duration because the move-start timestamp was not logged.

The Rumble failure test finished in approximately 5.4 seconds. All 20 target attempts reported `NS_MSG_ERROR_FOLDER_SUMMARY_OUT_OF_DATE`. The source Inbox database was accessible but did not contain the message. This establishes a target summary problem in that run; it does not establish its underlying cause or the final disposition of the moved message.

## Implementation

- Query the destination database first, then the source database, without recursive account searches. Query a shared source/destination folder only once per attempt.
- Retry up to 20 attempts, with 250 ms waits between attempts. Log lookup exceptions with the folder URI.
- On final failure, log the message ID, database supplier URI, and source/destination URIs. The database supplier is the last folder whose database was successfully obtained; it does not necessarily identify the failing folder.
- Show a localized OK/Cancel confirmation explaining that quickFilters could not retrieve the necessary details to create or update a filter. Identify the destination as account name » immediate parent » target folder, omitting the parent when it is the account root, and ask “Try to repair the folder now?”
- OK calls `quickFilters.Worker.rebuildFolderSummary()`; Cancel does nothing. Repair runs independently of QuickFolders and keeps the current folder displayed.
- Check whether the destination is locked. For folders supporting offline storage, remove the offline store. Notify reindex listeners, invalidate an accessible summary, close and back up the database (falling back to forcing it closed), and call `updateFolder()`. A stale-summary exception during invalidation is logged and does not prevent the rebuild request.
- After `updateFolder()` returns, log “Repair requested for account » immediate parent » folder”. This follows any handled summary error and confirms that the asynchronous repair was requested, not that it completed. Failures to start repair are logged and shown to the user.

The confirmation asks the user to wait for repair before trying filter creation again. There is no automatic filter retry or additional completion prompt.

## Validation

Run from the repository root:

```text
node "docs/issue 397/test-message-lookup.cjs"
```

The harness exercises the actual legacy method with mocked folder databases. It checks target-first lookup, source fallback, duplicate folders, exception handling, 20 failed attempts, one repair alert, and successful lookup without an alert. Timers resolve immediately, so this verifies retry behavior rather than real elapsed time or Thunderbird database behavior.

Manual logs remain in ../test:

- [Original timeout](../test/assistant-timeout.txt)
- [After folder repair](../test/assistant-timout-repaired.txt)
- [Successful direct lookup](../test/assistant-timeout-3.txt)
- [Rumble summary failure](../test/assistant-timeout-falure-test.txt)

The performance improvement was tested in Thunderbird. The timeout confirmation and repair still need a manual UI check.

## Repair after timeout

The localized confirmation asks “Try to repair the folder now?” OK calls quickFilters.Worker.rebuildFolderSummary() directly; Cancel does nothing. No QuickFolders dependency or folder navigation is involved. The helper checks the folder lock, removes the offline store for folders supporting offline storage, notifies reindex listeners, invalidates an accessible summary, closes and backs up the database (or forces it closed), and requests updateFolder(). A stale-summary exception does not prevent the rebuild request. Failures to start repair are logged and shown to the user. A successful request is not a completion signal; wait before trying filter creation again.

Run `node "docs/issue 397/test-folder-repair.cjs"` for mocked repair tests. Both harnesses pass. Manual validation of the confirmation default button and actual Thunderbird repair remains required.

The repair prompt identifies the destination as account name » immediate parent » target folder. The account root is omitted from the parent position to avoid repeating the account name.

After updateFolder() returns, the console logs “Repair requested for account » immediate parent » folder”. This confirms the request, not asynchronous completion, and follows any handled stale-summary exception.

## Localization

Both repair messages are translated in all 19 supported locales (including English). Validation confirms valid JSON, both keys present, one {0} folder placeholder, and four paragraphs in each timeout confirmation. Native-language review remains useful for Thunderbird menu labels.
