# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2024-03-24 - String Comparison vs localeCompare
**Learning:** For ISO-8601 formatted date strings where alphabetical sorting exactly matches chronological sorting, `String.prototype.localeCompare` is excessively slow (up to ~70x slower) compared to primitive lexical comparison (`<`, `>`). `localeCompare` performs complex, CPU-bound locale lookups that are completely unnecessary for standardized timestamp formats.
**Action:** Always use `<` and `>` for sorting or comparing ISO-8601 strings (like `updated_at`, `created_at`) instead of `localeCompare` to achieve significant performance gains, especially in stores or IndexedDB wrappers that handle large collections.
