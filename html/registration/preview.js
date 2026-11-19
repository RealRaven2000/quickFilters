"use strict";

(() => {
  const byId = (id) => document.getElementById(id);
  const selector = byId("preview-scenario");
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
    const parts = (identity.name || "").replace(/\([^)]*\)/g, "").trim().split(/\s+/);
    byId("email").value = identity.email || "";
    byId("first-name").value = parts[0] || "";
    byId("last-name").value = parts.length > 1 ? parts.at(-1) : "";
  }

  function render() {
    const live = selector.value === "live";
    const state = selector.value;
    const recognized = live ? loaded && ["Valid", "Expired"].includes(license.status) && [0, 1].includes(license.keyType) : state !== "buy";
    const domain = live ? recognized && license.keyType === 1 : state.endsWith("-domain");
    const valid = live ? recognized && license.status === "Valid" : state === "upgrade" || state.startsWith("extend-");
    const summary = document.querySelector(".license-summary");
    summary.classList.toggle("valid-license", !!valid);
    byId("current-license").textContent = recognized ? `${domain ? "Domain" : "Pro"} license` : "No license yet";
    summary.querySelector(".status").textContent = recognized ? valid ? "Valid" : "Expired" : "Free edition";
    let date = live ? license?.expiryDate : valid ? "2026-11-23" : "2026-11-11";
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      date = new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date(date + "T12:00:00"));
    }
    summary.querySelector("p").textContent = recognized ? `Your license ${valid ? "is valid until" : "expired on"} ${date || "an unknown date"}.` : "Choose a license below to get started.";
    byId("checkout-mode").textContent = live ? "Current license · live checkout" : "Sample data · checkout is disabled";
    plans.forEach((plan, index) => {
      const current = recognized && (domain ? index === 1 : index === 0);
      const primary = domain ? index === 1 : index === 0;
      plan.classList.toggle("featured", primary);
      const button = plan.querySelector(".purchase");
      button.classList.toggle("primary", primary);
      button.classList.toggle("secondary", !primary);
      button.disabled = live && !loaded;
      button.dataset.route = current ? routes[index].renew : routes[index].buy;
      button.dataset.renew = current ? "true" : "false";
      const label = current ? valid && !domain ? "Extend License" : "Renew License" : index ? "Buy Domain License" : "Buy Pro";
      button.firstChild.textContent = label + " ";
      button.dataset.plan = label;
    });
    document.querySelector(".plans").style.setProperty("--preview-columns", 2);
    byId("checkout-notice").hidden = true;
  }

  selector.addEventListener("change", render);
  byId("identity").addEventListener("change", selectIdentity);
  for (const button of document.querySelectorAll(".purchase")) {
    button.addEventListener("click", async () => {
      if (selector.value !== "live") {
        byId("checkout-notice-content").textContent = "Preview only. No shop was opened.";
        byId("checkout-notice").hidden = false;
        return;
      }
      if (!loaded || !byId("email").checkValidity() || !byId("email").value.trim()) {
        byId("email").reportValidity();
        return;
      }
      const url = new URL(button.dataset.route, "https://sites.fastspring.com/quickfolders/");
      url.searchParams.set("contact_fname", byId("first-name").value);
      url.searchParams.set("contact_lname", byId("last-name").value);
      url.searchParams.set("contact_email", byId("email").value.trim());
      if (["Valid", "Expired"].includes(license.status)) {
        if (!license.licenseKey) {
          byId("feedback").textContent = "The current license key is unavailable. Please try again.";
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
        byId("checkout-notice-content").textContent = "Checkout opened in your browser.";
        byId("checkout-notice").hidden = false;
      } catch (error) {
        console.error("Opening checkout failed", error);
        byId("feedback").textContent = "Could not open checkout. Please try again.";
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
  Promise.all([messenger.runtime.sendMessage({ command: "getLicenseInfo" }), messenger.accounts.list(false)])
    .then(async ([info, accounts]) => {
      if (!info || typeof info.status !== "string") {
        throw new Error("License information unavailable");
      }
      license = info;
      const defaults = await Promise.all(accounts.map((account) => messenger.identities.getDefault(account.id)));
      const select = byId("identity");
      select.replaceChildren();
      for (const [index, account] of accounts.entries()) {
        const identity = defaults[index];
        if (identity?.email) {
          identities.set(identity.id, identity);
          select.add(new Option(`${account.name} · ${identity.email}`, identity.id));
        }
      }
      const matching = [...identities.values()].find((identity) => identity.email.toLowerCase() === (license.email || "").toLowerCase());
      if (matching) {
        select.value = matching.id;
      }
      for (const id of ["email", "first-name", "last-name"]) {
        byId(id).value = "";
      }
      selectIdentity();
      loaded = true;
      render();
    }).catch((error) => {
      console.error("Loading registration data failed", error);
      byId("feedback").textContent = "Could not load your license and accounts. Please reopen registration.";
      byId("feedback").hidden = false;
    });
})();
