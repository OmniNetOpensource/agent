# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-02 - Array Concatenation Overhead in Search Operations
**Learning:** Using the spread operator to combine arrays for a single `find` operation (e.g., `[...arr1, ...arr2].find(...)`) incurs an unnecessary O(N) array allocation and iteration cost, especially noticeable with large lists.
**Action:** For sequential search operations across multiple arrays, use the nullish coalescing operator with sequential `find` calls (e.g., `arr1.find(...) ?? arr2.find(...)`) to avoid array allocation and allow for early returns.
