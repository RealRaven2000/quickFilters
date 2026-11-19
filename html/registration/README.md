# Registration scaffold

This is an isolated quickFilters registration preview. Open `registration.html` as an extension page; it uses English fallback messages and synthetic data. The test case selector exercises purchase, renewal, extension, and Pro-to-Domain upgrade layouts. Expired and valid Pro holders can choose the Domain upgrade alongside renewal or extension. Checkout remains a preview. Enter license key opens the license settings tab and closes the registration tab; the existing registration dialog is unchanged.

`registration.js` owns the page interactions, `preview.js` supplies the sample states, and `../localized-format.js` handles marked localized text. New registration messages use the `registration.` prefix. The remaining prototype copy and state labels are English placeholders and need localization before integration.

Before connecting the page to real data, implement an adapter using Thunderbird MailExtension APIs and the existing background license information, confirm the Pro-to-Domain shop product and entitlement rules, handle checkout referrers, and replace the fixture selector with actual state. Verify identity selection, expired and valid license cases, localization, and checkout behavior in Thunderbird.
