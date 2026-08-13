# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-05 - Optimize ISO-8601 Date String Sorting
**Learning:** `localeCompare` is excessively slow (~70x slower) for comparing ISO-8601 timestamp strings (like `updated_at` or `pinned_at`) compared to basic lexical operators (`<`, `>`). Since ISO-8601 strings are strictly formatted and zero-padded, lexical comparison perfectly maps to chronological order.
**Action:** Always use lexical comparison operators (`<` and `>`) instead of `String.prototype.localeCompare` when sorting ISO-8601 formatted date strings to maximize performance.
