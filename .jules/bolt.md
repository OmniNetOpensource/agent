# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-05 - Map Iteration and Date Sorting Optimizations
**Learning:**
1. When iterating over `Map.values()`, converting to an intermediate array using `Array.from(map.values())` causes an unnecessary O(N) allocation and increases memory pressure, which can be a bottleneck.
2. Sorting ISO-8601 formatted date strings using `String.prototype.localeCompare` is ~70x slower in V8 than using standard lexical comparison (`<` and `>`).
**Action:**
1. Type function parameters as `Iterable<T>` instead of `T[]` where appropriate, and pass `map.values()` directly.
2. For ISO-8601 timestamps, use standard lexical string comparison operators instead of `.localeCompare`.
