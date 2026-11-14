// Background-owned lifecycle for the HTML assistant. Never loaded into a closing page.
const BOUNDS_KEY = "assistant.window.bounds";

export function createAssistantLifecycle({
  browser,
  resolveAssistant,
  isDebug,
  onWindowClosed,
  logger = console,
  startTimer = setInterval,
  stopTimer = clearInterval,
}) {
  const pendingWindows = new Map();
  const boundsTimers = new Map();
  const savedBounds = new Map();

  async function saveBounds(windowId) {
    try {
      const win = await browser.windows.get(windowId);
      if (!boundsTimers.has(windowId) || win.state !== "normal") {
        return;
      }
      const bounds = { left: win.left, top: win.top, width: win.width, height: win.height };
      const signature = JSON.stringify(bounds);
      if (savedBounds.get(windowId) === signature) {
        return;
      }
      await browser.storage.local.set({ [BOUNDS_KEY]: bounds });
      if (boundsTimers.has(windowId)) {
        savedBounds.set(windowId, signature);
      }
    } catch {
      // The window may disappear between the timer tick and windows.get().
    }
  }

  function trackWindow(win, requestId) {
    if (!win?.id) {
      return;
    }
    if (requestId?.startsWith("assistant_")) {
      pendingWindows.set(win.id, requestId);
    }
    boundsTimers.set(
      win.id,
      startTimer(() => saveBounds(win.id), 500)
    );
    saveBounds(win.id);
  }

  async function readSavedBounds() {
    try {
      const stored = await browser.storage.local.get(BOUNDS_KEY);
      return stored?.[BOUNDS_KEY] ?? null;
    } catch {
      return null;
    }
  }

  async function handleResult(data, sender) {
    const { requestId, result } = data;
    // Capture final bounds before the acknowledged Cancel/Next path closes the page.
    if (sender.tab?.windowId) {
      await saveBounds(sender.tab.windowId);
    }
    if (isDebug()) {
      logger.log(`Resolving assistantResult[${requestId}]: with result "${result}"`, data);
    }
    if (!requestId) {
      return;
    }
    const mergeFilter = data.params?.mergeFilter || null;
    const resultIdx = mergeFilter ? mergeFilter.index : -1;
    const template = data.params?.template || null;
    if (data.params?.answer && !data.params.template) {
      logger.warn("quickFilters: assistant returned without a template", {
        template: data.params.template,
        resultIdx,
      });
    }
    await resolveAssistant(requestId, result, {
      answer: data.params?.answer,
      selectedMergedFilterIndex: resultIdx,
      mergeFilter,
      template,
    });
    // Acknowledged results own completion; onRemoved only handles orphaned windows.
    for (const [windowId, pendingId] of pendingWindows) {
      if (pendingId === requestId) {
        pendingWindows.delete(windowId);
      }
    }
  }

  // Closing with X cannot rely on promises running in the destroyed assistant page.
  browser.windows.onRemoved.addListener(async (windowId) => {
    const timer = boundsTimers.get(windowId);
    if (timer !== undefined) {
      stopTimer(timer);
    }
    boundsTimers.delete(windowId);
    savedBounds.delete(windowId);
    onWindowClosed(windowId);
    const requestId = pendingWindows.get(windowId);
    if (!requestId) {
      return;
    }
    pendingWindows.delete(windowId);
    try {
      if (isDebug()) {
        logger.log(`Assistant window closed: cancelling unresolved request ${requestId}`);
      }
      await resolveAssistant(requestId, "cancelled", {
        answer: false,
        mergeFilter: null,
        selectedMergedFilterIndex: -1,
      });
    } catch (error) {
      logger.error(`Failed to cancel closed assistant request ${requestId}`, error);
    }
  });

  return { trackWindow, readSavedBounds, handleResult, saveBounds };
}
