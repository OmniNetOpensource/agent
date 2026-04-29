# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.
## 2025-04-29 - Array Allocation Overhead in Stores
**Learning:** In heavily used Zustand stores managing collections (like conversations or messages), intermediate array allocations (e.g., `[...arr1, ...arr2].find(...)` or `Array.from(map.values())`) introduce measurable O(N) memory allocation and garbage collection overhead. This is particularly wasteful when performing early-exit search operations.
**Action:** Always prefer sequential execution (e.g., `arr1.find(...) ?? arr2.find(...)`) and accepting iterables over arrays when extracting values from Maps to avoid unnecessary object cloning and initialization overhead.
