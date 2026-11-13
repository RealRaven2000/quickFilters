## Objective
Prevent migration from changing user preferences unexpectedly, and provide clear feedback when settings storage cannot initialize.

## Requirements
- Import only explicitly saved legacy user preferences, excluding legacy defaults.
- Use current quickFilters defaults for missing or null settings.
- Preserve intentional false, zero, and empty-string values, and give existing storage choices precedence over older legacy values.
- Keep preference caches synchronized, especially the Filter Assistant’s selected template.
- Retry temporary storage startup failures within bounded limits.
- If storage remains unavailable, stop initialization safely and show a clear failure notification with troubleshooting guidance.
- Provide a hidden switch for testing startup failure handling.
- Include Error Console guidance for Thunderbird 154+: enable [Browser] and [Content].

## Validation
Verify that settings survive restart, template selections are remembered and used correctly, and startup failures produce useful feedback.

Keep supporting tests and documentation under docs/, excluded from the add-on package.