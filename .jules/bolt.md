# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-05-30 - Array Spreads and Conversions in Stores
**Learning:** Using `[...arr]` or `Array.from(map.values())` when passing data locally between functions that just sort or map the elements causes unnecessary memory allocations and garbage collector pressure. `sort` can be done in-place on newly created local arrays. Iterables like `map.values()` can be consumed directly by loops.
**Action:** Avoid copying arrays unless passing state out of the store to React, and accept `Iterable<T>` instead of `T[]` in local transform functions to consume Map/Set values without an intermediate array.

## 2026-05-30 - Avoid Array Concatenation for Finding an Element
**Learning:** Concatenating two arrays just to call `.find` on the result (`[...A, ...B].find(...)`) allocates memory for a new combined array (O(A+B)) only to potentially discard it immediately. Sequential `.find` (`A.find(...) ?? B.find(...)`) avoids this allocation entirely and can short-circuit early.
**Action:** Use short-circuiting sequential operations for search instead of array spread concatenation.
