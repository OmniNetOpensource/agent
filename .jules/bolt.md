# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-05-25 - Avoid O(N) Array Allocations in Search Operations
**Learning:** Concatenating arrays using the spread operator (e.g., `[...arr1, ...arr2]`) purely for the purpose of a search (`.find()`) forces the JavaScript engine to allocate a completely new array, creating unnecessary O(N) memory pressure and execution time overhead, especially if the arrays are large or the function is called frequently.
**Action:** Replace `[...arr1, ...arr2].find(...)` with sequential searches using the nullish coalescing operator: `arr1.find(...) ?? arr2.find(...)`. This avoids the allocation completely and enables early termination if the item is found in the first array.
