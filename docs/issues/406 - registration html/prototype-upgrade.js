"use strict";
// Sample states only; no real licenses or shop requests.
(() => {
  const scenario = document.getElementById("preview-scenario");
  const plans = [...document.querySelectorAll(".plan")];
  function render() {
    const state = scenario.value;
    const buying = state === "buy";
    const domain = state.endsWith("-domain");
    const valid = state === "upgrade" || state.startsWith("extend-");
    const summary = document.querySelector(".license-summary");
    summary.classList.toggle("valid-license", valid);
    document.getElementById("current-license").textContent = buying ? "No license yet" : `${domain ? "Domain" : "Pro"} license`;
    summary.querySelector(".status").textContent = buying ? "Free edition" : valid ? "Valid" : "Expired";
    summary.querySelector("p").textContent = buying ? "Choose a license below to get started." : valid ? "Your license is valid until November 23, 2026." : "Your license expired on November 11, 2026.";
    plans.forEach((plan, index) => {
      const current = !buying && (domain ? index === 1 : index === 0);
      const primary = domain ? index === 1 : index === 0;
      plan.classList.toggle("featured", primary);
      const button = plan.querySelector(".purchase");
      button.classList.toggle("primary", primary);
      button.classList.toggle("secondary", !primary);
      let label = index ? "Buy Domain License" : "Buy Pro";
      if (current) label = valid ? "Extend License" : "Renew License";
      if (state === "upgrade" && index === 1) label = "Upgrade to Domain";
      button.firstChild.textContent = label + " ";
      button.dataset.plan = label;
    });
    document.querySelector(".plans").style.setProperty("--preview-columns", 2);
    document.getElementById("checkout-notice").hidden = true;
    document.getElementById("feedback").hidden = true;
  }
  scenario.addEventListener("change", render);
  render();
})();
