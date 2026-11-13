Storage migration and startup validation
========================================

Run `node "docs/issue 392/preferences.test.mjs"` from the repository root.

The authoritative normal and debug defaults are in scripts/preference-defaults.js, a classic script with no ESM exports or storage operations. Extension pages load it before their consumers. Legacy Storage loads it into an isolated target using loadSubScriptWithOptions with allowUnsafeURL: true. No additional chrome registration is required.

First repeat an ordinary installation over the previous version without forcing migration. Confirm that the legacy cache initializes and the Error Console has no blocked defaults-module import. The Node tests check loader wiring and isolation; Thunderbird must verify the actual privileged loader and window security policy.

Thunderbird manual checks (use a test profile):

1. Start with absent legacy settings: the template should be `from`, refreshHeaders.wait should be 150. Explicit false, zero, and empty-string choices must survive migration. Existing storage choices take precedence over older legacy settings.
2. With settingsVersion 1.61, set filters.currentTemplate and refreshHeaders.wait to JSON null in the storage editor. Restart: they should be repaired to `from` and 150. Deliberate non-null values should remain unchanged.
3. Change templates in the HTML assistant and verify the legacy assistant and subsequent filter creation use the new selection. Repeat with a newly added storage key and after removing a setting.
4. In Thunderbird's Config Editor, create the hidden Boolean preference `extensions.quickfilters.debug.storage.forceFailure` and set it to true. Restart. Expect six failed attempts, one settings failure notification, no injected quickFilters startup, and an error message when opening settings. This switch is read directly from legacy preferences; it does not need a working storage backend and is not migrated.
5. Reset the test preference (or set it to false), then restart. Normal startup should resume with stored settings intact.
6. In Error Console, enable [Browser] and [Content] on Thunderbird 154+. Capture quickFilters messages and related IndexedDB/quota backend errors. A delayed success is reported as `status: "delayed"`; exhausted retries are `status: "failed"` with the original error name/message. This reports observed failure, not a diagnosis of disk corruption.

Startup retries rejected storage operations up to six times, with delays of 100, 500, 1000, 2000, and 4000 ms. Each storage call has a 10-second deadline. A timeout terminates startup immediately because the underlying operation cannot be cancelled safely; it is never overlapped with another attempt. A late write can still finish, but startup stays failed until restart.

Internal extension pages can request `{ command: "getStorageReadiness" }` through runtime.sendMessage. The result contains ok, status, attempts, and error on failure. Pending requests wait for the terminal result.

Already stored zero values cannot be distinguished safely from intentional zero choices. They are deliberately not reset. The old migration already skipped null/undefined before normalization; the normalization guard now also protects direct callers from Number(null).

These automated tests mock storage and LegacyPrefs. Native Thunderbird injection, notifications, and real IndexedDB/quota failures require the manual checks above.
