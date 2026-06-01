# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.
## 2026-03-02 - Store Array Allocation Optimizations
**Learning:** O(N) array copying and creation inside hot paths of state management (e.g., intermediate array allocations in Maps, redundant cloning before sorts, concatenating arrays to find an item) significantly degrade execution times for large datasets (~2.3x slower for Maps, ~50% slower for lookups).
**Action:** Use native Iterator values where possible to prevent `Array.from()` intermediate creation. Instead of array concatenation `[...a, ...b].find(...)`, sequence finds lazily `a.find() ?? b.find()`. If array clones are already explicitly guaranteed by callers, do not lazily re-clone arrays before passing them to native methods like `.sort()`.
