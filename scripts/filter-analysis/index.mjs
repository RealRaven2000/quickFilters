// Pure analysis of the versioned inspection projection documented in contract.md.
// Consumers own snapshots and results. This module has no browser/native state.
export const SNAPSHOT_VERSION = 1;
export const ANALYSIS_VERSION = 1;
export const CHECKS = Object.freeze(["runs", "folders", "addons", "conditions"]);

export function validateSnapshot(snapshot) {
  if (snapshot?.schemaVersion !== SNAPSHOT_VERSION) throw new TypeError("Unsupported filter snapshot version");
  if (!Array.isArray(snapshot.checks) || !snapshot.checks.length || snapshot.checks.some(check => !CHECKS.includes(check))) {
    throw new TypeError("Invalid filter snapshot checks");
  }
  const require = (condition, field) => { if (!condition) throw new TypeError(`Invalid filter snapshot: ${field}`); };
  const ancestors = new Set();
  const plainData = value => {
    if (value === null || typeof value === "string" || typeof value === "boolean") return;
    if (typeof value === "number") { require(Number.isFinite(value), "finite number"); return; }
    require(typeof value === "object" && !ancestors.has(value), "JSON-compatible data");
    require(Array.isArray(value) || Object.prototype.toString.call(value) === "[object Object]", "plain object");
    ancestors.add(value);
    Object.values(value).forEach(plainData);
    ancestors.delete(value);
  };
  plainData(snapshot);
  require(typeof snapshot.snapshotId === "string" && snapshot.snapshotId.length > 0, "snapshotId");
  require(snapshot.source === "live", "source");
  require(typeof snapshot.accountId === "string" && typeof snapshot.accountType === "string", "account");
  require(Number.isInteger(snapshot.count) && snapshot.count >= 0, "count");
  require(Number.isInteger(snapshot.capabilities?.runnableTypes) && typeof snapshot.capabilities.supportsMixedConditions === "boolean", "capabilities");
  require(Array.isArray(snapshot.capabilities.folderActionTypes) && snapshot.capabilities.folderActionTypes.every(Number.isInteger) &&
    Number.isInteger(snapshot.capabilities.customActionType) && Number.isInteger(snapshot.capabilities.customTermAttribute), "native enum capabilities");
  require(Array.isArray(snapshot.entries), "entries");
  const tokens = new Set();
  for (const entry of snapshot.entries) {
    require(typeof entry.token === "string" && !tokens.has(entry.token), "entry token");
    tokens.add(entry.token);
    require(Number.isInteger(entry.position) && entry.position >= 0, "entry position");
    const { entity, observations, errors } = entry;
    require(typeof entity?.filterName === "string" && typeof entity.enabled === "boolean" && typeof entity.unparseable === "boolean", "entity");
    require(Array.isArray(entity.actionList) && Array.isArray(entity.searchTerms), "entity collections");
    require(typeof observations?.canEdit === "boolean" && Array.isArray(observations.actions) && Array.isArray(observations.terms), "observations");
    require(Array.isArray(errors) && errors.every(error => CHECKS.includes(error.category) && error.code === "inspection-failed" && typeof error.details === "string"), "inspection errors");
    const readable = check => snapshot.checks.includes(check) && !entity.unparseable && !errors.some(error => error.category === check);
    if (readable("runs")) require(Number.isInteger(entity.filterType), "filterType");
    if (readable("folders") || readable("addons")) {
      require(observations.actions.length === entity.actionList.length, "action observations");
      entity.actionList.forEach((action, position) => {
        require(Number.isInteger(action.type), "action type");
        const facts = observations.actions[position];
        require(facts && [undefined, "available", "missing"].includes(facts.folder) && [undefined, "available", "missing"].includes(facts.provider), "action facts");
        if (facts.folder) require(typeof action.targetFolderUri === "string", "folder URI");
        if (facts.provider) require(typeof action.customId === "string", "custom action ID");
        if (readable("folders") && snapshot.capabilities.folderActionTypes.includes(action.type)) require(!!facts.folder, "folder observation required");
        if (readable("addons") && action.type === snapshot.capabilities.customActionType) require(!!facts.provider, "action provider observation required");
      });
    }
    if (readable("conditions") || readable("addons")) {
      require(observations.terms.length === entity.searchTerms.length, "term observations");
      entity.searchTerms.forEach((term, position) => {
        require(typeof term.matchAll === "boolean" && typeof term.booleanAnd === "boolean" &&
          Number.isInteger(term.beginsGrouping) && Number.isInteger(term.endsGrouping), "term structure");
        require([undefined, "available", "missing"].includes(observations.terms[position]?.provider), "term facts");
        if (readable("addons") && term.attrib === snapshot.capabilities.customTermAttribute) {
          require(typeof term.customId === "string" && !!observations.terms[position]?.provider, "term provider observation required");
        }
      });
    }
  }
  return snapshot;
}

export function analyzeSnapshot(snapshot) {
  validateSnapshot(snapshot);
  const trial = structuredClone(snapshot.trial);
  if (snapshot.allowed === false) return { allowed: false, trial };
  const findings = [], diagnostics = [];
  const checks = [...new Set(snapshot.checks)];
  for (const entry of snapshot.entries) {
    const { entity, observations } = entry;
    diagnostics.push(...entry.errors.map(error => ({ ...error, token: entry.token, accountId: snapshot.accountId })));
    const add = (category, reason, extra = {}) => findings.push({
      id: `${entry.token}:${category}:${reason}:${extra.position ?? ""}`,
      token: entry.token, accountId: snapshot.accountId, filterName: entity.filterName,
      category, reason, enabled: entity.enabled, canEdit: observations.canEdit,
      state: "remaining", ...extra,
    });
    for (const category of checks) {
      if (entity.unparseable) { add(category, "unparseable", { canEdit: false }); continue; }
      const error = entry.errors.find(item => item.category === category);
      if (error) { add(category, "inspection-failed", { details: error.details, canEdit: false }); continue; }
      if (category === "runs") {
        if (entity.enabled && !(entity.filterType & snapshot.capabilities.runnableTypes) &&
            ["imap", "pop3", "nntp", "none"].includes(snapshot.accountType)) add(category, "no-run-method");
      } else if (category === "folders" || category === "addons") {
        for (const [position, action] of entity.actionList.entries()) {
          const facts = observations.actions[position];
          if (category === "folders" && facts.folder === "missing") add(category, "missing-folder", { position, targetFolderUri: action.targetFolderUri });
          if (category === "addons" && facts.provider === "missing") add(category, "missing-action", { position, customId: action.customId });
        }
        if (category === "addons") entity.searchTerms.forEach((term, position) => {
          if (observations.terms[position].provider === "missing") add(category, "missing-term", { position, customId: term.customId });
        });
      } else if (category === "conditions") {
        const terms = entity.searchTerms.filter(term => !term.matchAll);
        const mixed = terms.some(term => term.beginsGrouping || term.endsGrouping) ||
          terms.some((term, index) => index > 0 && term.booleanAnd !== terms[0].booleanAnd);
        if (!entity.searchTerms.length) add(category, "missing-conditions");
        else if (!snapshot.capabilities.supportsMixedConditions && mixed) add(category, "mixed-conditions", { state: entity.enabled ? "remaining" : "disabled" });
      }
    }
  }
  return { snapshotId: snapshot.snapshotId, analysisVersion: ANALYSIS_VERSION,
    accountId: snapshot.accountId, count: snapshot.count, checks, findings, diagnostics,
    complete: diagnostics.length === 0, trial };
}
