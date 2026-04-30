# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-04-30 - Array Reallocation and Effect Thrashing in MessageList
**Learning:** Derived state (like computing messages for a branch) returned as a new array reference causes constant unmounting and remounting of event listeners in useEffects, leading to thrashing during high-frequency events like streaming.
**Action:** Use `useMemo` to stabilize the reference of the generated array, and split static event listener bindings (empty dependency array) from dynamic state syncs (dependent on the array reference).
