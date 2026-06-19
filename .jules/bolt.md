# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-01 - Avoid Array Concatenation and Intermediate Array Allocation for Map Operations
**Learning:** Using `Array.from(map.values())` and `[...arr1, ...arr2]` for Map iteration and search operations incurs O(N) array allocation overhead. Benchmarks show a 25-50% performance improvement when sequentially searching (`arr1.find() ?? arr2.find()`) and passing `map.values()` directly as an `Iterable` instead.
**Action:** When working with large collections, especially Maps or combined lists, avoid intermediate array allocation via spreads or `Array.from`. Iterate over the `Iterable` directly and use sequential fallback for searches.
