# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-02 - Array.prototype.sort with localeCompare Overhead
**Learning:** For sorting ISO-8601 formatted date strings (e.g., timestamps like `updated_at`), using `String.prototype.localeCompare` incurs significant performance overhead from the Intl API, making sorting O(N log N) much slower than necessary. Because ISO dates are strictly formatted from largest time unit to smallest (YYYY-MM-DDTHH:mm:ssZ), standard lexicographical string comparison (<, >, ===) yields the exact same chronological sorting results as parsing them to Date objects or using `localeCompare`.
**Action:** Replace `localeCompare` with standard string comparison operators (`<`, `>`) when sorting known ISO-8601 date strings to achieve a ~1.6x-2.5x performance boost. Ensure strict equality (`===`) is handled correctly to satisfy the strict weak ordering requirement of `Array.prototype.sort()`.
