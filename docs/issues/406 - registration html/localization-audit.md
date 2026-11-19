# Registration localization migration audit

Issue #406. `data-l10n-id` annotations identify a related legacy entity for migration review; the actual registration text comes from `__MSG_registration.*__` and the shared formatter. An annotation is not an instruction to remove an entity. The legacy XHTML dialog remains available.

Compared with `chrome/content/register.xhtml`:

| Legacy entity | Registration use | Assessment |
| --- | --- | --- |
| `licenseWindow.title` | Page title | Same purpose. |
| `enterLicenseKey.button` | Enter-key action | Same purpose. |
| `yearlyLicense.title` | Annual license label | Same purpose. |
| `account.label`, `email.label`, `firstName.label`, `lastName.label` | Contact fields | Same purposes; input controls must remain outside translated text replacement. |
| `buyLicense.instruct`, `buyDomainLicense.instruct` | Pro and Domain descriptions | Related purchase guidance, rewritten for the cards. |
| `buyPersonalLicense.button`, `buyDomainLicense.button` | Purchase actions | Related purchase buttons; the new button also changes label for renewal or extension. |
| `pricing.section`, `pricing.section.hint` | Checkout terms and note | Related pricing explanations. |
| `yearlyLicense.usageTerm`, `yearlyLicense.usageTerm1` | Personal license terms | Related license scope and other-account guidance; verify current default-identity wording against the validator. |
| `yearlyLicense.premiumFeatures.moreInfoLink` | Feature comparison link | Same destination purpose, with rewritten label. |
| `licenseTerms.show` | Terms toggle | Same action; the controller also changes its label when open. |

Removed misleading annotations for `licenseValidation.expiredDate`, `buyPremiumLicense.instruct`, `notification.premium.btn.upgrade`, `licenseTypes`, `domainLicense.instruct`, and `licenseComparison`: these are not matching entities in the quickFilters XHTML dialog. The renewal tooltip annotation refers to a related shared entity rather than an XHTML placeholder.

No legacy entity has been deleted. The dialog, Settings, notification and other callers can still use them. Before retiring an entity, search its references throughout the add-on, including dynamically constructed message IDs, localized catalogs and markup; only remove it after the legacy dialog and all other consumers have gone.

The English registration entities use the SmartTemplates naming and reusable content where appropriate. Product-specific copy uses quickFilters and its Pro/Domain model. German is a test translation. Remaining hardcoded dynamic status, button, preview, accessibility and checkout messages still need migration before the registration UI is fully localized. The existing Domain term is draft business copy and requires confirmation for quickFilters.
