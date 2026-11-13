# First implementation: troubleshooter analysis boundary

Tracking: #403. Implemented 2026-11-13, after authorization to start from the discussion requirements.

## Behavior and ownership

The existing troubleshooter page now calls the explicit `FiltersAPI.getFilterSnapshot(session, accountId, checks)` method and passes the response to `analyzeSnapshot()` from `scripts/filter-analysis/index.mjs`. Native acquisition performs no finding collation. The portable component evaluates all four existing checks and returns the existing finding model, plus snapshot provenance and structured inspection diagnostics. The page still owns review state and uses the existing rendering, controls and remedies.

The contract is documented in [contract.md](../../../scripts/filter-analysis/contract.md). Inputs are validated, analysis is stateless, and immutable-input tests exercise deterministic results and independent consumers. The inspection projection uses backup entity field names while deliberately omitting values unnecessary for the current checks. It is not a restorable backup entity.

Native acquisition retains exact-filter tokens and existing atomic trial behavior. Folder lookup calls MailUtils.getExistingFolder directly, matching the previous utility wrapper, so read-only acquisition no longer needs a mail window. Editing, prompts, rollback and editor guard checks remain native. The troubleshooter loader now installs a factory with explicit dependencies and returned exports rather than injecting undeclared helpers into its execution scope. No new window globals or notification listeners were added.

The private script loader remains for this factory until a supported reload-safe native module replacement is verified. Backup/restore loading and serialization are unchanged. Scheduling, sync, VFS integration, full backup entity reuse, offline observations and a machine-readable JSON Schema remain later steps. The current contract explicitly accepts live snapshots only; it must not treat offline runtime facts as known.

## Verification

```text
node --test "docs/issues/403 - filter-analysis-architecture/test-analysis.mjs" "docs/issues/401 - troubleshooter/test-troubleshooter.mjs"
```

28 tests passed. Coverage includes all four checks, Betterbird behavior, manual-only filters, zero operators and matchAll across a JSON boundary, native acquisition without a window, category-scoped inspection failures, immutable inputs, rejected malformed contracts, isolated factory sessions, wiring for file/XPI roots, stale tokens, confirmations, rollback and trial accounting.

Fixed the troubleshooter test and preview paths after their move under docs/issues/. The preview API now supplies inspection snapshots instead of precomputed findings. No frontend markup, CSS or user workflow was changed.

Broader backup/restore, shared renderer and premium-usage regression tests: 56 passed, one failed. These older tests also have outdated relative paths; they were run from temporary copies one directory higher, then the copies were removed. The failure is in the unchanged test-restore-ui.mjs at its edit-button lookup (line 109): the expected button is undefined. Neither that test nor its restore controller was changed by this implementation. The newer experimental-API wiring test above covers the actual factory and schema; the old test-filters-api.mjs has outdated loader mocks and was not included in this broader run.

Syntax checks and whitespace checks passed for the implementation changes. Release-note tag validation is included in the focused suite. Existing edits to build.bat, manifest.json and revision.txt were left untouched. No XPI was built and no testing revision was advanced.

## Native smoke checks still required

- Open the troubleshooter from both existing entry points in Thunderbird.
- Run each check and all checks, switch accounts, search/filter results and view conditions.
- Cancel and confirm existing remedies; verify row reconciliation and native editor behavior.
- Verify unlicensed trial behavior across tabs, then reload the extension and confirm stale sessions are rejected.
- Check the updated browser preview; automated native UI or visual validation was not performed.

## Next implementation steps

1. Finish the full serializer fidelity audit and shared entity/observation schema before adapting backup/restore verification.
2. Add offline/unknown observation semantics and adapters without passing inspection projections to restore.
3. Extract remaining portable backup/restore validation and error collation; retain the current UI workflows.
4. Replace additional injected helper scopes and reduce private script loading after module lifecycle verification.
5. Keep acquisition, orchestration and storage independent for scheduled jobs, profile mapping and VFS migration.
