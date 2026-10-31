/* global quickFiltersPremium */
// Loaded as a background module dependency or into a private experiment scope.
(function (premium) {
  // Trial policy belongs in code; profile preferences contain uses, not limits.
  // Historical allowances for converting countdowns. Keep these fixed when
  // changing today's limits, so a new allowance does not invent past usage.
  const LEGACY_COUNTDOWN_LIMITS = Object.freeze({
    advancedSearchType: 15,
    duplicatesFinder: 10,
    searchFolder: 15,
    sortSearchTerms: 25,
    sortFilters: 20,
    customTemplate: 20,
    saveFilters: 10,
    loadFilters: 3,
    localFolderFilters: 5,
  });

  const USAGE_LIMITS = Object.freeze({ ...LEGACY_COUNTDOWN_LIMITS });

  Object.assign(premium, { USAGE_LIMITS, LEGACY_COUNTDOWN_LIMITS });
})(typeof quickFiltersPremium === "undefined"
  ? (globalThis.quickFiltersPremium = {})
  : quickFiltersPremium);
