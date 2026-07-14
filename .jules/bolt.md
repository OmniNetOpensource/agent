# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-05 - Map Iteration and LocaleCompare bottlenecks
**Learning:** `Array.from(map.values())` causes a hidden O(N) iteration and intermediate array allocation. In addition, `String.prototype.localeCompare` is notoriously slow compared to basic lexical operators (`<`, `>`). Since ISO-8601 timestamps are designed specifically to be sorted lexically, we can skip `localeCompare` safely and gain massive performance improvements.
**Action:** Always accept `Iterable<T>` (and pass `map.values()` directly) instead of `T[]` when performing Map-to-array transformations if possible. Always use lexical comparison (`<`, `>`) instead of `localeCompare` when dealing with strictly formatted date strings (like ISO-8601).
