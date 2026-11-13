Title: 

Reimplement license restrictions based on trial counts 

Synopsis: 

Replace countdowns with count-up usage stored under `extensions.quickFilters.usage.*`. Define maximum allowances in a shared JavaScript module and expose atomic consumption through an experimental API. Reset usage when a license becomes valid, and ensure feature gates await their checks.

**Motivation**

Accurately check usage of premium features to help with pro license conversion. Resetting usage should avoid penalizing users who already had a valid license and may not have renewed it. This would be a gentle way of monetizing the Add-on without too much pressure.

The old usage countdown check did not fully work as it was turned async and didn't block usage, thus running into negative numbers, which was also confusing.

## Implementation

Implementation details, the feature gate table, trial storage and reset behavior, outstanding decisions, and verification are consolidated in [the implementation document](%23400%20-%20implementation.md).
