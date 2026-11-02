// Presentation state for the current check action only.
export function createReviewState() {
  const findings = new Map(), checks = new Set();
  return {
    findings, checks,
    replace(result) {
      findings.clear();
      checks.clear();
      this.merge(result);
    },
    merge(result) {
      const current = new Set(result.findings.map(item => item.id));
      for (const item of findings.values()) {
        if (item.state !== "deleted" && result.checks.includes(item.category) && !current.has(item.id)) item.state = "resolved";
      }
      result.findings.forEach(item => findings.set(item.id, { ...item }));
      result.checks.forEach(check => checks.add(check));
    },
    deleted(token) {
      for (const item of findings.values()) if (item.token === token) item.state = "deleted";
    },
    visible(query, view) {
      return [...findings.values()].filter(item =>
        item.filterName.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
        (view === "all" || (view === "resolved" ? ["resolved", "deleted"].includes(item.state) : ["remaining", "disabled"].includes(item.state)))
      );
    },
  };
}
