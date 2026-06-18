# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-15 - Array Allocations in Iterations and Map Processing
**Learning:** Using `Array.from(map.values())` creates an unnecessary O(N) array allocation just to iterate over the values. Similarly, using the spread operator `[...arr1, ...arr2]` just to call `.find()` allocates a new merged array unnecessarily. Combining these patterns with redundant shallow array copies before `.sort()` leads to excessive memory pressure in state management loops.
**Action:** Always type functions to accept `Iterable<T>` when possible to allow passing `map.values()` directly. Use sequential `.find() ?? .find()` instead of array concatenation for searches. Use in-place `.sort()` when the array reference is already guaranteed to be newly created.
