var i18n = {
	updateString(string) {
		let re = new RegExp(this.keyPrefix + "(.+?)__", "g");
		return string.replace(re, matched => {
			const key = matched.slice(this.keyPrefix.length, -2);
			let rv = this.extension 
						? this.extension.localeData.localizeMessage(key)
						: messenger.i18n.getMessage(key);
			return rv || matched;
		});
	},

	updateSubtree(node) {
		const texts = document.evaluate(
			'descendant::text()[contains(self::text(), "' + this.keyPrefix + '")]',
			node,
			null,
			XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
			null
		);
		for (let i = 0, maxi = texts.snapshotLength; i < maxi; i++) {
			const text = texts.snapshotItem(i);
			if (text.nodeValue.includes(this.keyPrefix)) text.nodeValue = this.updateString(text.nodeValue);
		}

		const attributes = document.evaluate(
			'descendant::*/attribute::*[contains(., "' + this.keyPrefix + '")]',
			node,
			null,
			XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
			null
		);
		for (let i = 0, maxi = attributes.snapshotLength; i < maxi; i++) {
			const attribute = attributes.snapshotItem(i);
			if (attribute.value.includes(this.keyPrefix)) attribute.value = this.updateString(attribute.value);
		}
	},

	updateDocument(options = {}) {		
		this.extension = options?.extension
			? options.extension
			: null;		
		this.keyPrefix = options?.keyPrefix
			? options.keyPrefix
			: "__MSG_";
		this.updateSubtree(document);
	}
};
