/* global quickFiltersPremium */
// Loaded as a background module dependency or into a private experiment scope.
(function (premium) {
  // Trial policy belongs in code; profile preferences contain uses, not limits.
  const USAGE_LIMITS = Object.freeze({
    advancedSearchType: 15,
    duplicatesFinder: 10,
    searchFolder: 15,
    sortSearchTerms: 25,
    sortFilters: 20,
    customTemplate: 20,
    saveFilters: 10,
    loadFilters: 3,
    troubleshooter: 8,
  });

  Object.assign(premium, { USAGE_LIMITS });
})(typeof quickFiltersPremium === "undefined"
  ? (globalThis.quickFiltersPremium = {})
  : quickFiltersPremium);
