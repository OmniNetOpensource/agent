# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2024-03-22 - ISO-8601 Date String Sorting Optimization
**Learning:** For sorting standard ISO-8601 formatted date strings (like `updated_at`), `String.prototype.localeCompare` is significantly slower than basic lexical string comparison operators (`<`, `>`). Benchmarks show lexical comparison is ~70x faster in standard Node/V8 environments.
**Action:** Always use lexical string comparison (`a < b ? -1 : (a > b ? 1 : 0)`) instead of `localeCompare` when sorting ISO-8601 date strings.

## 2024-03-22 - Map Iteration Optimization
**Learning:** Calling `Array.from(map.values())` creates an intermediate array and adds an O(N) allocation overhead. Directly iterating over `map.values()` as an `Iterable` is approximately 2.3x faster for large datasets (~10,000 items).
**Action:** Type function parameters as `Iterable<T>` instead of `T[]` when processing map values, and pass `map.values()` directly.
