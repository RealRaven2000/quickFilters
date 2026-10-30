### Closing #261

The HTML assistant migration is complete and the active/default implementation is now the HTML-based flow.

#### Timeline
- 2025-08-03 — issue #309: initial HTML assistant window
  - commit: `8c01bed534a2da1627950c14631a8efe201e0072`
  - message: `#309 implementation (WIP) - added filter assistant window (HTML)`

- 2025-08-06 — issue #309: integration with worker/background flow
  - commit: `1341a80c9e1074f46bc1da242d6131ec87a007c1`
  - notes from the message:
    - added new assistant dialog (HTML)
    - added integration in worker createQuickFilterExec flow
    - passed selected messages/context to the HTML dialog
    - autofill of merge filter list and preview fields

- 2025-08-07 to 2025-08-12 — issue #309: flow, preview, layout, localization, and support-button work
  - includes fixes for context passing, preview sizing, resizing, layout polish, and help integration

- 2025-08-21 — issue #231: keyboard support and theme polish
  - commit: `8493c4c9e43e11954072c8169c213138676e7f1c`
  - message: “Implemented [Enter] and [Escape] keys … improved style of buttons and made them more theme compliant.”

- 2026-07-09 — issue #380: focus/position improvements

- 2026-07-28 / 2026-08-31 — issue #383: regression fixes and storage/background compatibility

- 2026-10-01 — issue #393: final dialog styling / hover / layout fixes

#### Main implementation files
- `html/filterAssistant.html`
- `html/filterAssistant.js`
- `html/filterAssistant.css`
- `html/assistant-dlg.js`
- `html/assistant-util.js`
- `html/assistant-quickFilters.js`

These are the actual replacement UI and logic for the assistant. The legacy XUL/XHTML files remain only as deprecated compatibility artifacts, not as the active/default implementation.

This issue can therefore be considered complete.
