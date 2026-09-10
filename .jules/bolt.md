# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2024-03-24 - Avoiding `localeCompare` for ISO-8601 Date Strings
**Learning:** Using `String.prototype.localeCompare` to sort ISO-8601 formatted date strings introduces significant overhead from the Intl API, making sorting much slower than necessary. Benchmarks indicate that simple lexical comparison operators (`<`, `>`) are ~20-70x faster in V8.
**Action:** Always use lexical operators (`<`, `>`) instead of `localeCompare` when sorting ISO-8601 timestamps, ensuring the ternary logic correctly reflects the desired sort order.
