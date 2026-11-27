# Test matrix

Issue #410. Run the cases in license-status order to avoid repeatedly changing keys. Record the build, Thunderbird version, and results. The news test command is in the quickFilters toolbar menu under **Tools → Test → Test - set has news flag!**. Confirm `hasNews` is set before checking the toolbar. Clear it by opening the news/changelog menu item.

For each toolbar-label case, capture the button text before setting `hasNews`. Check all three toolbar display modes: **Icons only**, **Icons and text**, and **Text**. In icons-only mode the text may be visually hidden by Thunderbird; switch to a text display mode to confirm whether it was changed.

## Valid license

Use a valid license that is not near expiry for cases 1–3.

| # | Tested | Setup and action | Expected result |
| --- | --- | --- | --- |
| 1 | [x] | No renewal warning; `hasNews` off. Toggle `news.minimal` off and on; check all toolbar display modes. | Standard quickFilters button text and styling; no blue news highlight or orange badge. |
| 2 | [x] | No renewal warning; set `hasNews` on; `news.minimal` off. Check all toolbar display modes. | “quickFilters updated!” is shown in every mode, with the blue background and orange news badge. |
| 3 | [x] | No renewal warning; set `hasNews` on; `news.minimal` on. Check all toolbar display modes. | The standard `quickFilters` label appears beside the icon in text modes; icons-only mode stays compact. Blue background and orange news badge remain visible. |

### Valid license with renewal warning

Use a valid license within the renewal-warning period and not yet viewed.

| # | Tested | Setup and action | Expected result |
| --- | --- | --- | --- |
| 4 | [ ] | Test with `hasNews` off, then on; for both states toggle `news.minimal` off and on. | The renewal notice and styling take priority. The news indication appears when `hasNews` is on, and the license notice does not depend on the news flag or `news.minimal`. |

## Expired license

Use an expired license whose warning has not yet been viewed.

| # | Tested | Setup and action | Expected result |
| --- | --- | --- | --- |
| 5 | [x] | Test with `hasNews` off, then on; for both states toggle `news.minimal` off and on. | The expired-license notice and styling take priority. The news indication appears when `hasNews` is on, and the license notice does not depend on the news flag or `news.minimal`. |
| 6 | [ ] | With `hasNews` on, open the license notice, then check the button again with `news.minimal` off and on. | After the license notice is viewed and cleared, normal news-label behavior applies: show the update text when the option is off and the standard `quickFilters` label when it is on. |

## No license

| # | Tested | Setup and action | Expected result |
| --- | --- | --- | --- |
| 7 | [x] | `hasNews` off; toggle `news.minimal` off and on. | Standard API toolbar button text and styling; no news or license colors or badge. When Assistant is active, retain its checked state with the red frame and icon to show it is watching manual mail changes. |
| 8 | [x] | `hasNews` on; test `news.minimal` off and on in all three toolbar display modes. | Option off shows the update announcement in every mode; option on shows the standard label in text modes and stays compact in icons-only mode. Both states retain the blue background and orange news badge. |

## Preference localization

| # | Tested | Setup and action | Expected result |
| --- | --- | --- | --- |
| 9 | [x] | Open Settings in English and German and inspect `news.minimal`. Toggle it. | The option identifies the localized “quickFilters updated!” text in italics, and toggling it updates the preference. |

## Results

- Build/version:
- Thunderbird version:
- Platform:
- Notes or screenshots:
  - Case 1 passed.
  - Case 2 passed in all three toolbar display modes after updating the badge selector to follow `newsflash`.
  - Case 3 passed with the minimal flag in place. Live toggling of `hasNews` and `news.minimal` from Settings updated the toolbar label as expected.
  - Expired license plus `hasNews` passed: “License expired!” retained priority, with the orange news badge still visible.
  - Case 7 passed without a license or `hasNews`: standard API toolbar appearance with no special label or status colors. Assistant-active state correctly retains the red frame and icon.
  - Case 8 passed without a license. Toggling `news.minimal` off immediately showed “quickFilters updated!” even in icons-only mode; toggling it on immediately restored the standard `quickFilters` label.
  - Case 9 passed in English and German. The German label renders correctly in Thunderbird 162 beta; its styling should also be checked on ESR/release because that beta has unrelated UI style regressions.
