# Registration localization migration audit

Issue #406. The legacy registration XHTML dialog has been retired. Its former keys were checked against runtime source, including `__MSG_...__` placeholders in HTML, XHTML and injected markup, `getBundleString`, `messenger.i18n.getMessage`, `browser.i18n.getMessage`, and dynamic lookup paths.

The registration page uses `__MSG_registration.*__` placeholders and the shared formatter. Its former `data-l10n-id` attributes were migration annotations, not consumers: `i18n.updateDocument()` replaces `__MSG_...__` placeholders and does not interpret those attributes. Annotations for removed keys were removed. Descriptions that referenced removed keys were cleaned up while preserving formatting instructions.

The old dialog-only keys, including the retired legacy menu label, were removed from locale catalogs. Shared keys used by settings, notifications and other pages remain. References in descriptions and this historical audit do not constitute runtime use.

Dynamic lookup paths were reviewed conservatively; retain a key if its runtime use cannot be ruled out. New registration strings remain localized according to each locale's `_l10nstatus` and fallback behavior.

## Removed entities and English messages

| Entity | Former English message | Closest new equivalent |
| --- | --- | --- |
| `account.label` | Select account: | `registration.account` |
| `buyDomainLicense.button` | Buy Domain License | `registration.action.buyDomain` |
| `buyDomainLicense.instruct` | Need Licenses for a company with more than five users? Getting a domain license will work out cheaper: | `registration.plan.domain.description` |
| `buyLicense.instruct` | Need a license for yourself? Get a single user license. It is bound to your personal Email address and can be used in multiple installations. | `registration.plan.pro.description` |
| `buyPersonalLicense.button` | Buy Personal License! | `registration.action.buy` |
| `email.label` | Email: | `registration.email` |
| `enterLicenseKey.button` | Enter License Key… | `registration.enterKey` |
| `enterLicenseKey.tooltip` | Enter the License Key code sent to you via Email. | No equivalent tooltip |
| `firstName.label` | First Name: | `registration.firstName` |
| `lastName.label` | Last Name: | `registration.lastName` |
| `licenseWindow.title` | quickFilters Pro License | `registration.title` |
| `pricing.section` | To find out your price, please select one of the following options first. This opens a separate browser window where you may complete the purchase in the web shop. | `registration.terms.checkout` |
| `pricing.section.hint` | Note: The price varies depending on the license model, country, VAT rate, current discounts or licenses already purchased. | `registration.checkout.note` |
| `pricing.title` | Pricing | `registration.terms.checkout.heading` (related heading) |
| `register.hasLicense` | Already have a License? | No separate prompt; Enter license key action remains |
| `register.licenseValid.expired` | Your license expired on: | `registration.date.expired` |
| `testDrive` | You can test drive the premium features with the free version, but they might be slightly restricted. | No direct equivalent |
| `updates.title` | Updates | No direct equivalent |
| `updatesExpiry` | quickFilters Pro will be automatically updated via addons.thunderbird.net as usual. After the year expires you can renew the license or keep using premium features under same terms as free users. 'Premium Exclusive' features will require a valid registration key. | `registration.terms.annual`, `registration.terms.support` (related concepts) |
| `yearlyLicense.premiumFeatures` | quickFilters Pro gives you full unrestricted access to the premium features. | `registration.terms.intro` (related introduction) |
| `yearlyLicense.premiumFeatures.moreInfoLink` | More about premium features. | `registration.features.link` |
| `yearlyLicense.title` | Annual License | `registration.annual` |
| `yearlyLicense.usageTerm` | The license is for your personal use and is tied to your email address. You can install it on multiple email clients as long as they are configured to use that address. | `registration.email.personal`, `registration.terms.email` |
| `yearlyLicense.usageTerm1` | Any additional email addresses are no problem - they do not require a separate license. In case of questions you can reach me via the support tab. | `registration.terms.otherAccounts` |
| `registration.legacy.menu` | Legacy license registration | None; legacy menu removed |

## Additional action mappings

| Existing entity | English message | New registration entity |
| --- | --- | --- |
| `notification.premium.btn.extendLicense` | Extend License | `registration.action.extend` |
| `notification.premium.btn.renewLicense` | Renew License | `registration.action.renew` |

## Registration-only locale scope

`SPLASH+REGISTRATION` includes onboarding, news, licensing and registration translations. Other feature UI uses the default-locale fallback. Slovenian and Serbian use this scope; `SPLASH+UI` continues to cover the full UI.
