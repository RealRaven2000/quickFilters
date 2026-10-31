# #193 — Multi-account filter backup and selective restore - Requirements

Status: Requirements and implementation in progress, based on the discussion of 2026-10-30. See [implementation notes](implementation-notes.md) for current scope and verification, and [backup format](backup-format.md) for the initial versioned file contract.

## Purpose and related issues

Allow users to save filters from all or selected accounts into one backup file, then selectively restore them into the same or another Thunderbird profile.

- #193: Backup Improvement: Save filters of all accounts in a single file.
- #194: Backup Filters Improvement: Automatic backup schedule. Scheduling is a related future use of the backup selection, outside this initial scope.
- #388: Feature request: Auto-sync filter rules over multiple instances. Account mapping provides a foundation for cross-profile use; automatic synchronization is outside this initial scope.

## Shared backup and restore dialog

Use the same dialog with Backup and Restore modes. Share account-list rendering and selection controls where practical.

## UI and API architecture

- Implement the shared dialog in HTML.
- Use the WebExtension (WX/MailExtension) API context and standard APIs wherever possible.
- Use the existing experimental Util API, including methods already added to it, to obtain filter information from privileged Thunderbird code. There is no standard filters WebExtension API available for this functionality.
- Inspect and reuse the existing Util API methods before adding new ones. Where additional privileged access is necessary, expose explicit experimental API methods rather than introducing notification-driven bridges or new notify listeners.
- Keep dialog presentation and interaction in the HTML/WebExtension context, with privileged filter operations behind the experimental API.
- Present the account selection screen in a dedicated Thunderbird tab to make good use of screen space. Proposed integration: keep the filter-list XHTML dialog open, return focus to it when the workflow ends, and refresh it after a successful restore. Validate window/tab focus behavior during backend integration.
- Use a CSS grid with shared source/destination rows and faint horizontal separators. Place unmatched targets below all source rows in the destination column, never alongside an unrelated source.

## Dialog modes

In both modes, provide an **All** checkbox above the source account checkboxes. Checking it selects all source accounts; clearing it deselects them all. Reflect individual selections with checked (all selected), unchecked (none selected), or mixed (some selected) states. Clicking the mixed-state checkbox selects all source accounts. Bulk selection changes must preserve account mappings.

### Backup mode

- List accounts in the current profile with a checkbox for each account.
- Allow all accounts or any selected subset to be saved into a single file.
- Use the shared All checkbox to select or deselect all accounts.
- Show the number of filters for each account.
- Hide the destination account list and mapping controls.
- Use Save backup… as the main action, opening the Save dialog.
- Provide an editable filename textbox at the bottom of the dialog, populated with the suggested default filename before opening the Save dialog. Pass the edited filename to the Save dialog.
- Remember the account selection for subsequent backups.
- After a successful write, show a green rounded “filters saved” badge beside each exported account. Only accounts included in that saved file receive the badge. Clear previous save badges when starting a new attempt; cancellation or failure must not display a new success badge.
- Reuse the account-row status badge styling for short warning and error summaries, including future restore results. Keep detailed explanations in tooltips or the result/review area.
- Show backup warning details in an expandable HTML table with Account, Filter, Warning and Details columns. Clicking an account's warning badge opens the panel, highlights that account's rows in the warning color, and scrolls to the first match without hiding other accounts' warnings. Provide Clear highlight. Clicking a warning badge must not toggle the account checkbox.
- When no saved backup selection exists, select all accounts initially.

### Restore mode

- List source accounts from the backup with checkboxes determining whose filters to restore.
- Show accounts in the current profile as available destinations.
- Let users assign a destination account to each source account.
- Require a distinct destination for each source account; multiple source accounts must not map to the same destination account.
- Support dragging a destination account onto a source row, with a dropdown or equivalent keyboard-accessible control for the same assignment.
- Use a compact filled Unicode triangle beside each source to open a collapsed destination selection menu: ▶ when closed and ▼ while open. Keep the control between source and destination. Do not place a permanently visible Destination dropdown beneath the target slot; preserve the vertical flow of the account rows for dragging. Support keyboard access, Escape to dismiss, and closing the menu when clicking outside it.
- Dropping a target into a source slot automatically checks that source. Moving the target to another source or back to the unmatched area unchecks its previous source. This supersedes the earlier manual-selection requirement for drag-and-drop; manual dropdown assignment still leaves selection to the user.
- In the prototype, dropping onto an occupied slot returns its previous target to the unmatched area. Maintain distinct destination assignments throughout.
- Show account names together with distinguishing details such as type, username and hostname.
- Keep selection separate from mapping: unchecking a source account excludes its filters from this restore but retains its mapping.
- Use Restore filters as the main action. Do not introduce an additional preview of filter additions, replacements or conflicts.
- When no saved restore selection applies, initially select all source accounts contained in the file whose destinations can be resolved. Leave unresolved source accounts unchecked.
- Automatically reuse known account mappings across backup files, including files with different account encodings when identifying information establishes the same account correspondence; do not restrict reuse to an identical filename or file representation.
- During initial mapping, position each resolved destination beside its source account, then check the source row. Unselected accounts absent from the file must not be introduced as filter sources; referenced accounts may still appear for destination mapping as described below.
- For an unmatched source account, show Choose destination… and leave its checkbox unchecked. Assigning a destination manually must not automatically check it; the user explicitly selects the source for restore afterward.

## Default backup filenames

Preserve the existing date-and-time format: `YYYY-MM-DD_HH-MM`.

- Exactly one account selected: retain the existing account-based naming, for example `Personal_2026-10-30_14-35.json`.
- Multiple accounts selected: use the profile display name, for example `MainProfile_2026-10-30_14-35.json`.
- Replace characters that are invalid in filenames.
- Allow the user to edit the suggested filename in the Save dialog.
- Also allow editing in the filename textbox at the bottom of the backup dialog before the Save dialog appears.
- If the profile display name is unavailable for a multi-account backup, ask the user to supply a name through that textbox rather than choosing a generic fallback. Require a nonempty filename before proceeding to the Save dialog.

## Account matching and remembered mappings

Account IDs are local to a Thunderbird profile and must not be assumed to identify the same account in another profile.

- For automatic matching, require account type, username and hostname to match. Do not fall back to type and username alone, even when there is only one candidate. Valid remembered manual mappings take precedence over automatic matching.
- Let the user resolve ambiguous matches or select a destination manually.
- Automatically map the source Local Folders account to Local Folders in the destination profile, without requiring a username/hostname match. A valid remembered manual mapping takes precedence.
- Store mappings in the destination profile so repeated restores do not require the same assignments again.
- Retain enough source and destination identifying information to validate remembered mappings.
- Reuse known mappings across source profiles, including copied or renamed profiles, when source account identifying details match. The source profile name is a display label and filename default, not a prerequisite for mapping reuse.
- Validate that remembered destination accounts still exist. Do not silently substitute a different account if a saved destination disappears.
- Remember selection independently of the account mapping.
- Save restore mappings and source-account selections automatically after a successful restore, without a Remember checkbox. Cancelling the dialog must not overwrite the saved configuration.

### Normalizing account details for restore matching

- Match the configured account type, username and hostname independently of the user-editable account display name and profile-local account ID.
- Prefer explicit metadata read from Thunderbird's account/server objects. These username and hostname fields are raw values, not URI components; preserve their originals in the backup.
- For older backups or URI-derived fallback information, parse the account root URI into its components before decoding. Decode percent-encoded username/hostname components once, so encoded characters such as `%40` can match their literal equivalents. Never decode the complete URI before parsing, since encoded delimiters could change its structure.
- Normalize DNS hostnames case-insensitively and compare equivalent internationalized domain forms through a standard hostname/IDN canonicalization facility. Percent-decoding alone does not canonicalize internationalized hostnames.
- Preserve username case and meaningful whitespace; do not lowercase the whole username merely because it resembles an email address. Do not treat `+` as a space: account URIs do not use form-data decoding rules.
- Do not blindly percent-decode raw metadata, repeatedly decode until unchanged, or silently reinterpret a literal `%40` in a real username. Where legacy encoding is uncertain, consider a decoded candidate only as an explicitly identifiable legacy fallback; conflicting candidates require manual mapping.
- Malformed escapes must not abort the restore dialog or produce a guessed match. Keep the original value and leave the account for manual mapping when no reliable match can be established.
- Apply the same normalization rules to remembered source identity matching and automatic destination matching, while retaining original values for display and diagnostics.

The precise legacy-encoding compatibility rules and mapping persistence format remain to be specified. Source-profile identification must not prevent reuse of matching account mappings across profiles.

## Restore merge behavior

Apply the existing behavior within each mapped destination account:

- Replace an existing filter when its name matches an imported filter.
- Add imported filters whose names do not exist in the destination.
- Leave all other destination filters alone.

Do not require persistent metadata inside Thunderbird filters to implement this behavior.

### Duplicate names within an imported account

- Duplicate filter names within one source account are not expected: current versions prevent creating them, so their presence suggests manual editing of the backup file.
- Process the first occurrence normally. Put the second and any subsequent occurrences into a list for later review instead of importing them under the same name, automatically renaming them, or allowing them to replace the first occurrence.
- This case is separate from replacing an existing destination filter with an imported filter of the same name.

### Post-restore review list

- Show skipped filters after restore, including duplicate-name imports and filters that cannot be deserialized, with the reason for each skipped filter. Unresolved move/copy destinations are warnings on imported filters, not a reason to skip them.
- Provide an option to save a report.
- Do not automatically persist the review list across Thunderbird restarts.
- During restore, check whether each referenced custom action and custom search term is available in the destination profile. List unavailable actions and terms as warnings, identifying the source account, filter name and custom identifier. Backup-time warnings alone are insufficient because installed extensions may differ between profiles or change between backup and restore.
- For a filter successfully imported with warnings, provide an Edit filter action in the post-import warning table. Open the actual destination filter in Thunderbird's filter editor, using its destination account and filter identity; do not edit the backup JSON or guess solely by a name across accounts.
- A skipped filter has no newly imported destination object, so do not offer an Edit filter action that could accidentally open or alter an existing filter with the same name.
- Import filters even when referenced custom actions or custom search terms are unavailable, and put them on the warning list with Edit filter available afterward. Preserve their identifiers, serialized values and saved enabled state; do not silently discard unsupported actions or conditions, skip them solely for this reason, or automatically disable them. The user can edit the imported filter or decide to delete it later.

## Move/copy destination correction

Use account mappings to correct folder destinations in Move Message and Copy Message actions during restore.

- Determine which source account owns the action's destination folder. This may differ from the account owning the filter.
- Use that destination account's mapping to locate the equivalent folder in the current profile.
- Preserve the relative folder path when an equivalent folder exists, and obtain the actual URI from the resolved destination folder.
- Avoid blindly replacing hostname text in folder URIs.
- Apply this correction only to imported filters.
- If a move/copy destination cannot be resolved, import the complete filter with that action's original target URI and saved enabled state, and list the unresolved destination and reason as a warning with Edit filter available afterward. Successfully resolved actions in the same filter may still be remapped. This replaces the earlier skip-on-unresolved-folder requirement, so the user can correct the imported filter without rebuilding it. Apply the normal same-name merge behavior to this imported filter.

Example: filters belonging to source account A may move messages into source account B's `Archive` folder. Restoring A into account X must use B's mapping, such as B → Y, to redirect that action to Y's `Archive` folder.

### Referenced accounts without selected filters

- An account must be mappable even when its filters are not selected for restore.
- Show accounts referenced by selected filters as such, allowing their destinations to be assigned without importing their filters.
- Remember these mappings too.
- A single-account backup must include identifying information for other accounts referenced by its move/copy actions, without exporting those accounts' filters unless selected.

## Backup data

### Local settings and recent files

- Store account mappings and remembered selections in quickFilters' own `browser.storage.local` in the destination profile, independently of VFS provider configuration and access grants.
- Remember backup selections only after a successful write; cancellation must not overwrite the saved selection.
- Proposed enhancement: retain a recent-file history for successful backup and restore operations, with filename, location, operation and last-used timestamp. The history limit and presentation remain open decisions.
- For VFS locations, record the `storageRef` (`providerId` and `storageId`, or `null` for OPFS) together with the full VFS `path`. This identifies the location within that storage connection; it does not necessarily expose an operating-system path or remote URL.
- For native local-file access, record the local path separately with its backend identifier.
- Remembered file locations do not grant access. Validate the provider connection or local destination when reused, and keep account mappings independent of individual filenames so they can apply across backups.
- VFS uninstall/revocation cleanup is deferred for later investigation.

### Exported backup contents

Keep supporting metadata in the backup container; do not depend on adding metadata to Thunderbird's filters themselves.

The new format should contain:

- Separate filter collections for each selected account.
- Source account identifiers and matching details, including account type, username, hostname and root URI where applicable.
- Identifying details for additional accounts referenced by exported move/copy actions.
- Source-profile information for display and context; account identifying details support remembered mapping reuse across profiles.
- Backup timestamp and a format version.

Continue to support importing existing single-account backups. They contain less account information, so some mappings may require manual assignment.

## Open decisions

### Future enhancement: moved folders

- Consider detecting whether an invalid move/copy target folder was moved elsewhere within the same account, for example from `Software/Emsisoft` into an `Archive` subtree.
- This is outside the current implementation scope. For now, report the original unresolved destination as Invalid target folder; do not search for or automatically substitute a similarly named folder.
- Any future implementation must account for ambiguous folder names and distinguish a verified move from a guessed name match.

### Remaining implementation decisions

- Verify profile display-name discovery through the toolkit profile service in supported Thunderbird versions. When unavailable, the user supplies the backup name in the dialog's filename textbox.
- Validate the initial version 1 schema and legacy compatibility rules during real restore implementation; the old importer cannot consume the new envelope yet.

## Returning to the filter list

- Keep the originating filter-list dialog open while the backup tab is in use.
- Provide Back to filter list before and after backup. Focus the originating dialog and retain its account/list selection; reopen the filter list if that dialog was closed.
- Keep the backup result visible in its tab until the user closes it. Do not automatically navigate away after saving.
- A successful backup does not change filters and does not require a filter-list refresh. A future successful restore must refresh it.
- Preserve existing legacy backup and restore implementations. During development, changing the toolbar handler back to the legacy entry point must be sufficient to ship a maintenance release with the old workflow. A user-facing switch will be added later.

## Initial acceptance criteria

- One or several selected accounts can be exported to one JSON file.
- Single-account exports retain the existing filename convention; multi-account exports use the profile name with the same timestamp convention.
- A user can restore a subset of backed-up accounts into explicitly mapped destination accounts.
- Repeated restores reuse valid saved mappings and selections.
- Restore follows the existing name-based merge behavior without an additional preview step.
- Move/copy actions resolve to equivalent existing folders using the mapping of the referenced account, including when that account's filters are not being restored.
- Existing single-account backups remain importable.

Restore offers ?Overwrite filters with the same name?, checked by default. When unchecked, existing destination filters are retained unchanged and only filters with new names are imported. Results count ?existing filters kept? separately from skipped filters. More sophisticated merge rules are deferred.

Ctrl-clicking Backup opens selected-filter mode: only the current account and exact filters selected at launch are included. List selected filter names below the account, show the selected count, and suggest ?Account name - selected filters - YYYY-MM-DD HH-MM.json?. Explain that Return to Message Filters allows a different selection, followed by Ctrl-clicking Backup again. Normal full-account export remains unchanged. Missing/deleted selection objects must never cause fallback to exporting the whole account.
