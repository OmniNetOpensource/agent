# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-05-18 - Avoiding O(N) Array Allocations in Map/Array Operations
**Learning:** Consolidating multiple loops by spreading arrays into a single `for...of` loop (e.g., `for (const item of [...arr1, ...arr2])`) or converting `Map.values()` to an array via `Array.from()` reduces code size but can introduce performance overhead due to intermediate array allocation and memory pressure, particularly for large collections. Benchmarks in the conversations store demonstrate that avoiding array concatenation for search operations reduces execution time by approximately 50% for large datasets (~10,000 items).
**Action:** When transforming or splitting `Map` contents into multiple categories, iterate over `map.values()` directly in a single loop instead of using `Array.from(map.values())`. In performance-sensitive search operations across pinned and normal conversations, use sequential `find` calls (`pinned.find() ?? normal.find()`) to avoid the O(N) allocation and performance overhead of array concatenation via the spread operator. Update functions to accept `Iterable<T>` instead of `T[]` where applicable to support `map.values()`.
