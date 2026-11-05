/* global quickFiltersPremium */
// Loaded as a background module dependency or into a private experiment scope.
(function (premium) {
  // Trial policy belongs in code; profile preferences contain uses, not limits.
  const USAGE_POLICY = Object.freeze({
    advancedSearchType: Object.freeze({ maximum: 15 }),
    duplicatesFinder: Object.freeze({ maximum: 10 }),
    searchFolder: Object.freeze({ maximum: 15 }),
    sortSearchTerms: Object.freeze({ maximum: 25 }),
    sortFilters: Object.freeze({ maximum: 20 }),
    customTemplate: Object.freeze({ maximum: 20 }),
    saveFilters: Object.freeze({ maximum: 10 }),
    loadFilters: Object.freeze({ maximum: 3, isSessionCount: true }),
    troubleshooter: Object.freeze({ maximum: 8 }),
  });

  const USAGE_LIMITS = Object.freeze(Object.fromEntries(
    Object.entries(USAGE_POLICY).map(([feature, policy]) => [feature, policy.maximum])
  ));

  Object.assign(premium, { USAGE_POLICY, USAGE_LIMITS });
})(typeof quickFiltersPremium === "undefined"
  ? (globalThis.quickFiltersPremium = {})
  : quickFiltersPremium);
