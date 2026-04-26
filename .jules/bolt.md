# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.
## 2025-04-26 - Zustand Store Derived State & Sorting Optimizations
**Learning:** In Zustand stores managing lists, operations like sorting and merging often introduce unnecessary intermediate array allocations (e.g. `[...arr1, ...arr2].find()`, `Array.from(map.values())`, or cloning before sort on freshly instantiated arrays). These allocations cause GC pressure and overhead, especially as the size of the store grows.
**Action:** When filtering or merging data, pass `Iterable`s directly to processing functions when possible (e.g. consuming `map.values()` via `for...of`). Use sequential evaluation (`arr1.find() ?? arr2.find()`) instead of concatenation for searching. Perform in-place sorting if the arrays are already guaranteed to be newly created.
