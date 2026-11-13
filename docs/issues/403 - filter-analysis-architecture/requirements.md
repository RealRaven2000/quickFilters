# Filter analysis architecture requirements

Status: discussion draft, 2026-11-12. Tracking issue: #403. Documentation only; implementation is not authorized by this document.

## Problem and agreed constraints

FiltersAPI currently loads backup.js, restore.js and troubleshooter.js using loadSubScriptWithOptions and supplies implicit dependencies through target objects. For example, implementation.js creates t and injects it into backupAPI; backup.js uses t as a free identifier. Restore and troubleshooter use the same pattern. The premium usage scripts are also loaded into an injected scope.

These are private experimental API scopes, not surviving legacy window globals. Nevertheless, privileged code currently mixes native inspection, analysis policy, localized errors, result collation, licensing decisions and presentation. Some operations also depend on a mail window's quickFilters.Util. Merely replacing the loader would not resolve those responsibilities.

There is no existing standard Thunderbird filters API. Native reading, editing and serialization of filters must remain in the experimental FiltersAPI. The objective is to make its output usable by ordinary MailExtension modules, so a future standard API can replace the native adapter without rewriting analysis and presentation.

Related work: #401 troubleshooter, #400 usage accounting. This discussion does not establish a cause for #396.

## Proposed responsibility boundary

| Layer | Responsibilities |
| --- | --- |
| Experimental FiltersAPI | Read native filter lists; serialize native entities; inspect privileged runtime facts; keep native object identity behind opaque tokens; validate and perform requested native edits; retain native dialogs where required. |
| Background coordinator | Acquire snapshots through explicit API methods; manage jobs, account selection, cancellation and usage policy; invoke analysis modules; send structured results to pages. |
| scripts/filter-analysis/ | Proposed MX-compatible ES modules for deterministic checks, evidence interpretation, finding collation and result models. No XPCOM, window.quickFilters or injected globals. Keep the analysis core independent of browser globals as well. |
| Extension pages and shared review components | Localize reason codes; render findings, condition descriptions, reports and confirmations; request actions and display refreshed results. |

Native validation, stale-object protection and any integrity-critical checks remain authoritative in FiltersAPI even when workflow and presentation move out. Moving a prompt must preserve its existing confirmation requirements and default choices. No new notification bridge or notify listener.

## Reusing backup filter entities

Recommendation: reuse the JSON-compatible filter entity as the shared data core, with a separate versioned snapshot envelope and sidecar native observations. Do not make a saved backup file the complete live analysis contract, and do not invoke the export workflow merely to inspect filters.

### Advantages

- One representation for names, enabled state, execution types, actions, conditions and grouping reduces competing serializers and field mappings.
- Existing backup fixtures can exercise portable analysis, and imported backups can support a useful offline subset of checks.
- Backup review and troubleshooter can share rule implementations and structured reason codes.
- A future filters API needs an adapter into the shared core rather than a second implementation of the analysis rules.
- Shared preservation tests can improve both diagnostics and backup fidelity.

### Disadvantages and mitigations

- Backup persistence and live analysis have different lifetimes. Keep formatVersion separate from snapshot schemaVersion and analyzer version; changing analysis metadata must not silently change the backup format.
- Backups cannot establish current folder existence, provider availability or native editability. Supply live observations separately; offline analysis must mark these checks unavailable or unknown.
- Native enum numbers and profile-local account IDs/URIs are implementation-specific. Document their meaning and translate through an adapter/capability table; do not assume they are the eventual standard API contract.
- A serializer intended for restoration may omit diagnostic evidence or fail on malformed entities. Preserve failures per field/filter and account instead of aborting the whole scan or inventing empty values.
- Full entities can include addresses, search strings, descriptions and folder URIs. Keep them local, avoid automatic logging, request only needed evidence and exclude transient data from exported reports by default.
- Serializing everything can cost memory and block the native context for large accounts. Support account-scoped acquisition, bounded batches and cancellation between batches; define thresholds from measurement.
- Sharing the core couples consumers. Add compatibility fixtures and explicit adapters rather than letting analysis-only fields leak into restore logic.
- Backup export currently includes premium checks, warning generation, window-dependent helpers and review-token registration. Extract the serialization capability before reuse; analysis acquisition must not trigger export dialogs, export usage consumption or backup file writes.

## Existing serializer audit required

Relevant code: chrome/content/qFilters-utils.js serializeFilter(), chrome/content/api/filtersAPI/backup.js exportBackupAccounts(), scripts/backup/backup-format.mjs and chrome/content/api/filtersAPI/troubleshooter.js scanFilters().

- The backup path supplements matchAll and customTermName after calling the legacy serializer. A shared serializer must have one documented preservation contract.
- The legacy serializer emits op only when truthy. Audit zero-valued operators before relying on their absence in analysis.
- FolderInfo currently assigns searchTerm.value.folder directly. Verify and convert native objects to a documented portable representation; JSON stringify success alone is not proof of fidelity.
- Preserve order, grouping counters, booleanAnd, matchAll, custom IDs, enabled state and filterType without normalization. Preserve custom-template placeholders verbatim.
- Reading a missing custom provider currently produces a logging side effect. Acquisition should return structured evidence and let callers decide how to present or log it.
- Unparseable filters require a safe failure representation. Reading their action/term collections must not prevent reporting other filters. Raw native text is optional evidence, never interpreted as a complete parsed entity.

## Data contract requirements

1. Snapshot envelopes must declare schemaVersion, snapshotId, acquisition time, source kind (live or backup), account context, producer/app version and capabilities. Unsupported schema versions must fail explicitly.
2. Each entry must contain a reusable serialized entity where available, account association, list position for display, snapshot-local entry ID, completeness status and structured inspection failures. Names and list indices are not mutation identities.
3. Live snapshots may carry opaque session-scoped tokens. Native objects, methods, Components, Maps, Error instances and privileged references must not cross the boundary. Tokens must never be written into backups.
4. Native observations must be separate from derived findings. Examples: folder lookup result, canFileMessages, custom action/term registration, native editability and runnable-type capabilities. Use explicit known/unknown/unavailable states with reason codes and provenance, not ambiguous booleans.
5. Observation references must identify the entry and action/term position, with a defined indexing convention. No silent deduplication or reordering.
6. Account acquisition failures and per-field failures must remain distinguishable from empty accounts, missing conditions and confirmed unavailable providers.
7. Findings must have stable rule/reason codes, category, severity, entry reference, evidence references and suggested action identifiers. Localized text belongs in presentation. Raw exception text may be diagnostic detail but must not drive rule decisions.
8. An illustrative envelope is {schemaVersion, snapshotId, source, acquiredAt, capabilities, accounts, entries, observations, errors}. Final field names and the JSON Schema remain a design task; this draft does not freeze them.

## Analysis and action requirements

- Pure rules accept entities, observations and explicit policy/capabilities, and return findings without reading live state, storage or the DOM.
- Existing checks must retain their behavior: execution methods, folder targets, missing custom actions/terms, missing conditions, unparseable filters and mixed/grouped conditions. Manual-only filters must not receive an automatic execution-method repair; disabled mixed filters remain reviewable.
- Runtime facts such as application support for mixed conditions must be passed explicitly. Native observation failures must produce incomplete-inspection findings, not false missing-folder or missing-provider diagnoses.
- Collation must distinguish findings from acquisition errors and preserve partial results. Define deterministic finding identity within a snapshot and a reconciliation policy across rescans; tokens alone cannot identify findings across sessions.
- Localization and report formatting must occur after analysis. Existing shared warning-panel behavior should be reused where suitable.
- Background should own workflow and usage orchestration; moving it must preserve atomic usage accounting across tabs and existing native enforcement where required. Acquisition must not accidentally consume both backup and troubleshooter allowances.
- All writes remain explicit experimental API calls. Revalidate native identity, relevant current state and requested operation before editing; reject stale/replaced filters and expired sessions. Page confirmations must not imply that a stale token is safe to reuse.
- Preserve rollback, save behavior, cancellation defaults, mixed-condition editor warnings and existing UI integration contracts. Refresh affected evidence after mutation before declaring a finding resolved.

## Loading and lifecycle requirements

New MX-compatible code uses ordinary ES module imports. No helpers supplied as undeclared free identifiers. Privileged modules should likewise declare dependencies through supported imports or explicit factories with returned exports.

Reduce loadSubScriptWithOptions by moving portable logic out first. Investigate a supported native module-loading approach for the remaining privileged code and verify its extension URL support, cache/reload behavior and teardown before choosing it. Do not exchange the existing private scopes for cached modules with stale extension contexts. No new legacy window global bindings.

Sessions, tokens, pending work and listeners must be released on page/job completion, cancellation, extension shutdown and reload. Late replies from a cancelled or superseded job must not replace current results.

## Migration sequence

1. Inventory rules, serialization fields, privileged observations, prompts, usage calls, side effects and script-loader dependencies; freeze representative fixtures and current behavior.
2. Specify and audit the reusable entity plus versioned snapshot/observation contract, including malformed and partially readable native filters.
3. Extract side-effect-free native serialization/acquisition from the backup workflow behind explicit FiltersAPI methods. Preserve existing backup compatibility through an adapter.
4. Implement scripts/filter-analysis/ with portable rules and collation; compare old and new results on fixed snapshots before switching callers.
5. Move background coordination and page presentation incrementally, preserving safeguards and shared review behavior.
6. Remove obsolete injected dependencies and loader calls where their replacements have been verified; test shutdown and extension reload.

## Acceptance criteria

- Production changes are a separate implementation task; this tracking work changes documentation only.
- Representative current and legacy backup fixtures remain readable and restore semantics remain unchanged.
- Live acquisition is read-only and does not invoke backup UI or usage paths. A broken filter does not hide readable filters or become an empty valid filter.
- Plain-data boundary tests reject privileged objects and preserve zero values, term/action order, grouping, matchAll, custom IDs and template placeholders.
- Portable rules run against fixtures without Thunderbird, XPCOM or browser globals; offline results clearly distinguish unknown runtime facts.
- Behavior comparisons cover all existing troubleshooter categories, Betterbird capabilities, partial inspection and account failures.
- Native integration checks cover stale edits, filters replaced or edited after acquisition, rollback, cancellation, concurrent tabs, usage accounting, restart and add-on reload.
- Performance checks measure large accounts and bound native acquisition work and transferred data; final budgets are agreed before rollout.

## Open decisions

- Which backup fields are essential to each rule, and should acquisition offer projections or a single initial full snapshot?
- Should observations be eager for requested checks or fetched in explicit batches after portable analysis identifies candidates?
- Should backup warnings become the same finding model, with a compatibility adapter for existing saved warnings?
- Which native prompts must remain native, and how is explicit consent tied to the action and current filter state?
- Which privileged module-loading mechanism preserves correct add-on reload isolation on all supported Thunderbird versions?

## Diagrams

architecture.mmd is the editable Mermaid source. Mermaid fences can render in supported Markdown viewers, including GitHub. Firefox does not render Mermaid source by itself: open architecture.svg for a standalone, script-free overview. The SVG is a companion overview, not an automatically generated rendering of the Mermaid source; update both when the architecture changes.

## Follow-up: frontend placement and current state ownership (2026-11-13)

Frontend controllers, presentation modules and styles may live under html/. The proposed scripts/filter-analysis/ package is a reusable, DOM-independent component; it does not own frontend placement. An extension-page module can import its exports by relative path, such as ../scripts/filter-analysis/index.mjs. This is a proposed entry point, not an existing module. Importing the same module in a page and the background does not share mutable state between those execution contexts. If background owns a job, pages request results through explicit runtime messages rather than expecting an imported singleton to be shared.

Current state is distributed, not held in a central background analysis store:

- scripts/troubleshooter/page.mjs owns the page's accounts array, session ID and review object. It obtains account IDs through browser.accounts.list(false), enriches them with FiltersAPI.getBackupInfo(), and calls FiltersAPI.scanFilters() directly.
- scripts/troubleshooter/state.mjs owns findings in a Map and completed checks in a Set, including resolved/deleted presentation history. These are page-local memory.
- chrome/content/api/filtersAPI/troubleshooter.js owns a private sessions Map, exact native filter references, tokens and trial state. Each scan builds and returns a findings array; this native session map is not the rendered findings store.
- scripts/backup/backup-page.mjs owns accounts, selected accounts, saved-account summaries and warning view state inside initBackupPage(). The export response contains serialized accounts and warnings; UI callbacks can retain that response while the page is open.
- scripts/backup/restore-page.mjs owns the loaded backup, target accounts, mappings, selection, statuses, results and warning view inside initRestorePage(). Native restore.js retains a private importedFilters Map for review/edit tokens.
- Native account/filter data remains in Thunderbird. Backup JSON persists exported entities and warnings; storage helpers persist selections/recent-file preferences. The in-memory review models above are not a persistent shared error database.

A background-owned job/result store is therefore a proposed architectural change, not a description of existing behavior. Keep view state (search, selected rows, expanded details) page-local. Decide whether snapshots/findings need background ownership based on cross-page reuse and lifecycle needs; a pure analyzer may also run directly in a page for offline backups without adding background indirection.

## Agreed decision: stateless analysis and explicit data contracts (2026-11-13)

The filter-analysis package must be stateless. Consumers own snapshots, findings, job state and presentation state, and pass all required inputs explicitly. Analysis modules must not retain mutable module-level state, cache snapshots or findings internally, or read ambient application state. Immutable rule definitions and constants are allowed. Any later cache must be consumer-owned and explicitly supplied, not hidden inside the analyzer.

Define a documented, versioned structured-data standard before implementing the package. It must cover:

- Input: serialized filter entities, account context, native observations, capabilities and analysis options.
- Output: findings, acquisition/inspection diagnostics, completeness and rule coverage, with explicit references to the input snapshot and entries.
- Ownership: the analyzer must not mutate its inputs; it returns new result data. Consumers decide whether to retain, merge, replace or discard results.
- Portability: plain JSON-compatible values only; no functions, native objects, DOM nodes, Maps, Sets or Error instances in the interchange contract. Optional and unknown values must have documented semantics; avoid undefined as a transported value.
- Compatibility: schema versions, required/optional fields, enum/code definitions, reference validity, ordering and handling of unsupported versions must be specified and validated at boundaries.
- Separation: transient native tokens and observations belong in the live snapshot envelope; reusable filter entities remain compatible with backup adapters. Presentation text, DOM state and localized messages remain outside the analysis contract.

Illustrative calling shape (names remain provisional):

```js
const result = analyzeSnapshot({ snapshot, requestedChecks, policy });
```

For identical explicit inputs and analyzer version, the analyzer must produce equivalent results in deterministic order. Time-sensitive rules receive the reference time explicitly; generated timestamps and random identifiers must not introduce hidden inputs. A result must identify its snapshot and analysis version so consumers can reject obsolete replies. Pure rule execution must be testable with frozen inputs and without browser or Thunderbird globals.

Next design deliverable: a field-level contract with representative live, offline, partially readable and failed-acquisition examples, followed by JSON Schemas and compatibility fixtures. The illustrative envelope and function names in this discussion are not yet a finalized schema.

## Future compatibility: scheduled backups, profile syncing and VFS

The refactoring must support later scheduled backups and profile syncing. Legacy file access is to be removed eventually and replaced by the VFS API. This is an architectural requirement, not authorization to implement scheduling, syncing or VFS integration in the first refactoring step. The exact VFS contract and capabilities must be confirmed before integration; this document does not assume particular API methods.

### Separation of responsibilities

- Native filter acquisition and serialization must be callable without opening a backup page, invoking a picker or relying on presentation helpers in a mail window. Identify and remove incidental window dependencies; report genuine native availability constraints explicitly.
- Portable backup construction and analysis must accept explicit data and options. Neither owns paths, file handles, scheduling, credentials or transport state.
- A consumer-owned background workflow coordinates acquisition, analysis, backup construction and storage. Interactive and scheduled callers use the same underlying operations, with explicit interaction policy. Scheduled execution must never silently open prompts or bypass required consent and licensing checks.
- Storage operations belong behind an explicit adapter boundary. Inspect and evolve the existing scripts/backup/backup-storage.mjs and storage adapters rather than introducing a competing abstraction. A temporary legacy adapter can preserve current behavior while a VFS adapter replaces its implementation later.
- Keep portable backup content separate from destination references and runtime handles. Do not bake native filesystem paths or legacy picker behavior into the new snapshot/analysis contract.

### Scheduled backup requirements

Background callers must be able to supply a configured destination and naming/retention policy without DOM access. Scheduling, job persistence, retry policy and retention are orchestration concerns, not analyzer responsibilities. Define behavior for unavailable accounts/storage, cancelled jobs, partial acquisition and interrupted writes. A partial or incomplete acquisition must never be presented as a complete successful backup.

Future scheduling must explicitly define whether it runs only while Thunderbird is active, how missed jobs are handled, and which capabilities the selected VFS backend provides. Do not infer unattended execution guarantees from moving code into the background.

### Profile syncing requirements

Reuse the portable filter representation, but keep synchronization policy out of the serializer and analyzer. Profile-local account IDs, folder URIs, native tokens and list indices are not cross-profile identities. A sync layer must explicitly map accounts/folders and define stable identity, change detection, ordering, conflict handling, deletion semantics and version compatibility before applying changes.

Sync application must use the same validated native edit boundary and stale-state safeguards as interactive changes. It must not interpret absent or unreadable data as a deletion, silently overwrite conflicting edits, or normalize filter logic. Per-job state, baselines and sync bookkeeping remain consumer-owned. Credentials and backend-specific configuration do not belong in filter entities or analysis results.

### Migration acceptance criteria

- Acquisition, portable backup construction and analysis can be exercised without a backup page or interactive file picker.
- Storage contracts are independent of native file objects and permit a VFS implementation without changing analyzer inputs or filter entity semantics.
- Existing backup files remain compatible; backend-specific metadata does not leak into portable filter entities.
- Jobs distinguish acquisition failure, analysis findings, serialization failure and storage failure, and preserve actionable structured diagnostics.
- Concurrent manual, scheduled and sync jobs have an explicit coordination policy; cancellation, retries and shutdown cannot silently duplicate writes or apply stale edits.
- Before VFS integration, document its available read/write/list/delete and commit capabilities as applicable, then define safe replacement, recovery and retention behavior based on those actual capabilities.

The first implementation must preserve these boundaries and include representative headless-workflow fixtures; full scheduling, syncing, identity policy and VFS migration remain separate follow-up work.
