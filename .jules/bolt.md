# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-10 - Avoiding Unnecessary Array Allocations in Map Conversions and Search
**Learning:** Converting `Map.values()` to an array via `Array.from()` before passing to a function, and spreading arrays `[...arr1, ...arr2]` just to perform a `.find()` operation, causes noticeable memory pressure and O(N) allocation overhead for large collections (like conversations).
**Action:** Use `Iterable<T>` for function parameters to accept `map.values()` directly. Replace array spreading with sequential `.find()` calls (`arr1.find() ?? arr2.find()`) to achieve zero-allocation searches.
