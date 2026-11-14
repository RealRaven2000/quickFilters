At the moment the assistant window (especially first page) seems somewhat clunky, especially when reducing the width:

with a bigger window, there is not too much of a problem:

<img width="934" height="625" alt="quickFilters-Assistant-collapsed" src="https://github.com/user-attachments/assets/926f071c-053f-4ef1-90e8-5c1283d78c87" />

at narrower window width spacing choices become weird: 

<img width="582" height="687" alt="image" src="https://github.com/user-attachments/assets/4780a339-ffe5-431b-a02b-61e9f34d5aae" />

**Requirements**

- Responsiveness: Improve the filter assistant's layout at narrow window widths while making better use of space in wider windows.
- Replace the ugly [-] [+] expand buttons with something more modern
- When merging, show the actions of the selected target filter and update the summary when the selection changes.
- Make the merge layout horizontally responsive: use the available width for the filter list and action summary, wrap long action text, and stack the summary below the list in very narrow windows without horizontal scrolling.

**Methods**

- Reduce the template list and option-group font sizes at narrow viewport widths.
- Replace the Actions and Next Steps group frames with subtle vertical dividers that blend with the current theme.
- Make the Actions and Next Steps headings bold.
- Reduce padding and gaps in compact windows, allowing more space between groups as the window widens.
- Keep checkboxes beside their labels and align wrapped label text.
- Allow the template list to use the remaining horizontal space.
- Replace the description and preview expand/collapse icons with chevrons: down to expand, up to contract.
- Reduce the chevrons by 33% while preserving their click area.
- Add a "Selected Filter" section beside the merge candidates, showing the selected filter's name and a bulleted list of all its actions, including relevant details such as destination folders and tags.
- Provide the action summary through an explicit FiltersAPI method that can be used by the assistant without a troubleshooter session.

The static layout prototype is in `merge-actions-prototype.html` in this directory; the sample actions are illustrative.

**Implementation**

- `FiltersAPI.getFilterActionText({ accountId, filterName })` returns the filter name, enabled state and all action descriptions in stored order, without requiring a troubleshooter session.
- Reuse Thunderbird's native Fluent action labels, priority and spam status labels, folder names, tag names and custom-action provider names. Only the summary heading and loading, empty and error states add English localization entries.
- Update the summary for mouse and keyboard selection. Ignore stale responses when switching filters quickly.
- Selecting Create a New Filter preserves the last summary and grays it out.
- Use two responsive columns, wrap long action values, and stack the summary below the candidate list in very narrow windows.
- Run the focused tests with `node --test docs/issues/404/action-summary.test.mjs docs/issues/404/assistant-lifecycle.test.mjs`.
- Keep background-owned request tracking, result handling, X-close cleanup and bounds persistence in `html/assistant-lifecycle.mjs`; the background delegates to this ES module.
- Handle X-close cancellation in the background only; Cancel/Escape waits for acknowledgement before closing, avoiding duplicate cancellation attempts.
- Save normal window bounds from the background while the assistant is open, and capture final bounds before acknowledging a result. Stop tracking when the window closes; no storage writes run in the assistant page's blur/unload handlers.

**Assistant lifecycle regression**

Repeated closing/cancelling exposed an unresolved assistant result promise that kept the filter-creation lock held and prevented subsequent assistant launches. The failing close sequence is captured in `regressions-2.log`.

- Send cancellation immediately and await acknowledgement before closing through Cancel/Escape.
- Resolve outstanding requests from the background when the assistant window closes with X, without depending on asynchronous work in the closing page.
- Avoid duplicate cancellation by making the background responsible for X-close; preserve warnings for genuinely unknown request IDs.
- Save window bounds in the background instead of writing storage from blur/unload handlers.
- Await assistant launch failures so they reach the error handler and release the waiting request.
- Add Tools → Test → Cancel blocked assistant promise as a developer recovery command, resolving requests normally rather than forcibly clearing the worker lock.

**Validation (14/11/2026):** Repeated close/cancel testing in Thunderbird initially confirmed all six recorded requests resolved and released their locks (`assistant-promise-resolver.log`). After the lifecycle cleanup, further user testing appeared stable. All 11 focused automated tests pass; JavaScript syntax checks pass.
