/* global quickFiltersPremium */
// Keep declarations inside this scope, including when loaded by the experiment.
(function (premium) {
  const { USAGE_LIMITS } = premium;

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

    function used(feature) {
      maximum(feature);
      // Missing user values use the default zero, including after Config Editor Reset.
      // Old countdown preferences are intentionally ignored.
      const count = prefs.getIntPref(PREFIX + feature, 0);
      if (count < 0) {
        prefs.setIntPref(PREFIX + feature, 0);
        return 0;
      }
      return count;
    }

    return {
      initialize() {
        for (const feature of Object.keys(limits)) {
          used(feature);
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
