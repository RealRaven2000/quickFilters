# #400 - Reimplement license restrictions based on trial counts

## Implementation

Trial usage is stored in the Thunderbird profile and persists across restarts and normal add-on reinstalls.

Previously, trials counted down remaining uses. They now increment a counter of consumed uses, with maximum allowances defined in application code. Negative counter values are treated as zero, so they cannot grant additional trials beyond the configured allowance.

When a Pro license becomes valid, all trial counters reset to zero. While it remains valid, premium features do not consume trials. If it expires, the restored allowances remain available. Invalid or expired keys and repeated validation of an already valid license do not reset usage.

- Folder search: block searching after its 15 trial uses are exhausted.
- Local Folders autorun: require a valid Pro license, with no trial counter. Enforce this at runtime even if the saved checkbox preference remains enabled.
- Custom templates: review the intended restriction. The current trial warning occurs when creating a filter from a template and blocks nothing. It does not gate the editor.

Folder-search and Local Folders enforcement are implemented. Custom template behavior remains unchanged pending a decision.

| Feature | Free uses | Restriction after trials |
|---|---:|---|
| Advanced filter search | 15 | Blocked |
| Duplicate finder | 10 | Blocked |
| Sort search terms | 25 | Blocked |
| Sort filters | 20 | Blocked |
| Backup/save filters | 10 | Blocked |
| Restore/load filters | 3 | Blocked; session/day allowance proposed |
| Find filters for a folder | 15 | Blocked |
| Filter troubleshooter | 8 | Blocked; one trial per tab, further checks included |
| Run filters in Local Folders | — | Valid Pro license required; checkbox and runtime checks |
| Custom templates | 20 | Not enforced; intended gate requires review |

Resetting a counter in Thunderbird’s Config Editor restores its full allowance. Old countdown preferences are ignored.

Custom template settings already restrict enabling templates and creating new templates to licensed users. The current trial warning runs when creating a filter from a template, but its return value is ignored.

## Trial notifications

The shared yellow warning shows the remaining count when it is greater than zero. The exhausted-trial sentence appears only for denied attempts in the seven enforced gates using that warning. Custom template notifications omit that sentence. The troubleshooter has its own trial messages.

### Proposed restore allowance: session or same day

Not implemented: replace individual restore attempts with three restore trial sessions. The first restore would consume one allowance; iterative restores would remain allowed while Thunderbird is still running or while the local calendar date is unchanged. The final allowed session/day must stay usable even with zero additional allowances remaining.

Supporting the same-day rule across Thunderbird restarts requires a persisted last-consumed local date in addition to the usage count. Keeping a long-running session allowed across midnight also requires session state that lasts until Thunderbird exits. An add-on reload should not consume another allowance within that session. Exact storage and wording remain to be decided; current restore usage is still counted per attempt.

## Architecture

- Maximum allowances are defined centrally in `scripts/premium/usage-policy.js` and exposed through `usage-limits.mjs`.
- The shared usage store performs synchronous read/check/increment operations. Denied attempts do not increment usage. Existing counts are preserved when limits change.
- Explicit Utilities experimental APIs expose initialization, atomic consumption and license-state updates. Legacy scripts use the existing WindowListener context; no new notification bridge is added.
- License-state synchronization runs after startup validation, license entry/renewal, midnight date updates and mail-account revalidation. The previous validity state is stored in the profile to detect invalid-to-valid transitions.
- Folder search awaits permission before scanning or opening results. Local Folders autorun checks the license when collecting messages and again before applying filters.

### Installation fix: package loading

The Utilities experiment loads `usage-policy.js` and `usage-store.js` into a fresh private scope using the existing package-script loader. System-module imports reject the extension's file/jar URLs. The background uses small ESM wrappers over the same scripts; no policy or counter logic is duplicated. The `quickFiltersPremium` namespace exists on the background global or private experiment scope, never on an injected Thunderbird window. The loader test now rejects non-resource system-module imports and executes both usage scripts for unpacked and packaged roots.

The subscript target now supplies an explicit shared `quickFiltersPremium` object. Package scripts write to that object rather than assuming `globalThis` is the target. The loader regression test uses a separate `globalThis` to cover the reported Gecko behavior.

## Verification

Run `node --test "docs/issue 400 - usage/test-premium-usage.mjs" "docs/issue 400 - usage/test-premium-gates.mjs"`. Integration coverage also remains in the #193 backup/restore tests.

All 15 usage/gate tests pass. Tests cover negative-value normalization, ignored legacy countdowns, Config Editor Reset, exhausted trials, separate counters, limit changes, fresh API instances over retained profile preferences, denied calls, license resets, background validation triggers, and concurrent consumption of the final allowance from two API scopes.

Native smoke testing is still needed: inspect the count-up preferences in Config Editor; exhaust a feature allowance without a valid license; restart/reinstall and verify it remains exhausted; validate a license and verify zero counts; restart while valid and verify no additional reset; then test expiry/renewal transitions.

## Localization key cleanup (#402)

Removed the redundant `quickfilters.` / `quickFilters.` prefix from localization keys and updated literal lookups, markup placeholders and the dynamic premium-title lookup. All existing locale entries retain their translations, placeholders and scope. The `qf.` prefix remains for a later pass.
