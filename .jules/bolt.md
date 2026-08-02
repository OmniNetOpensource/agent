# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-02-25 - Array Allocation and String Comparison Overheads
**Learning:** Intermediate array allocations (like `Array.from(map.values())` or spreading large arrays for search) and using `localeCompare` for ISO date strings introduce unnecessary performance overheads in hot paths.
**Action:** Pass `Iterable` directly where possible, use sequential searches instead of array concatenation, and use lexical operators (`<`, `>`) for ISO-8601 string sorting.
