# #193 backup format, version 1

The new backup is a UTF-8 JSON object. This is the initial implementation contract for the new backup and restore interfaces; native integration testing is still in progress.

```json
{
  "format": "quickFilters-backup",
  "formatVersion": 1,
  "addonVersion": "6.14.1pre0",
  "createdAt": "2026-10-30T14:35:00.000Z",
  "sourceProfile": { "name": "MainProfile" },
  "accounts": [
    {
      "id": "account1",
      "name": "Personal",
      "type": "imap",
      "username": "alice@example.com",
      "hostname": "imap.example.com",
      "rootUri": "imap://alice%40example.com@imap.example.com",
      "localFolders": false,
      "filters": []
    }
  ],
  "referencedAccounts": [],
  "warnings": []
}
```

- `format` and integer `formatVersion` identify the envelope. Unsupported versions must be rejected, rather than interpreted as a legacy file.
- `createdAt` is an ISO timestamp in UTC. Suggested filenames use local time with the existing `YYYY-MM-DD_HH-MM` convention.
- `sourceProfile.name` is a display label and may be empty. It does not scope mapping reuse.
- `accounts` is ordered according to the current Thunderbird account list and contains only accounts selected for export. Each has a `filters` array in the existing `quickFilters.Util.serializeFilter()` representation. Names, enabled state, actions and search terms retain their existing serializer semantics.
- Account IDs and root URIs describe the source profile; they are not portable destination IDs. Automatic matching will require type, username and hostname, with the agreed special case for Local Folders and remembered mapping precedence.
- `referencedAccounts` contains identifying information with the same fields, but no `filters`. It contains only additional accounts referenced by move/copy actions and not already included in `accounts`. An account's metadata appears once even when several actions reference it.
- Each move/copy action retains its original `targetFolderUri`. The restore reader uses the account directory and mapped destination account to resolve the corresponding folder. No filter destinations are modified during export.
- New exports also preserve optional `matchAll` on search terms. The legacy serializer is unchanged. The new reader preserves this flag when present, together with operator zero, repeated terms and grouping counters; it cannot recover information that an old file did not store.
- `warnings` records `accountId`, `filterName` and `reason`, plus `customId` or `targetFolderUri` where relevant. Current reasons are `custom-action-unavailable` (existing serializer fallback) and `unknown-target-account` (a referenced URI could not be assigned to a source account). The UI reports warnings after a successful write.
- A serialization exception or missing serialized filter aborts the export before opening the picker; it does not silently write an incomplete account.
- Local file paths, recent-file history, account mappings, VFS connection references and provider credentials are not included in this portable backup.

## Compatibility

The exporter also emits `invalid-target-folder` when a move/copy URI is malformed, or when its account exists but the folder is missing or cannot receive messages. The warning table labels this “Invalid target folder”; `unknown-target-account` is labeled “Invalid target account”. Folder validation is read-only and does not prevent exporting the original rule for later repair.

An existing single-account file with a top-level `filters` array and no `format` discriminator is classified as `legacy-single-account`. The new reader adapts it into one source account, recovers account metadata from `accountName` or `rootFolderURL` when those contain account URIs, and gathers additional account candidates from move/copy destinations. Missing metadata requires manual mapping; a mailbox URI alone does not establish the source account type except for recognizable Local Folders. Classification alone is not full schema validation.

The legacy restore function does not understand the version 1 envelope. The new restore interface accepts both new and legacy formats and validates source collections before modification. It applies name-based merging, skips later duplicate source names, and retains unresolved folder targets and unavailable custom features as editable warnings on complete imported filters. Native construction failures are reported as skipped filters with the original serialized data retained in the review report.

Do not silently transform a multi-account backup into an arbitrary single-account import. Keep the old exporter and importer available for maintenance releases until the new workflow has completed live testing.
