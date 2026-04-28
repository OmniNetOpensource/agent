# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-04-28 - Unmemoized array projection causing cascading list updates
**Learning:** Functions that map state to derived arrays (like `computeMessagesFromPath`) return a *new* reference every time they are called. Even with the React Compiler enabled, if these functions are called directly in a render loop of a parent list component, they break `React.memo` (or compiler-equivalent shallow checks) in child components, causing the entire list to re-render, and cause thrashing in `useEffect`s that depend on the array.
**Action:** When deriving state that returns arrays (especially for lists), wrap the computation in `useMemo` so the reference is stable between renders unless the underlying state actually changes.
