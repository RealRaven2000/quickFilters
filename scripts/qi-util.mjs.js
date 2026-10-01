export async function waitForSessionReady() {
  const storageStatus = await browser.runtime.sendMessage({ command: "getStorageReadiness" });
  if (!storageStatus?.ok) {
    throw new Error("quickFilters settings storage failed to initialize. Restart Thunderbird and check Error Console (enable [Browser] and [Content] on Thunderbird 154+).");
  }
	const task = Promise.withResolvers();
	const readyListener = (changes, area) => {
		if (area !== "session") {
			return;
		}
		if (typeof changes["quickfilters.sessionReady"] !== "undefined") {
			task.resolve();
			browser.storage.onChanged.removeListener(readyListener);
		}
	};
	browser.storage.onChanged.addListener(readyListener);
	const readyStatus = await browser.storage.session
		.get("quickfilters.sessionReady")
		.then((result) => result["quickfilters.sessionReady"] || false);
	if (!readyStatus) {
		await task.promise;
	} else {
		browser.storage.onChanged.removeListener(readyListener);
	}
}

export function slideAlert(title, text, icon) {
	messenger.notifications.create({
		type: "basic",
		title,
		message: text,
		iconUrl: icon || "/chrome/content/skin/QuickFilters_32.svg",
	});
}

export function log(msg, data, mode = "log") { // log, info, warn, error
	console[mode](msg, data);
}

export async function logHighlight(txt, color="white", background="rgb(80,0,0)", ...args) {
	console.log(`quickFilters %c${txt}`, `color: ${color}; background: ${background}`, ...args);
}
