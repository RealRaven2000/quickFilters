# Registration entry points and migration checklist

Inventory for issue #406. The HTML registration page is the live registration flow. The legacy registration dialog and its fallback have been retired.

| Entry point | Current path | Context to preserve |
| --- | --- | --- |
| Main toolbar license menu | `qFi-messenger.js`, `quickfilters-gopro` → background registration opener | `mainBtnPopupMenu` |
| Tools → registration | `qFi-messenger.js`, `quickfilters-menu-registration` → background registration opener | `toolsMenu` |
| Premium-feature prompts | `qFilters-utils.js`, `popupProFeature` → NotifyTools → background registration opener | The originating feature name; Get Pro test passed on 2026-11-20 |
| Filter assistant renewal | `qFilters-assistant-dlg.js` → NotifyTools → background registration opener | `assistant_renew`; preserve the assistant |
| Settings → license action | `quickfilters-settings.js` → runtime message → background registration opener | `options_` plus the active tab; close Settings only after registration opens |
| Troubleshooter → Get Pro | `scripts/troubleshooter/page.mjs` → background registration opener | `troubleshooter`; retain the troubleshooting tab |
| Installed and update welcome actions | Runtime message → background registration opener | `landing-install`, `landing-update`, or `splashScreen`; close the popup only after successful opening |
| Backup and restore tabs | Runtime message → background registration opener | `saveFilters` or `loadFilters`; keep the work tab open |
| Test → Registration (HTML) | `qFi-messenger.js` → `openRegistrationPreview` | Keep synthetic scenarios explicitly test-only |

The legacy dialog, its dedicated Utilities API and Tools fallback have been removed.

## Required behavior

- Normal entry points open or reuse the live registration tab, preserve their raw feature referrer, and focus the tab's window. Reset stale feature and test-scenario parameters when reusing a tab.
- Settings → registration closes the Settings tab only after registration opens successfully. Registration → Enter license key opens or reuses Settings on the license page and closes registration only after success.
- Keep the originating troubleshooter or backup tab open: the user may be in the middle of a task. Focus registration in the foreground. Likewise, preserve the composer and assistant. The update or installed splash may close after registration opens successfully; leave it open on failure.
- A valid or expired license key takes precedence over the feature referrer on checkout; otherwise use the feature when present. Use HTTPS and encode query parameters once.
- Before switching normal entry points, separate test scenarios from live operation, localize dynamic messages according to each locale's `_l10nstatus`, and verify all live product routes and errors. Current test-mode strings and sample controls must not appear in normal user flows.

## Manual checks

Exercise each entry point with a representative feature, including the assistant and multiple Thunderbird windows. Confirm the originating feature reaches a new purchase, an existing key takes precedence, the right tab is focused, and failure leaves the originating page open. Check both directions of the Settings handoff and confirm the legacy fallback is absent. Do not record real keys or contact details.

- 2026-11-20: With a fresh build, Get Pro in the premium-feature notification opened the new registration tab. The notification bar closed in the original three-pane window. Passed; feature-referrer checkout and multi-window behavior remain separate checks.
- 2026-11-20: Maintainer confirmed Get quickFilters Pro is displayed and opens registration from both backup and restore tabs. The newly added trial allowance display requires a separate test.
