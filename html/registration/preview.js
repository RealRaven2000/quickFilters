"use strict";

(() => {
  const byId = (id) => document.getElementById(id);
  const t = (key, substitutions = []) => messenger.i18n.getMessage(key, substitutions);
  byId("referrer").value = new URLSearchParams(location.search).get("feature") || "";
  const plans = [...document.querySelectorAll(".plan")];
  const identities = new Map();
  let license = null;
  let loaded = false;
  const routes = [
    { buy: "instant/quickfilters", renew: "instant/quickfiltersrenew" },
    { buy: "product/quickfiltersdomainlicense", renew: "product/quickfiltersdomainrenew" },
  ];

  function selectIdentity() {
    const identity = identities.get(byId("identity").value);
    if (!identity) {
      return;
    }
    const parts = (identity.name || "")
      .replace(/\([^)]*\)/g, "")
      .trim()
      .split(/\s+/);
    byId("email").value = identity.email || "";
    byId("email-error").hidden = true;
    byId("email-hint").hidden = false;
    byId("email").removeAttribute("aria-invalid");
    byId("first-name").value = parts[0] || "";
    byId("last-name").value = parts.length > 1 ? parts.at(-1) : "";
  }

  function render() {
    const recognized = loaded && ["Valid", "Expired"].includes(license.status) && [0, 1].includes(license.keyType);
    const domain = recognized && license.keyType === 1;
    const valid = recognized && license.status === "Valid";
    const summary = document.querySelector(".license-summary");
    summary.classList.toggle("valid-license", !!valid);
    let licenseLabel = t("registration.license.none");
    let statusLabel = t("registration.status.Empty");
    if (recognized) {
      const edition = t(domain ? "registration.edition.domain" : "registration.edition.pro");
      licenseLabel = t("registration.license.edition", [edition]);
      statusLabel = t(valid ? "registration.status.Valid" : "registration.status.Expired");
    }
    byId("current-license").textContent = licenseLabel;
    summary.querySelector(".status").textContent = statusLabel;
    const warning = summary.querySelector(".expiry-warning");
    warning.hidden = !quickFilters.isLicenseExpiringSoon(license);
    warning.textContent = warning.hidden ? "" : t("quickfiltersToolbarButton.renew", [String(license.licensedDaysLeft)]);
    let date = license?.expiryDate;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      date = new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(
        new Date(date + "T12:00:00")
      );
    }
    let summaryText = t("registration.date.none");
    if (recognized) {
      summaryText = t(valid ? "registration.date.valid" : "registration.date.expired", [date || t("registration.date.unknown")]);
    }
    summary.querySelector("p").textContent = summaryText;
    byId("checkout-mode").textContent = t("registration.checkout.live");
    plans.forEach((plan, index) => {
      const current = recognized && (domain ? index === 1 : index === 0);
      const primary = domain ? index === 1 : index === 0;
      plan.classList.toggle("featured", primary);
      const button = plan.querySelector(".purchase");
      button.classList.toggle("primary", primary);
      button.classList.toggle("secondary", !primary);
      button.disabled = !loaded;
      button.dataset.route = current ? routes[index].renew : routes[index].buy;
      button.dataset.renew = current ? "true" : "false";
      let label;
      if (current) {
        label = t(valid && !domain ? "registration.action.extend" : "registration.action.renew");
      } else {
        label = index ? t("registration.action.buyDomain") : t("registration.action.buy", [t("registration.edition.pro")]);
      }
      button.firstChild.textContent = label + " ";
      button.dataset.plan = label;
    });
    document.querySelector(".plans").style.setProperty("--preview-columns", 2);
    byId("checkout-notice").hidden = true;
  }

  byId("identity").addEventListener("change", selectIdentity);
  byId("email").addEventListener("input", () => {
    byId("email-error").hidden = true;
    byId("email-hint").hidden = false;
    byId("email").removeAttribute("aria-invalid");
  });
  for (const button of document.querySelectorAll(".purchase")) {
    button.addEventListener("click", async () => {
      if (!loaded) {
        return;
      }
      const email = byId("email");
      if (!email.value.trim() || !email.checkValidity()) {
        const error = byId("email-error");
        error.textContent = t("registration.email.invalid");
        byId("email-hint").hidden = true;
        error.hidden = false;
        email.setAttribute("aria-invalid", "true");
        email.focus();
        return;
      }
      const url = new URL(button.dataset.route, "https://sites.fastspring.com/quickfolders/");
      url.searchParams.set("contact_fname", byId("first-name").value);
      url.searchParams.set("contact_lname", byId("last-name").value);
      url.searchParams.set("contact_email", byId("email").value.trim());
      if (["Valid", "Expired"].includes(license.status)) {
        if (!license.licenseKey) {
          byId("feedback").textContent = t("registration.license.keyUnavailable");
          byId("feedback").hidden = false;
          return;
        }
        url.searchParams.set("referrer", license.licenseKey);
      } else if (byId("referrer").value) {
        url.searchParams.set("referrer", byId("referrer").value);
      }
      button.disabled = true;
      try {
        await messenger.windows.openDefaultBrowser(url.href);
        byId("checkout-notice-content").textContent = t("registration.checkout.opened");
        byId("checkout-notice").hidden = false;
      } catch (error) {
        console.error("Opening checkout failed", error);
        byId("feedback").textContent = t("registration.checkout.error");
        byId("feedback").hidden = false;
      } finally {
        button.disabled = false;
      }
    });
  }

  byId("identity").replaceChildren();
  for (const id of ["email", "first-name", "last-name"]) {
    byId(id).value = "";
  }
  render();
  Promise.all([
    messenger.runtime.sendMessage({ command: "getLicenseInfo" }),
    messenger.accounts.list(false),
  ])
    .then(async ([info, accounts]) => {
      if (!info || typeof info.status !== "string") {
        throw new Error("License information unavailable");
      }
      license = info;
      const defaults = await Promise.all(
        accounts.map((account) => messenger.identities.getDefault(account.id))
      );
      const select = byId("identity");
      select.replaceChildren();
      for (const [index, account] of accounts.entries()) {
        const identity = defaults[index];
        if (identity?.email) {
          identities.set(identity.id, identity);
          select.add(new Option(`${account.name} · ${identity.email}`, identity.id));
        }
      }
      const matching = [...identities.values()].find(
        (identity) => identity.email.toLowerCase() === (license.email || "").toLowerCase()
      );
      if (matching) {
        select.value = matching.id;
      }
      for (const id of ["email", "first-name", "last-name"]) {
        byId(id).value = "";
      }
      selectIdentity();
      loaded = true;
      render();
    })
    .catch((error) => {
      console.error("Loading registration data failed", error);
      byId("feedback").textContent = t("registration.load.error");
      byId("feedback").hidden = false;
    });
})();
