# Filter warning presentation

`warning-panel.mjs` exports `createFilterWarningPanel(options)`. Import `warning-panel.css` in the host page. The host supplies its theme variables (`--text`, `--line`, `--soft`), base font and button styling.

The renderer has no dependency on backup modules, storage, browser APIs or privileged Thunderbird APIs. It builds a `<details>` panel containing a warning table and returns `panel`, `highlightAccount(accountId)`, `markEdited(token)` and `markDeleted(token)`.

Supply these options:

- `el(tag, className, text)` creates a DOM element.
- `accounts` contains `{ id, name }` records for account labels.
- `warnings` contains `{ accountId, filterName, token, reason, description, details }`. A caller-supplied `description` overrides the built-in reason label. Optional `customId`, `customName` and `targetFolderUri` provide richer details. One filter can have several warnings sharing a token.
- `text(key, substitutions)` resolves localized presentation strings. The renderer uses semantic keys such as `warnings`, `account`, `editFilter`, `delete` and `editedByUser`; the caller decides which catalog namespace supplies them.
- `onEdit(token)` and `onDelete(token, filterName)` are optional callbacks. Either enables the Action column. The caller handles confirmation, native operations, persistence, errors and change tracking, then calls `markEdited` or `markDeleted` after success.
- `title`, `panelId`, `deletedLabel` and `changeReminder` customize the presentation. Only set `changeReminder` for workflows that need an additional backup reminder.

Edited rows retain their previous warning with strikethrough and replace Details with an edited badge. Deleted rows stay visible with the filter name struck through and action buttons replaced by a badge. Updating one token updates all of its warning rows.

`scripts/backup/warning-table.mjs` is the backup/restore adapter. It maps native review tokens and existing `backup.warnings.*` messages onto this interface. Those message keys remain unchanged for translators.
