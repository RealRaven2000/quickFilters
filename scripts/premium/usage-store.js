/* global quickFiltersPremium */
// Keep declarations inside this scope, including when loaded by the experiment.
(function (premium) {
  const { USAGE_LIMITS } = premium;

  const PREFIX = "extensions.quickFilters.usage.";
  const LICENSED = `${PREFIX}wasLicensed`;

  // No module-level state: each API scope gets a store over the same profile prefs.
  // Attempt counters are synchronous; session storage operations use a shared queue.
  function createUsageStore(prefs, limits = USAGE_LIMITS, options = {}) {
    const policy = options.policy || premium.USAGE_POLICY;
    const queue = options.queue || { pending: Promise.resolve() };
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

    function consumeAttempt(feature) {
      const limit = maximum(feature);
      let count = used(feature);
      const allowed = count < limit;
      if (allowed) {
        count++;
        prefs.setIntPref(PREFIX + feature, count);
      }
      return { allowed, used: count, remaining: Math.max(0, limit - count), maximum: limit };
    }

    async function consumeSession(feature) {
      if (!options.storage || !options.sessionId) {
        throw new Error("Session trial storage is unavailable");
      }
      const date = (options.now || (() => new Date()))();
      const today = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");
      const stored = await options.storage.get({ featureSession: {} });
      const sessions =
        stored.featureSession &&
        typeof stored.featureSession === "object" &&
        !Array.isArray(stored.featureSession)
          ? stored.featureSession
          : {};
      const previous = sessions[feature];
      const count = used(feature);
      const limit = maximum(feature);
      // Resetting the usage counter also invalidates the previous allowance.
      const active =
        count > 0 &&
        previous?.used === count &&
        (previous.sessionId === options.sessionId || previous.lastUsedDate === today);
      const result = active
        ? { allowed: true, used: count, remaining: Math.max(0, limit - count), maximum: limit }
        : consumeAttempt(feature);
      if (result.allowed) {
        try {
          await options.storage.set({
            featureSession: {
              ...sessions,
              [feature]: { sessionId: options.sessionId, lastUsedDate: today, used: result.used },
            },
          });
        } catch (error) {
          // No operation has been authorized yet; restore the count if persistence fails.
          if (!active) {
            prefs.setIntPref(PREFIX + feature, count);
          }
          throw error;
        }
      }
      return { ...result, isSessionCount: true };
    }

    return {
      initialize() {
        for (const feature of Object.keys(limits)) {
          used(feature);
        }
      },
      consume(feature) {
        maximum(feature);
        if (!policy[feature]?.isSessionCount) {
          return consumeAttempt(feature);
        }
        // Share the queue across Utilities API scopes to serialize storage read/write.
        const pending = queue.pending.then(() => consumeSession(feature));
        queue.pending = pending.catch(() => {});
        return pending;
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
})(
  typeof quickFiltersPremium === "undefined"
    ? (globalThis.quickFiltersPremium = {})
    : quickFiltersPremium
);
