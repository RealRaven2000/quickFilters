import { t } from "./i18n.mjs";
import { createFilterWarningPanel } from "../filter-review/warning-panel.mjs";

// Backup/restore wording stays here; the review renderer is shared.
export function createWarningPanel({ backupReview = false, ...options }) {
  return createFilterWarningPanel({
    ...options,
    warnings: options.warnings.map(warning => ({ ...warning, token: warning.reviewToken || warning.importedToken })),
    text: (key, values) => t(`backup.warnings.${key}`, values),
    panelId: "backup-warnings",
    title: options.title || t("backup.warnings.backupSavedWithWarnings", [options.warnings.length]),
    deletedLabel: t(backupReview ? "backup.warnings.itemDeleted" : "backup.warnings.filterDeleted"),
    changeReminder: backupReview ? t("backup.warnings.youHaveChangedYourCurrentFiltersRememberTo") : undefined,
  });
}
