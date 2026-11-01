# #193 implementation notes

## Current scope

The filter-list Backup and Restore toolbar buttons open `html/filter-backup.html?mode=backup` and `?mode=restore` in mail-window content tabs. Both modes use real account data when opened as extension pages. The page without a mode parameter still shows the restore UX example. The issue-folder HTML prototypes remain available for browser previews; they do not access real filters.

Implemented:

- Account order/names from the standard accounts API, with native filter counts and account details supplied by FiltersAPI.
- Shared page assets and account presentation, with a one-column backup layout.
- Remembered successful backup selections in `browser.storage.local` under `backup.selectedAccountIds`.
- Actual profile/account filename defaults and local date/time, editable before Save As. If no profile display name can be determined, multiple-account backup requires a filename supplied by the user.
- Versioned JSON export using the existing filter serializer without rewriting it.
- Explicit FiltersAPI methods for privileged operations; no new notification bridge.
- Native JSON file picker and a temporary-file write, preserving the destination until replacement succeeds. Cancellation does not remember a new selection or history entry.
- Storage adapter boundary and recent successful file history under `backup.recentFiles` (most recent first, deduplicated by location, capped at 20).
- Return to Message Filters, available before and after backup/restore. It focuses the originating filter-list window, or reopens the filter list if that window has closed. The tab stays open so the result remains visible. Restore refreshes existing filter-list windows; export does not modify filters.
- Real local-file restore of both the new envelope and old single-account JSON, through an adapter into the shared account-mapping UI.
- Automatic matching by type, raw username and normalized hostname, plus special Local Folders matching. Legacy URI components are decoded once. Ambiguous candidates and legacy mailbox accounts without a known type require manual mapping.
- One-to-one drag/menu mappings, with referenced-account rows that import no filters. Dragging assigns and selects; dragging away deselects; menu assignment requires explicit checkbox selection.
- Mappings/selections stored in `restore.accountMappings` after successful restore, independently of filename. Remembered mappings take precedence; a missing remembered destination requires manual mapping.
- Name-based replacement in place and addition of new filters at the beginning, preserving other filters. Later duplicate source names are skipped and retained in the review report. Existing legacy importer behavior is unchanged.
- Move/copy folder remapping traverses the mapped destination's actual folder hierarchy and uses the resolved folder URI. Missing folders or unmapped target accounts retain their original action URI and become editable warnings; they do not cause a complete valid filter to be skipped.
- Missing custom actions and custom search terms import with their original IDs/values and enabled state, and are listed as warnings. The new deserializer does not deduplicate search terms or discard their grouping.
- Expanded post-restore review table, account-specific highlighting, Save report, and Edit filter for imported warning rows. Editor tokens refer to the actual imported filter and are rejected if it was removed or replaced.
- Per-account staging and attempted rollback on disk-save failure. A multi-account job can partially succeed; the result reports account failures and does not remember mappings for an unsuccessful job.

Not implemented: VFS dependencies/connections, scheduling, recent-file UI, moved-folder detection, localization of the new interface, or release preparation. Native restore/editor behavior still needs smoke testing in Thunderbird.

## Maintenance releases and legacy paths

Legacy `quickFilters.List.store_obsolete(event)`, `storeSelected_obsolete()`, `fileFilters_obsolete()` and `load_obsolete()` remain intact. The existing toolbar changes are limited to the Backup and Restore handlers; their IDs, element types, classes and surrounding toolbar stay the same.

To ship a maintenance build using the old workflow, change only the Backup handler in `chrome/content/scripts/qFi-filterlist.js` back from the current `openBackupTab` handler to `onclick="quickFilters.List.store_obsolete(event);"`. This also restores the legacy Ctrl+click selected-filter behavior. No legacy serializer or importer migration is required. A user-facing switch is deferred.

Also change the Restore handler from `oncommand="quickFilters.List.openBackupTab('restore');"` back to `onclick="quickFilters.List.load_obsolete();"`.

The legacy importer cannot read the new versioned envelope. The new restore interface supports both formats. Keep the new wiring experimental until live testing is complete; use the two legacy handlers for a maintenance release. Existing legacy backups and the legacy restore code are unchanged.

No manifest version, revision, release notes or XPI was changed as part of this implementation work. Existing unrelated working-tree changes were retained. The build script was not executed.

The native backup and restore helpers are loaded with `loadSubScript` into private API-owned scopes. Their declarations are enclosed in IIFEs and do not enter a legacy window. Reloading the add-on recreates these scopes, avoiding stale add-on code in the shared system ES-module cache.

## Module layout

- `html/filter-backup.*`: shared HTML/CSS and mode selection, including standalone example mode.
- `scripts/backup/backup-page.mjs`: live backup UI controller.
- `scripts/backup/restore-page.mjs`: live restore UI controller, successful mapping persistence and report export.
- `scripts/backup/restore-format.mjs`: new/legacy adapters, URI normalization and account matching.
- `scripts/backup/account-mapping-view.mjs`: live restore source/target grid, drag/drop and account menus.
- `scripts/backup/warning-table.mjs`: shared warning/review table and highlighting.
- `scripts/backup/backup-format.mjs`: filenames, versioned envelope and format recognition.
- `scripts/backup/backup-storage.mjs`: storage adapter selection, successful selections and recent-file history.
- `scripts/backup/storage-local.mjs`: native local-file adapter through Utilities.
- `chrome/content/api/Utilities/backup.js`: native account/filter metadata, serialization, file picker/disk I/O and filter-list focus.
- `chrome/content/api/Utilities/restore.js`: privileged deserialization, folder correction, merging, save/rollback and imported-filter editor access.

Future VFS library files belong in `vendor/vfs-toolkit/`; an adapter can be added beside `storage-local.mjs` without changing account mapping or filter serialization. Provider credentials and grants stay with the provider. No VFS code has been bundled yet.

## Verification

Run:

```powershell
node --test "docs/issue 193/test-backup.mjs" "docs/issue 193/test-restore.mjs" "docs/issue 193/test-restore-ui.mjs"
$env:ESLINT_USE_FLAT_CONFIG = 'false'
eslint.cmd scripts/backup/*.mjs html/filter-backup.js chrome/content/api/Utilities/backup.js chrome/content/api/Utilities/restore.js chrome/content/api/Utilities/implementation.js
```

The automated suite exercises pure format/storage logic and the UI/privileged boundaries with mocks. It does not prove Thunderbird native integration.

Live Thunderbird checklist:

1. Reload the extension in a test profile and open the filter list. Click Backup and confirm the tab opens while the filter list remains open.
2. Compare account names/counts with the filter list, including Local Folders and an account with zero filters. Verify any unreadable account is identified and blocks export while selected.
3. Toggle All and individual selections; verify profile naming for several accounts and account naming for one. Edit the name and verify later selection changes preserve that edit.
4. Cancel Save As; confirm no new file or settings entry was created. Save successfully and confirm the JSON contains only selected accounts' filters plus identifying metadata for referenced accounts.
5. Back up a rule that moves messages into another account without selecting that second account. Confirm it appears in `referencedAccounts`, with no `filters` collection.
6. Repeat Save As to an existing disposable test file and verify native replacement confirmation. Verify a cancelled replacement leaves it intact.
7. Reopen Backup after a successful save and verify remembered account selection. Check filename timestamp and actual profile display name.
8. Click Return to Message Filters; verify original account/list selection is retained. Close the original dialog, then try it again and verify it reopens.
9. Open the original issue-folder prototypes in Firefox and confirm the examples still work without Thunderbird.
10. Revert only the toolbar handler as described above and verify legacy backup, Ctrl+click backup and legacy restore still work before any maintenance release.

## Restore smoke test

Use disposable source/destination profiles for the first live restore writes.

1. Reload the temporary add-on, close old tabs and click Restore in Message Filters. Choose Open backup and load a new multi-account backup.
2. Check automatic matches and initial checkboxes. Map a source manually using a triangle menu, then check it explicitly. Move a target between slots or back to Accounts left unchanged; verify source selection follows the agreed drag behavior.
3. Map referenced accounts without importing their filters. Restore a rule that copies/moves into one of those accounts and verify its actual destination in the editor.
4. Seed one same-name destination filter, one unrelated filter and one absent imported name. Restore and verify replacement, preservation and addition respectively. Repeat restore and confirm names do not multiply.
5. Include a nonexistent folder or unmapped target account. Verify the complete filter imports with the original unresolved URI, appears in the warning table, and opens through Edit filter.
6. Disable FiltaQuilla and import a filter containing its custom action/term. Verify warning IDs and original action/condition values, enabled state and Edit filter. Re-enable FiltaQuilla afterward.
7. Add a second same-name filter to a disposable source JSON collection. Verify the later occurrence is skipped, with its original serialized data included in Save report; the first remains the imported version.
8. Open an old single-account backup. Verify recovered source metadata, manual mapping when type cannot be determined, and successful import through the new interface.
9. Reopen the file or a differently named backup of the same accounts after successful restore; verify mappings/selections are remembered. Cancel file selection and confirm the previously loaded backup remains intact.
10. Use Return to Message Filters and verify the list reflects changes. Check that warnings/highlights/report remain available in the restore tab.

If one account cannot be saved, the operation reports partial completion; inspect both the destination file and Message Filters in that test profile. The mocked rollback tests do not establish native filesystem guarantees.

The native backup, restore, and report pickers share `backup.lastDirectory` in `browser.storage.local`. Successful file operations remember the selected parent folder across Thunderbird restarts. Cancellation leaves it unchanged; missing or inaccessible folders fall back to the native picker default.

Restore review offers Delete beside Edit filter for imported filters. Deletion asks for confirmation, checks the exact native filter object, saves the account filter list, and refreshes open Message Filters windows. All review rows for that filter show ?Filter deleted?; saved reports record their status as deleted. Skipped filters have no Delete action.

Backup warning review now offers Edit filter and Delete against exact native filter objects. Accepted edits show ?Edited by User?; deletions retain all warning rows, strike through the filter name, and show ?Item deleted?. Both badges remind users to back up again. Runtime review tokens are omitted from saved backup data. Canceling the editor does not mark the filter edited.

Return to Message Filters now focuses/reopens the list and closes the current backup/restore tab using the tabs API. Backup review tracks edited/deleted accounts until those accounts are successfully backed up again. Returning with outstanding changes shows a Yes/No prompt: Yes stays on the backup page, No returns and closes the tab. Canceled or failed backups do not clear the reminder.

Ctrl+Backup opens the same assistant in selected-filter mode. The minimal launch bridge captures native selected filter references under quickFilters.backupSelections; an explicit Utilities method supplies the account and selected names. Export intersects that snapshot with the current native list in filter order, rejects an empty selection or different account, and retains referenced-account metadata. Partial exports do not replace remembered full-account checkbox selections. Smoke test: select two filters, Ctrl-click Backup, verify one account/two names/count and selected-filters filename; save and inspect that exactly those filters exist in JSON. Test no selection and deletion of selected items; normal Backup must still list all accounts.

Localization: live backup/restore headings, labels, counts, selection hints, mapping statuses, warning tables, badges, tooltips, confirmations, native picker text and user-visible errors use the backup.* namespace in _locales/en/messages.json. The two initial title keys are retained. scripts/backup/i18n.mjs uses the standard MX i18n API; the Utilities experiment receives a private localizer from extension.localeData for native dialogs/errors. Numeric/path/name values use catalog placeholders, and the Ctrl+Backup hint has an icon placeholder that translators can reposition. User account/filter names, custom IDs, folder URIs and machine-readable report reason codes are not translated. Existing legacy message keys and standalone demo fixtures are not renamed. All 192 backup messages now have translations in the 16 non-English SPLASH+UI locales. SPLASH-only locales retain English fallback for backup UI. Examples are omitted only from new non-English backup entities; existing entities retain their examples. These are machine-assisted drafts with reviewed interface terminology; native-speaker and layout review remain useful. Catalog tests validate UTF-8, complete key coverage, placeholder tokens, substitution definitions and the menu symbol.

Localization checks: node --test "docs/issue 193/test-localization.mjs" validates message references/placeholders and tests safe text/attribute translation, reordered substitutions and RTL document direction. The regular backup/restore tests now load the actual English catalog rather than hard-coded mock translations.

Shared review presentation is extracted to scripts/filter-review/warning-panel.mjs and warning-panel.css. The existing backup warning-table module is now an adapter providing localization, native-token normalization and backup-specific reminders. A future HTML troubleshooter can supply its own diagnoses and callbacks without importing backup code. See scripts/filter-review/README.md for the interface. The current build already packages scripts recursively.

Utilities now loads its private backup.js and restore.js helpers through a local loadPackageScript closure in getAPI(context). It resolves fixed package-relative paths using context.extension.rootURI and uses loadSubScriptWithOptions with target, UTF-8, ignoreCache and allowUnsafeURL, matching the WindowListener package-loader approach. No chrome/resource URL registration is needed for these two helpers. The native loader still requires live Thunderbird verification; automated tests cover unpacked and XPI URL resolution and fresh private scopes.

Backup export and restore now await popupProFeature before proceeding. The existing 10-backup/3-restore allowance and counter timing are unchanged. The retained obsolete file handler also awaits its existing gate. Tests use asynchronous license mocks and verify pending/denied/rejected gates cannot serialize or mutate filters; allowed gates continue normally. Other premium features are outside this change.

Pro trial usage tracking is now tracked separately in #400. See docs/issue 400 - usage/#400-premium-usage.md for count-up preferences, JavaScript limits, migration, license transitions and focused tests.

## API ownership cleanup before #401

Backup/restore, file operations, confirmations and review-token state now belong to `browser.FiltersAPI`. Their implementation scripts live under `chrome/content/api/filtersAPI/`. Callers use the new namespace directly; method names, behavior and backup format are unchanged. Utilities retains general helpers and premium-usage accounting.
