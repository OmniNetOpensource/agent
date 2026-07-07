# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2024-07-07 - ISO-8601 Date String Sorting Optimization
**Learning:** For sorting standard ISO-8601 formatted date strings (like `updated_at` timestamps), using `String.prototype.localeCompare` is significantly slower (~70x in Node/V8) than basic lexical string comparison operators (`<`, `>`).
**Action:** When sorting standard date/timestamp strings where locale rules don't matter, use standard `<` / `>` operators. For descending sort, use `a < b ? 1 : a > b ? -1 : 0`.
