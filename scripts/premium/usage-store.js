/* global quickFiltersPremium */
// Keep declarations inside this scope, including when loaded by the experiment.
(function (premium) {
  const { USAGE_LIMITS, LEGACY_COUNTDOWN_LIMITS } = premium;

  const PREFIX = "extensions.quickFilters.usage.";
  const LICENSED = `${PREFIX}wasLicensed`;

  // No module-level state: each API scope gets a store over the same profile prefs.
  // All read/check/write operations below are synchronous, with no intervening await.
  function createUsageStore(prefs, limits = USAGE_LIMITS) {
    function maximum(feature) {
      if (!Object.hasOwn(limits, feature)) {
        throw new Error(`Unknown premium feature: ${feature}`);
      }
      return limits[feature];
    }

    function used(feature, legacyCounts = {}) {
      const limit = maximum(feature);
      const name = PREFIX + feature;
      if (!prefs.prefHasUserValue(name)) {
        let remaining;
        const countdown = `${name}.countDown`;
        const legacyPref = `extensions.quickfilters.restrictions.${feature}.countDown`;
        if (prefs.prefHasUserValue(countdown)) {
          remaining = prefs.getIntPref(countdown);
        } else if (Number.isInteger(legacyCounts[feature])) {
          remaining = legacyCounts[feature];
        } else if (prefs.prefHasUserValue(legacyPref)) {
          remaining = prefs.getIntPref(legacyPref);
        }
        const oldLimit = LEGACY_COUNTDOWN_LIMITS[feature] ?? limit;
        const count = Number.isInteger(remaining) ? Math.max(0, Math.min(oldLimit, oldLimit - remaining)) : 0;
        prefs.setIntPref(name, count);
        // Keep the old values for now; the count-up preference always takes priority.
      }
      const count = prefs.getIntPref(name);
      if (count < 0) {
        throw new Error(`Invalid premium usage count: ${feature}`);
      }
      return count;
    }

    return {
      initialize(legacyCounts = {}) {
        for (const feature of Object.keys(limits)) {
          used(feature, legacyCounts);
        }
      },
      consume(feature) {
        const limit = maximum(feature);
        let count = used(feature);
        const allowed = count < limit;
        if (allowed) {
          count++;
          prefs.setIntPref(PREFIX + feature, count);
        }
        return { allowed, used: count, remaining: Math.max(0, limit - count), maximum: limit };
      },
      updateLicenseState(valid) {
        const wasLicensed = prefs.getBoolPref(LICENSED, false);
        if (valid && !wasLicensed) {
          for (const feature of Object.keys(limits)) {
            prefs.setIntPref(PREFIX + feature, 0);
          }
        }
        if (valid !== wasLicensed) {
          prefs.setBoolPref(LICENSED, valid);
        }
        return valid && !wasLicensed;
      },
    };
  }

  premium.createUsageStore = createUsageStore;
})(typeof quickFiltersPremium === "undefined"
  ? (globalThis.quickFiltersPremium = {})
  : quickFiltersPremium);
