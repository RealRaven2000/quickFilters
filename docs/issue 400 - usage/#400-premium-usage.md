Title: 

Refactor Premium Feature Trial usage tracking 

Synopsis: 

Replace countdowns with count-up usage stored under `extensions.quickFilters.usage.*`. Define maximum allowances in a shared JavaScript module, migrate existing counters, and expose atomic consumption through an experimental API. Reset usage when a license becomes valid, and ensure feature gates await their checks.

**Motivation**

Accurately check usage of premium features to help with pro license conversion. Resetting usage should avoid penalizing users who already had a valid license and may not have renewed it. This would be a gentle way of monetizing the Add-on without too much pressure.

The old usage countdown check did not fully work as it was turned async and didn't block usage, thus running into negative numbers, which was also confusing.

## Implementation

- Store integer counts under `extensions.quickFilters.usage.<feature>` in Thunderbird profile preferences. The defaults in `chrome/content/scripts/quickFilter-prefs.js` are zero. Counters are outside settings export/import and survive a normal add-on uninstall/reinstall.
- Keep maximum allowances in `scripts/premium/usage-limits.mjs`. These remain 10 backups, 3 restores, 20 filter sorts, 25 condition sorts, 15 advanced searches, 10 duplicate searches, 15 folder searches, 20 custom templates, and 5 local-folder filter uses. Historical countdown limits are kept separately in that module for migration; changing today's policy must not invent past usage.
- `scripts/premium/usage-store.mjs` implements synchronous read/check/increment operations over profile preferences. Denied attempts do not increment usage. Existing counts remain meaningful if limits change.
- Expose initialization, atomic consumption and license-state updates through explicit Utilities experimental API methods. Consumption returns `{ allowed, used, remaining, maximum }`. Legacy code uses the existing WindowListener context to call the API; no new notification bridge is added.
- Migrate once, with this priority: existing count-up preference; profile `.countDown` value from earlier development; local-storage countdown; legacy Thunderbird countdown; zero. Zero/negative countdowns migrate to an exhausted historical allowance. Keep the old values for now, but never overwrite an established count-up preference with them.
- A valid license bypasses trial consumption. After validation, background code checks the license state at startup, license entry/renewal, midnight date updates and mail-account revalidation. An invalid-to-valid transition resets all counts to zero; repeated valid checks do nothing. `extensions.quickFilters.usage.wasLicensed` records the previous state. Expiry preserves the restored allowances for grace uses.
- Backup, restore, filter sorting, condition sorting, interactive advanced search and duplicate finding await the gate before proceeding. Failed counter access denies the trial operation.

## Verification

Run `node --test "docs/issue 400 - usage/test-premium-usage.mjs" "docs/issue 400 - usage/test-premium-gates.mjs"`. Integration coverage also remains in the #193 backup/restore tests.

Tests cover migration precedence, exhausted trials, separate counters, limit changes, fresh API instances over retained profile preferences, denied calls, license resets, background validation triggers, and concurrent consumption of the final allowance from two API scopes.

Native smoke testing is still needed: inspect the count-up preferences in Config Editor; exhaust a feature allowance without a valid license; restart/reinstall and verify it remains exhausted; validate a license and verify zero counts; restart while valid and verify no additional reset; then test expiry/renewal transitions.

## Follow-up audit

The pre-existing `customTemplate`, `searchFolder` and `localFolderFilters` call sites use `popupProFeature()` as a notification and ignore its return value (some run after the action). Their enforcement needs separate review; this change does not silently move those checks or change their workflows. Legacy preference cleanup is also deferred.

### Installation fix: package loading

The Utilities experiment loads `usage-policy.js` and `usage-store.js` into a fresh private scope using the existing package-script loader. System-module imports reject the extension?s file/jar URLs. The background uses small ESM wrappers over the same scripts; no policy or counter logic is duplicated. The `quickFiltersPremium` namespace exists on the background global or private experiment scope, never on an injected Thunderbird window. The loader test now rejects non-resource system-module imports and executes both usage scripts for unpacked and packaged roots.

The subscript target now supplies an explicit shared `quickFiltersPremium` object. Package scripts write to that object rather than assuming `globalThis` is the target. The loader regression test uses a separate `globalThis` to cover the reported Gecko behavior.
