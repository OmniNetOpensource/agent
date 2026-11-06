# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2023-10-27 - Fast Date Sorting with Lexical Comparison
**Learning:** Using `String.prototype.localeCompare` on ISO-8601 formatted date strings is a significant performance bottleneck because it utilizes the Intl API. Lexical comparison operators (`<`, `>`) are strictly faster (1.6x - 2.5x) and completely adequate for sorting correctly formatted timestamps.
**Action:** Always replace `localeCompare` with lexical comparison when sorting timestamp strings, ensuring to handle the equality case properly (`if (a === b) return 0`) to maintain stable sort ordering.
