# Bug Report: Services.scriptloader.loadSubScript() blocks JAR URIs in TB 155.0a1

**Product:** Thunderbird  
**Component:** General  
**Version:** 155.0a1 (daily/nightly)  
**Platform:** All  
**Severity:** S2 (Major) - Breaks all WindowListener-based legacy add-ons

---

## Description

In Thunderbird 155.0a1, `Services.scriptloader.loadSubScript()` now throws "Trying to load untrusted URI" when loading JAR URIs, completely breaking WindowListener-based legacy add-ons. This contradicts the publicly announced 2027 timeline for legacy add-on deprecation.

**STR:**
1. Install any WindowListener-based add-on (quickFilters, FiltaQuilla, QuickFolders)
2. Launch TB 155.0a1 daily
3. Check Browser Console

**Actual:** Error thrown: `Trying to load untrusted URI.: jar:file:///[profile]/extensions/addon@domain.xpi!/chrome/content/scripts/file.js`

All chrome-privileged script injection fails. Add-ons completely non-functional.

**Expected:** Legacy add-ons should work through 2027 (announced timeline). This blocking should not be active in release train 155 (ships ~early 2026).

**Impact:**
- Affects all WindowListener-based add-ons
- No replacement APIs exist for nsIMsgFilterList, nsIMsgFilter, nsIMsgFilterService
- Pure WebExtension migration impossible without these APIs
- Breaks announced 2027 timeline by ~1 year

**Questions:**
1. Is this intentional for 155, or did it land prematurely from mozilla-central?
2. How will comm-central/ESR branches maintain support through 2027?
3. Can ESR patch this out while Release enforces it?

**Suggested Fix:**
If `loadSubScript()` is maintained through transition period, consider allowing JAR URIs when called from experimental API context, or add manifest permission like `"legacy_chrome_injection"` to provide audit trail while maintaining security for non-experimental add-ons.

**Code Location:**
WindowListener API `implementation.js` lines 722-726:
```javascript
Services.scriptloader.loadSubScript(
  this.registeredWindows[window.location.href],
  window[this.uniqueRandomID],
  "UTF-8"
);
```

**References:**
- WindowListener API: https://github.com/thundernest/addon-developer-support
- Announced 2027 timeline: [reference to official communication]
