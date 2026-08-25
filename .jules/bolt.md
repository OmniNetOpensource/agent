# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2025-02-14 - Optimize Date Sorting
**Learning:** Using `String.prototype.localeCompare` to sort arrays of ISO-8601 formatted date strings is significantly slower than lexical comparison (`<`, `>`). Since ISO-8601 strings sort alphabetically by design, we can skip the overhead of locale-aware sorting. Benchmarks show a ~5x speedup for 10,000 items (23ms down to 4.7ms).
**Action:** Always use simple lexical comparison operators (`<`, `>`) when sorting standard ISO date strings instead of `localeCompare`.
