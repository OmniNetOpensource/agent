# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2023-10-07 - O(N) Array Allocation Overhead in Reverse Searches
**Learning:** Using `[...arr].reverse().find(...)` for searching from the end of an array causes significant O(N) memory allocation overhead, creating a performance bottleneck for long lists like conversation histories.
**Action:** Use a backward `for` loop (e.g., `for (let i = arr.length - 1; i >= 0; i--)`) instead of array copy and reverse to perform search operations, preserving O(1) memory and avoiding unnecessary processing overhead.
