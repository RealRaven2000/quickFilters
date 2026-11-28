## Implementation summary

- Added the `news.minimal` preference to suppress the update announcement while preserving the button's normal `quickFilters` text in text modes.
- Kept the blue news background and orange badge tied to `hasNews`, with toolbar labels refreshing immediately when the preference or news flag changes.
- Kept expired and renewal license notices independent of `hasNews` and `news.minimal`. When an expired license and news are both active, the license label and red background take priority; hovering still shows the blue news treatment, and the orange badge remains visible.
- Shortened the localized announcement to the equivalent of “quickFilters updated!”
- Clarified the preference text by inserting the localized announcement in italics, with slightly reduced contrast for the example text.

## Manual test results

Passed in Thunderbird with a valid license, an expired license, and no license. Checks covered the three toolbar display modes, live preference/news updates, the `hasNews` badge, expired-license priority, session dismissal of the license notice, the Assistant-active appearance, and English/German preference wording.

The renewal-warning state for a valid license near expiry was not separately exercised. The German preference wording was checked in Thunderbird 162 beta; its styling should also be checked on ESR/release because that beta has unrelated style regressions.

<!-- Add the updated settings-line screenshot here. -->
