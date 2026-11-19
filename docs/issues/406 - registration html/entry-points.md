# Registration entry points and migration checklist

Inventory for issue #406. The HTML registration page is currently a live-checkout test scaffold, with synthetic scenarios and English-only dynamic text. Do not treat this inventory as confirmation that callers have already migrated.

| Entry point | Current path | Context to preserve |
| --- | --- | --- |
| Main toolbar license menu | `qFi-messenger.js`, `quickfilters-gopro` → `showLicenseDialog` | `mainBtnPopupMenu` |
| Tools → registration | `qFi-messenger.js`, `quickfilters-menu-registration` → `showLicenseDialog` | `toolsMenu` |
| Premium-feature prompts | `qFilters-utils.js`, `popupProFeature` → `showLicenseDialog` | The originating feature name |
| Filter assistant renewal | `qFilters-assistant-dlg.js` → `showLicenseDialog` | `assistant_renew`; preserve the assistant |
| Settings → license action | `quickfilters-settings.js` → `Utilities.showLicenseDialog` | `options_` plus the active tab; close Settings only after registration opens |
| Troubleshooter → Get Pro | `scripts/troubleshooter/page.mjs` → `Utilities.showLicenseDialog` | `troubleshooter`; retain the troubleshooting tab |
| Update / welcome register buttons | `popup/update.js` → `Utilities.showLicenseDialog` | `splashScreen`; close the splash only after successful navigation if the existing workflow expects it |
| Update / welcome renewal icon and extend / renew buttons | `popup/update.js` → `Utilities.showXhtmlPage(register.xhtml)` | Preserve the source context; close the splash only after registration opens |
| Test → Registration (HTML) | `qFi-messenger.js` → `openRegistrationPreview` | Keep synthetic scenarios explicitly test-only |

`Utilities.showLicenseDialog` delegates to the legacy helper; the shared legacy helper ultimately opens `register.xhtml`. Other code can call the Utilities API, so search again before removing or changing its contract. The legacy Settings-entry action in `qFilters-register-dlg.js` is part of the legacy dialog itself, not a separate registration opener.

## Required behavior

- Normal entry points open or reuse the live registration tab, preserve their raw feature referrer, and focus the tab's window. Reset stale feature and test-scenario parameters when reusing a tab.
- Settings → registration closes the Settings tab only after registration opens successfully. Registration → Enter license key opens or reuses Settings on the license page and closes registration only after success.
- Keep the originating troubleshooter or backup tab open: the user may be in the middle of a task. Focus registration in the foreground. Likewise, preserve the composer and assistant. The update or installed splash may close after registration opens successfully; leave it open on failure.
- Keep an explicitly labeled legacy registration action in the quickFilters Tools menu as a fallback. Preserve existing menu element contracts and use the existing localization infrastructure for its label.
- A valid or expired license key takes precedence over the feature referrer on checkout; otherwise use the feature when present. Use HTTPS and encode query parameters once.
- Before switching normal entry points, separate test scenarios from live operation, localize dynamic messages according to each locale's `_l10nstatus`, and verify all live product routes and errors. Current test-mode strings and sample controls must not appear in normal user flows.

## Manual checks

Exercise each entry point with a representative feature, including the assistant and multiple Thunderbird windows. Confirm the originating feature reaches a new purchase, an existing key takes precedence, the right tab is focused, and failure leaves the originating page open. Check both directions of the Settings handoff and the legacy fallback. Do not record real keys or contact details.
