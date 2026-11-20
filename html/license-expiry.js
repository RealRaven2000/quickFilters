// Shared by extension pages that display the expiry warning.
globalThis.quickFilters = globalThis.quickFilters || {};
globalThis.quickFilters.isLicenseExpiringSoon = function (info) {
  return info?.status === "Valid" && Number.isFinite(info.licensedDaysLeft) && info.licensedDaysLeft < 11;
};
