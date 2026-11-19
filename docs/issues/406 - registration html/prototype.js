"use strict";

// Standalone fixture only: no add-on APIs, real licenses, or checkout effects.
(() => {
  // Replace only marked text labels, retaining translated arrow positions.
  function replaceLabelGlyphs(root = document) {
    const labels = root.matches?.(".has-glyphs") ? [root] : root.querySelectorAll(".has-glyphs");
    function replaceText(parent) {
      for (const node of [...parent.childNodes]) {
        if (node.nodeType === 3 && node.nodeValue.includes("🡇")) {
          const parts = node.nodeValue.split("🡇");
          const fragment = document.createDocumentFragment();
          parts.forEach((part, index) => {
            if (index) {
              const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
              arrow.setAttribute("class", "label-arrow");
              arrow.setAttribute("viewBox", "0 0 24 24");
              arrow.setAttribute("fill", "currentColor");
              arrow.setAttribute("aria-hidden", "true");
              arrow.setAttribute("focusable", "false");
              const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
              path.setAttribute("d", "M7 2h10v10h6L12 23 1 12h6Z");
              arrow.appendChild(path);
              fragment.appendChild(arrow);
            }
            fragment.appendChild(document.createTextNode(part));
          });
          node.replaceWith(fragment);
        } else if (node.nodeType === 1 && node.namespaceURI !== "http://www.w3.org/2000/svg") {
          replaceText(node);
        }
      }
    }
    for (const label of labels) {
      replaceText(label);
    }
  }

  replaceLabelGlyphs();
  const selection = document.getElementById("selection-panel");
  const terms = document.getElementById("terms-panel");
  const toggle = document.getElementById("toggle-terms");
  const workspace = document.querySelector(".workspace");
  const feedback = document.getElementById("feedback");
  const emailHelpButton = document.getElementById("email-help-button");
  const emailHelp = document.getElementById("email-help");

  function closeEmailHelp(restoreFocus = false) {
    emailHelp.hidden = true;
    emailHelpButton.setAttribute("aria-expanded", "false");
    if (restoreFocus) {
      emailHelpButton.focus();
    }
  }

  emailHelpButton.addEventListener("click", () => {
    const opening = emailHelp.hidden;
    emailHelp.hidden = !opening;
    emailHelpButton.setAttribute("aria-expanded", String(opening));
  });
  document.getElementById("email-help-close").addEventListener("click", () => {
    closeEmailHelp(true);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !emailHelp.hidden) {
      event.preventDefault();
      closeEmailHelp(true);
    }
  });
  document.addEventListener("click", (event) => {
    if (!emailHelp.hidden && !event.target.closest(".email-field")) {
      closeEmailHelp();
    }
  });

  function showTerms(showingTerms) {
    closeEmailHelp();
    terms.hidden = !showingTerms;
    selection.hidden = showingTerms;
    document.querySelector(".license-summary").hidden = showingTerms;
    document.getElementById("terms-breadcrumb").hidden = !showingTerms;
    toggle.setAttribute("aria-expanded", String(showingTerms));
    toggle.dataset.l10nId = showingTerms ? "licenseTerms.hide" : "licenseTerms.show";
    workspace.classList.toggle("terms-open", showingTerms);
    document.getElementById("step-label").textContent = showingTerms ? "LICENSE TERMS" : "LICENSE SELECTION";
    document.getElementById("view-title").textContent = showingTerms ? "How your license works." : "A year of easier email.";
    toggle.replaceChildren(document.createTextNode(showingTerms ? "🡇 Continue to License Selection 🡇" : "Show license terms 🡇"));
    replaceLabelGlyphs(toggle);
    feedback.hidden = true;
    document.getElementById("personal-license-details").classList.remove("license-detail-highlight");
  }

  toggle.addEventListener("click", () => {
    showTerms(terms.hidden);
    const heading = document.getElementById("license-section-heading");
    heading.focus({ preventScroll: true });
    window.scrollTo({ top: Math.max(0, window.scrollY + workspace.getBoundingClientRect().top - 24), behavior: "auto" });
  });

  document.getElementById("terms-back").addEventListener("click", () => toggle.click());

  document.getElementById("email-learn-more").addEventListener("click", (event) => {
    event.preventDefault();
    showTerms(true);
    const details = document.getElementById("personal-license-details");
    details.classList.add("license-detail-highlight");
    details.focus({ preventScroll: true });
    details.scrollIntoView({ behavior: "auto", block: "center" });
  });

  document.getElementById("identity").addEventListener("change", (event) => {
    document.getElementById("email").value = event.target.value === "work" ? "alex@studio.example" : "alex@example.com";
    document.getElementById("first-name").value = "Alex";
    document.getElementById("last-name").value = "Morgan";
  });

  document.getElementById("renewal-learn-more").addEventListener("click", (event) => {
    event.preventDefault();
    const details = document.getElementById("renewal-details");
    const opening = details.hidden;
    details.hidden = !opening;
    event.currentTarget.setAttribute("aria-expanded", String(opening));
    event.currentTarget.textContent = opening ? "Show less" : "Learn more…";
  });

  document.querySelectorAll(".purchase").forEach((button) => {
    button.addEventListener("click", () => {
      const preview = document.createElement("p");
      preview.className = "checkout-preview-note";
      preview.textContent = "Prototype preview only. No shop was opened.";
      const confirmation = document.createElement("p");
      confirmation.textContent = "In the finished interface, the selected shop product would open in your browser.";
      const guidance = document.createElement("p");
      const emphasis = document.createElement("strong");
      emphasis.textContent = "To keep your renewal or upgrade benefits, continue with the product opened from this page.";
      const differentLicense = document.createElement("i");
      differentLicense.textContent = "different license";
      guidance.append(emphasis, " For choosing a ", differentLicense, ", simply start from here again.");
      document.getElementById("checkout-notice-content").replaceChildren(preview, confirmation, guidance);
      const notice = document.getElementById("checkout-notice");
      notice.hidden = false;
      notice.scrollIntoView({ behavior: "auto", block: "nearest" });
      feedback.hidden = true;
    });
  });

  document.getElementById("checkout-notice-close").addEventListener("click", () => {
    document.getElementById("checkout-notice").hidden = true;
  });

  document.getElementById("enter-key").addEventListener("click", () => {
    feedback.textContent = "License entry is a placeholder in this prototype. The live page will open the license settings.";
    feedback.hidden = false;
    feedback.scrollIntoView({ behavior: "auto", block: "nearest" });
  });
})();
