# Troubleshooter: dedicated Thunderbird tab

## Current behavior

The troubleshooting toolbar button in the filter list runs enabled checks through successive message boxes:

- **Execution flags:** finds enabled filters without incoming, periodic or manual execution flags; offers to set the incoming flag.
- **Target folders:** reports missing or invalid move/copy destinations.
- **Custom actions:** reports unavailable actions, for example when a required third-party add-on is missing or its actions are disabled.
- **Search conditions:** offers to normalize mixed Any/All conditions and reports filters without search terms.

<img width="874" height="202" alt="Image" src="https://github.com/user-attachments/assets/8f13d688-cff3-4fbb-8a51-322a7756e511" />

Users can decline proposed repairs. Right-clicking the button opens advanced preferences (`quickfilters.troubleshoot`) to enable or disable the four checks; there is no dedicated selection interface or persistent results overview.

## Required experience

Open a dedicated Thunderbird tab from the troubleshooter button, with a presentation consistent with backup/restore.

- Explain the available checks and let users select which to run, without following a fixed sequence.
- Display results using the per-filter error review component developed for #193, showing affected filters and understandable explanations.
- Provide assisted remedies: edit a filter, delete it with confirmation, correct supported problems, or open the Add-ons Manager to investigate a dependency.
- Help users investigate unavailable custom actions and search terms: a provider such as FiltaQuilla may be missing, disabled or incompatible, or individual actions/terms may need enabling in its settings. Explain what to check without assuming the cause.
- Keep results available while users investigate, and allow checks to be rerun after changes. Clearly distinguish remaining problems, resolved problems and checks that were not run.
- Require an explicit user choice before changing or deleting filters.
