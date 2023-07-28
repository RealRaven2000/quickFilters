export function slideAlert(title, text, icon) {
	messenger.notifications.create({
		type: "basic",
		title,
		message: text,
		iconUrl: icon || "/chrome/content/skin/QuickFilters_32.svg"
	});
}

export function log(msg, data, mode = "log") { // log, info, warn, error
	console[mode](msg, data);
}

export async function logDebugHighlight(txt, color="white", background="rgb(80,0,0)", ...args) {
	let isDebug = await messenger.LegacyPrefs.getPref("extensions.quickfilters.debug");
	if (!isDebug) { return; }
	console.log(`quickFilters %c${txt}`, `color: ${color}; background: ${background}`, ...args);
}