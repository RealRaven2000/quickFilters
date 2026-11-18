So far, only the **Group** template collected senders from multiple selected messages. It adds sender conditions only; it does not use the two-way addressing option, which can also add a condition for messages sent *to* each address.

In the test version below, the **Based on Sender (from)** template now also collects senders from multiple selected messages, while respecting the two-way addressing setting.

Please try this version and let me know whether it works for you:

[quickFilters-6.15.1pre57.zip](https://github.com/user-attachments/files/35033012/quickFilters-6.15.1pre57.zip)

This version also includes the following changes discovered while testing:

- Fixed the empty email preview when using Thunderbird's **Move To** context menu. #407
- Added `<` and `>` buttons to browse previews when multiple messages are selected. #407
- Prevented duplicate actions, such as **Add Star**, when merging into an existing filter.


----

**To install:** Download the ZIP file, then drag the downloaded ZIP directly into Thunderbird's Add-ons Manager. **Do not extract it first**—the extracted contents cannot be installed this way.
