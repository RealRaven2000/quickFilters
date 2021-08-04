export function slideAlert(title, text, icon) {
	messenger.ex_notifications.create({
		type: "basic",
		title,
		message: text,
		iconUrl: icon || "/chrome/content/skin/QuickFilters_32.svg"
	});
}

export function log(msg, data, mode = "log") { // log, info, warn, error
	console[mode](msg, data);
}