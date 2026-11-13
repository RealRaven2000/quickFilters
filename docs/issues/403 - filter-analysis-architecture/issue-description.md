# Refactor filter analysis into a stateless MailExtension component

Filter backup, restore and troubleshooting currently combine privileged filter access with analysis, error collation and presentation logic. They also use `loadSubScriptWithOptions()` with implicitly injected dependencies, such as the localization helper `t`.

We should separate these responsibilities to reduce privileged code and prepare for a future standard Thunderbird filters API.

## Proposed architecture

- Keep native filter reading, editing and serialization in the experimental `FiltersAPI`; no standard filters API currently exists.
- Return serialized filter entities and structured native observations to the MailExtension layer.
- Add a stateless analysis package under `scripts/filter-analysis/`.
- Keep frontend controllers and presentation under `html/`.
- Use explicit ES module interfaces and reduce `loadSubScriptWithOptions()` where practical.

The analysis package must receive all inputs explicitly and return results without modifying its inputs or retaining mutable state. Consumers own snapshots, findings and workflow state.

## Shared data contract

Evaluate reusing the existing backup filter entities as the common representation, with a versioned envelope containing account context, capabilities, inspection failures and live observations.

Runtime facts—such as folder availability, custom action/term availability and native editability—must remain distinguishable from derived findings. Offline backups must represent unavailable runtime evidence as unknown.

## Requirements

- Define and validate versioned, JSON-compatible input and result structures.
- Audit serialization fidelity, including grouping, `matchAll`, zero-valued operators, custom IDs and template placeholders.
- Preserve partial results when individual filters or fields cannot be inspected.
- Keep localization, report formatting and DOM handling outside the analyzer.
- Preserve native identity validation, stale-token protection, confirmations, rollback and usage accounting.
- Preserve existing backup compatibility and troubleshooting behavior.
- Test portable analysis without Thunderbird or browser globals.

## Initial tasks

- [ ] Inventory existing responsibilities and injected dependencies.
- [ ] Define the structured data contract and representative examples.
- [ ] Audit the backup serializer for analysis reuse.
- [ ] Specify incremental migration and compatibility tests.
- [ ] Move portable rules and collation into the stateless package.
- [ ] Reduce obsolete privileged logic and script loading.

Discussion, requirements and diagrams are in `docs/issues/403 - filter-analysis-architecture/`.

Tracking issue: #403. Related: #401, #400.

## Future workflows

The architecture must also support scheduled backups and profile syncing. Keep filter acquisition, portable backup construction, analysis and storage separate so background jobs can reuse them without a page or file picker. Storage must have an explicit adapter boundary supporting eventual replacement of legacy file access with the VFS API.

Profile-local IDs, folder URIs and native tokens must not become cross-profile identities. Sync mapping, conflict handling and job state belong to a separate orchestration layer. Scheduling, syncing and VFS integration are follow-up features; the initial refactoring must preserve the boundaries they require.
