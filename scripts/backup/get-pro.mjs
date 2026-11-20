// Show the registration action without consuming a premium trial use.
export async function initGetProButton(feature) {
  const button = document.querySelector(".backup-get-pro");
  const trial = document.querySelector(".trial-remaining");
  const license = await browser.runtime.sendMessage({ command: "getLicenseInfo" });
  if (!license || license.status === "Valid") {
    return;
  }
  button.hidden = false;
  async function refreshTrial() {
    try {
      const usage = await browser.runtime.sendMessage({ command: "getProFeatureUsage", feature });
      const key = feature === "saveFilters" ? (usage.activeSession ? "backup.trial.backupActiveSession" : "backup.trial.backupSessionsRemaining") : (usage.activeSession ? "backup.trial.activeSession" : "backup.trial.sessionsRemaining");
      const message = browser.i18n.getMessage(key).replace("{1}", String(usage.remaining));
      const parts = message.split("**");
      trial.replaceChildren();
      parts.forEach((part, index) => {
        if (index % 2 === 1 && index < parts.length - 1) {
          const emphasis = document.createElement("strong");
          emphasis.textContent = part;
          trial.append(emphasis);
        } else {
          trial.append(document.createTextNode(part));
        }
      });
      trial.hidden = false;
    } catch (error) {
      trial.textContent = browser.i18n.getMessage("backup.trial.unavailable");
      trial.hidden = false;
      console.error("Loading trial allowance failed", error);
    }
  }
  document.addEventListener("premium-usage-updated", refreshTrial);
  await refreshTrial();
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await browser.runtime.sendMessage({ command: "openRegistrationTab", feature });
    } catch (error) {
      console.error("Opening registration failed", error);
    } finally {
      button.disabled = false;
    }
  });
}
