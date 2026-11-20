# Registration flow test matrix

Issue #406. Check an item only after testing it in Thunderbird with the stated license state. Shop links may be opened without completing a purchase. Compare decoded parameters when comparing URLs: `%20` and `+`, or encoded and unencoded punctuation, can represent the same value. Do not record license keys, email addresses or full checkout URLs here.

## Shop routes and license states

For every unchecked shop action, confirm that the correct product page opens, the contact details are correct, and the referrer follows the rules below. Compare with the legacy dialog where its equivalent action exists.

| # | Tested | License state | Action | Expected shop path |
| --- | --- | --- | --- | --- |
| **1** | [x] | No license | Buy Pro | `instant/quickfilters` |
| **2** | [x] | No license | Buy Domain License | `product/quickfiltersdomainlicense` |
| **3** | [x] | Expired Pro | Renew License | `instant/quickfiltersrenew` |
| **4** | [x] | Expired Pro | Buy Domain License | `product/quickfiltersdomainlicense` |
| **5** | [x] | Expired Domain | Renew Domain License | `product/quickfiltersdomainrenew`; current key passed |
| **6** | [x] | Expired Domain | Buy Pro | `instant/quickfilters`; current key passed |
| **7** | [x] | Valid Pro (including near expiry) | Extend License | `instant/quickfiltersrenew`; current key passed |
| **8** | [x] | Valid Pro | Buy Domain License | `product/quickfiltersdomainlicense` |
| **9** | [x] | Valid Domain | Renew Domain License | `product/quickfiltersdomainrenew`; current key passed |
| **10** | [x] | Valid Domain | Buy Pro | `instant/quickfilters`; current key passed |

### Checkout details and referrers

| # | Tested | Check |
| --- | --- | --- |
| **11** | [x] | Valid Pro: compared extension and domain purchase links with the legacy dialog; product sites opened correctly. |
| **12** | [x] | No license, opened from a premium feature: `advancedSearchType` reached both Pro and Domain purchase URLs. |
| **13** | [x] | No license, opened from the test menu without a feature: both Pro and Domain checkout URLs omit the referrer. |
| **14** | [x] | Valid and expired Pro and Domain: the existing license key takes precedence over the feature referrer for both checkout actions, including buying the other license type. All four license states passed. |
| **15** | [x] | Edited contact details reach checkout correctly, including an encoded plus sign; the existing license remains the referrer. |
| **16** | [ ] | Missing or invalid email and unavailable existing key show an error rather than opening an incorrect checkout. **Invalid and empty email passed:** visible inline feedback. The defensive unavailable-key case remains untested. |
| **17** | [ ] | Reusing registration clears stale parameters. **Passed:** main-menu feature cleared when opening from the test menu, and Pro checkout omitted the referrer. Test-scenario parameter remains to check. |
## Entry points and handoffs

| # | Tested | Entry point and expected behavior |
| --- | --- | --- |
| **18** | [x] | Settings: Extend License closes Settings and opens the new registration tab with the live license. |
| **19** | [x] | Premium-feature notification: Get Pro opens the new registration tab and closes the notification. |
| **20** | [x] | Backup and restore: Get quickFilters Pro opens the new registration tab; the originating work tab remains available. |
| **21** | [x] | Main quickFilters menu: Get quickFilters Pro opens the new registration tab. |
| **22** | [x] | Tools → quickFilters Pro License opens registration with `toolsMenu`. The legacy action has been retired. |
| **23** | [x] | Without a license, troubleshooter → Get quickFilters Pro opens registration with `troubleshooter` and Buy Pro as the default. |
| **24** | [x] | Legacy assistant with an expired license: Renew License opens and focuses registration after the modal assistant closes. Accepted for the soon-to-be-removed legacy assistant; `assistant_renew` referrer not separately verified. |
| **25** | [x] | Installed welcome page: registration actions and popup handoff passed, including expired-license renewal and no-license purchase with `landing-install`. |
| **26** | [x] | Update/changelog page: Buy, Renew and Extend open the appropriate registration flow with `splashScreen` and close the changelog window. Conditional special-offer icons were not tested. |
| **27** | [x] | Registration: Enter license key opens Settings on the license page and closes registration on success. |
| **28** | [ ] | Opening registration or Settings fails: the originating page stays open and an error is available. |
| **29** | [x] | Opening registration from a second Thunderbird window reuses and focuses the existing tab in the first window. |

**Additional pass:** With no license, the main menu and Settings Get Pro actions highlighted Buy Pro and opened the correct Pro shop page with `mainBtnPopupMenu` and `options_licenseTab` respectively. Buy Domain License opened the correct domain shop page from both the main-menu and Settings flows, with `mainBtnPopupMenu` and `options_licenseTab` respectively.
## Trial and presentation checks

- [x] **30.** Troubleshooter: trial hint follows individual checks, remains beside the last selected check, and returns to Run all checks when requested; maintainer end-to-end test passed.

- [ ] **31.** Backup: trial count and active-session hint update after a backup; repeat use on the same day does not consume another session.

- [ ] **32.** Restore: with no backup selected, hovering the disabled Restore button shows the instruction; when enabled, the trial hint appears and updates after a restore.

- [ ] **33.** Restore: repeat use on the same day does not consume another session.

- [ ] **34.** Check registration and trial hints in light and dark modes, including narrow windows.


## Retirement

- [ ] **35.** Complete the applicable shop paths and URL checks above before removing the registration test menu.

- [x] **36.** Audit callers and retire the old dialog, its dedicated API, and the legacy fallback.

