# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-05 - Conversation List Processing Optimizations
**Learning:** Using `Array.from(map.values())` creates unnecessary intermediate arrays and O(N) allocations for large Maps. Furthermore, `localeCompare` is roughly 4.6x slower than basic lexical string comparison (`<`, `>`) for ISO-8601 date strings.
**Action:** Iterate directly over `map.values()` using `Iterable<T>` parameter types where possible, and prefer lexical comparison for sorting timestamps to avoid performance penalties.
