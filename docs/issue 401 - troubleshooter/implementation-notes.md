# Read-only condition text

Use the native `termAsString` getter to display conditions without opening Thunderbird’s filter editor. Port the current `MsgTermListToString()` recipe:

```js
function getConditionText(filter) {
  return filter.searchTerms.map(term =>
    term.matchAll
      ? "ALL"
      : `${term.booleanAnd ? "AND" : "OR"} (${term.termAsString})`
  ).join(" ");
}
```

Source: [Mozilla’s nsMsgUtils.cpp](https://searchfox.org/comm-central/source/mailnews/base/src/nsMsgUtils.cpp) (`MsgTermListToString`). Retain the applicable MPL 2.0 attribution when porting into production code.

This is a serialization of loaded terms, not the original file text. The recipe does not include `beginsGrouping` / `endsGrouping`; show those separately when present rather than claiming this is a complete representation of grouped logic. Revisit the serializer and viewer when Thunderbird implements its mixed-condition interface (Bugzilla bug 297852).

For mixed ALL/ANY results, offer read-only condition inspection and an explicitly confirmed **Disable filter…** action. Do not normalize the conditions. Editing remains available; Thunderbird users must accept a warning before opening mixed/grouped filters. Disabled filters still need review; disabling is not a repair of their logic.

## First implementation

- Live page: `html/filter-troubleshooter.html`, with its controller in `scripts/troubleshooter/page.mjs`.
- Entry points: the existing filter-list troubleshooter button (left or right click) and a new button in the license settings tab’s Premium Features box. The filter-list launch preselects its account. No new legacy window globals or notification bridges are introduced.
- `FiltersAPI` owns diagnostic sessions, exact-filter tokens, scans, condition text, confirmed remedies and the native log dialog. Sessions are released when the tab closes or its account changes; stale/replaced filters are rejected.
- Checks never write. Manual-only, outgoing, archive and post-plugin filters are not treated as lacking an execution method. Mixed/grouped conditions are reported as needing review, rather than automatically rewritten. Betterbird omits that part of the condition check but still checks for missing conditions; an italic note explains the difference.
- Remedies use Thunderbird’s confirmation prompts before enabling incoming-mail execution, disabling or deleting a filter. Failed saves attempt to restore the original state and file. Normal editor changes use the editor’s own save/cancel flow.
- The compact problem table is part of the shared `scripts/filter-review/warning-panel.mjs` component. Each check-button action recreates the results list and resets search/status filters: a single check shows only its results, while Run all checks shows a fresh combined list. After a remedy, only the current checks are refreshed, retaining resolved/deleted rows for that action. Disabled mixed-condition filters remain in the review list. Account changes clear the previous account’s results.
- The native filter-log dialog receives the selected account’s filter list. This corrects the prototype’s provisional all-accounts hint. The standard tabs API is tried for Add-ons Manager; an explicit FiltersAPI fallback handles privileged-URL restrictions.
- All new messages use `troubleshooter.`. Full-UI locales are translated; SPLASH-only locales use the default-locale fallback.

## Condition viewer and editing warnings

- Missing custom actions/terms show only their labelled identifier in the expandable details, or “Missing identifier” when empty. Search values and incomplete `termAsString` fragments are omitted there.
- The condition table includes a final Search term ID column. Unavailable custom terms show their identifiers in red, with an unavailable tooltip. Built-in terms leave this column empty.
- Copy sits beside the serialized-text panel; Edit filter and Close sit in the footer. Editing closes the viewer first. Unparseable filters remain ineligible for editor access.
- FiltersAPI checks `Services.appinfo.name === "Thunderbird"` before warning about editing mixed/grouped conditions. Cancel is the default. Betterbird and other distinctly named clients do not receive this warning.
- Only confirming “Open editor anyway…” with “Don’t warn again until Thunderbird restarts” checked sets `troubleshooter.skipMixedConditionsEditWarning` in `browser.storage.session`. It applies across review tabs/accounts and clears on restart or extension reload. Cancelling never stores consent. All other mutation confirmations remain independent.

## Validation

Run `node --test "docs/issue 401 - troubleshooter/test-troubleshooter.mjs"` for read-only scans, stale tokens, mixed-condition editing warnings, restart-scoped consent, explicit confirmations, save rollback, retained results and localization checks. The existing backup/restore and premium-usage tests also cover shared code.

For a browser-only preview of the live page, run `node "docs/issue 401 - troubleshooter/preview-server.mjs"` and open `http://127.0.0.1:8765/html/filter-troubleshooter.html`. It uses simulated data and never reads Thunderbird filters. Stop the server with Ctrl+C.

Thunderbird smoke checks still needed: both entry points, account preselection/switching, filter log, Add-ons Manager, normal editor save/cancel, condition viewer/copy, cancel/confirm each remedy, refresh after changes, and light/dark layout. Browser visual automation could not run because Computer Use could not verify the active browser URL.
