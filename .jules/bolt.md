# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2024-03-22 - Replacing localeCompare with Lexical Operators for Date Strings
**Learning:** `String.prototype.localeCompare` relies on the heavy Intl API, which introduces significant performance overhead, especially within tight loops like `Array.prototype.sort()`. For ISO-8601 timestamps, where lexical order is guaranteed to match chronological order, `localeCompare` is completely unnecessary.
**Action:** Always use standard lexical operators (`<`, `>`, `===`) when sorting ISO-8601 date strings. When replacing `localeCompare` in sorting functions, ensure you handle the equality case explicitly (returning `0`) to maintain strict weak ordering and avoid erratic sort behaviors.
