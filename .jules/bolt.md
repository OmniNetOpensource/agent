# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-05 - Avoid O(N) Array Allocations on Iterables and Multiple Arrays
**Learning:** Concatenating arrays using the spread operator (`[...arr1, ...arr2]`) just to find an element, or calling `Array.from(map.values())` before iterating, forces unnecessary O(N) intermediate array allocations and memory overhead, causing slow operations on large collections.
**Action:** Use sequential `find` calls (`arr1.find() ?? arr2.find()`) instead of concatenation, and update functions to accept `Iterable<T>` so `map.values()` can be iterated directly without converting to an array first.
