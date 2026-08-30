"use strict";

// Direct access to browser.storage.local from legacy chrome code.
quickFilters.Storage = new (class LocalStorage {
  constructor(extensionId) {
    var { ExtensionParent } = ChromeUtils.importESModule(
      "resource://gre/modules/ExtensionParent.sys.mjs"
    );
    const extension = ExtensionParent.GlobalManager.getExtension(extensionId);
    if (!extension) {
      throw new Error(`quickFilters extension context not found: ${extensionId}`);
    }
    this.uniqueRandomID = "AddOnNS" + extension.instanceId;

    // Standalone chrome dialogs are not WindowListener-injected.
    const hostWindow = window[this.uniqueRandomID]?.WL ? window : window.opener;
    const WL = hostWindow?.[this.uniqueRandomID]?.WL;
    if (!WL) {
      throw new Error("quickFilters WindowListener context unavailable");
    }
    this._context = WL.context;
  }

  async _init() {
    if (this._storage) {
      return;
    }

    const delays = [100, 500, 1000, 2000, 4000, 10000];
    for (let attempt = 0; attempt < delays.length; attempt++) {
      try {
        this._storage = this._context.apiCan.findAPIPath("storage");
        this._call =
          (method) =>
          (...args) =>
            this._storage.local.callMethodInParentProcess(method, args);
        await this._call("get")("dummy");
        return;
      } catch (ex) {
        this._storage = null;
        this._call = null;
        if (attempt === delays.length - 1) {
          throw ex;
        }
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      }
    }
  }

  async get(keys = null) {
    await this._init();
    return this._call("get")(keys);
  }

  async getWithRetry(keys = null, timeout = 5000) {
    const delays = [250, 1000, 5000, 8000];
    for (let attempt = 0; ; attempt++) {
      let timeoutId;
      try {
        return await Promise.race([
          this.get(keys),
          new Promise((_, reject) => {
            timeoutId = setTimeout(
              () => reject(new Error(`Storage.get() timed out after ${timeout}ms`)),
              timeout
            );
          }),
        ]);
      } catch (ex) {
        if (attempt >= delays.length) {
          throw ex;
        }
        this._storage = null;
        this._call = null;
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }

  async set(items) {
    await this._init();
    return this._call("set")(items);
  }

  async remove(keys) {
    await this._init();
    return this._call("remove")(keys);
  }

  async clear() {
    await this._init();
    return this._call("clear")();
  }
})("quickFilters@axelg.com");
