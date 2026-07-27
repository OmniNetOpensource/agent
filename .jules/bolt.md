# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-05 - Lexical Comparison for ISO-8601 Date Strings
**Learning:** For ISO-8601 formatted date strings (like `updated_at`), using `String.prototype.localeCompare` introduces a significant and unnecessary performance overhead. Benchmarks show that basic lexical comparison operators (`<` and `>`) are approximately 70x faster in Node/V8 environments and achieve the exact same sorting outcome because ISO-8601 strings are inherently lexicographically sortable.
**Action:** Always use lexical operators (`a > b ? -1 : a < b ? 1 : 0`) instead of `localeCompare` when sorting arrays of objects by ISO-8601 date strings to optimize performance.
