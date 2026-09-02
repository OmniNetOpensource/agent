# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2023-10-27 - Lexical vs localeCompare for ISO-8601 strings
**Learning:** Using `String.prototype.localeCompare` inside hot paths like array sorting callbacks (`.sort()`) introduces significant performance overhead due to the Intl API. For strings formatted as ISO-8601 dates (e.g., `updated_at`), chronological order perfectly matches lexicographical order.
**Action:** Always use simple lexical comparison operators (`>` and `<`) instead of `localeCompare` when sorting ISO-8601 formatted date strings. Benchmarks show this approach is roughly 20x to 70x faster in standard environments without changing the outcome.
