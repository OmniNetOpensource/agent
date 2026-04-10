# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2025-02-28 - In-Place Array Sorting & Direct Iteration
**Learning:** Consolidating array creations in frequently called map manipulation pathways saves notable memory allocation. Sorting locally constructed arrays in-place eliminates the need for spread syntax (`[...arr]`), reducing O(N) array copies and memory churn. Furthermore, `for (const val of map.values())` is significantly cheaper than `Array.from(map.values())` when elements just need conditional routing (like splitting pinned vs normal conversations).
**Action:** When filtering or transforming `Map` values, do it inside a single iteration over `map.values()` rather than using intermediate arrays. For sorting freshly allocated internal arrays, mutate them in-place with `.sort()`.
