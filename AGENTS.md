# Add-on release policy

- The `preNN` suffix and `revision.txt` track cumulative testing revisions for the release in preparation. Each new build must increase the counter.
- Preserve this counter when changing the target version, including switching an unreleased maintenance version to a new minor version (for example, `6.14.1pre57` becomes `6.15pre58` on the next build).
- Never automatically reset or decrease the counter during version changes, release preparation, or publication. Only the user may reset it manually, after publishing a new version.
- Keep the manifest's `preNN` suffix, `revision.txt`, and generated XPI filename consistent. If they disagree, investigate and preserve testing progress; do not reset the counter to resolve the mismatch.
