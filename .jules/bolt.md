# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-06-06 - Unnecessary Array Spread Memory Overhead
**Learning:** In heavily used store functions (like `useConversationsStore`), concatenating arrays via spread (`[...pinned, ...normal]`) just to perform a lookup (`find()`) allocates large arrays unnecessarily, leading to GC overhead. Additionally, `Array.from(map.values())` creates an intermediate array when the target function (`splitAndSortConversations`) can just process the `IterableIterator` directly. Lastly, calling `.sort()` on an array spread (`[...arr].sort()`) when `arr` is *already* a fresh clone is redundant and wastes memory.
**Action:** Use sequential short-circuiting for lookups (`pinned.find() ?? normal.find()`). Define functions to accept `Iterable<T>` when traversing sets or map values to skip intermediate arrays. Use in-place `.sort()` when the array reference is guaranteed to be uniquely owned.
