# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-01 - Prevent Scroll Listener Thrashing in List Components
**Learning:** Returning new array references from selector-like computations (like `computeMessagesFromPath`) inside a component creates a new reference on every render. If used in `useEffect` dependencies, this causes thrashing (repeatedly removing and adding native event listeners like `scroll`).
**Action:** Always wrap array-returning computations in `useMemo`. Furthermore, bind native event listeners exactly once using an empty dependency array `[]` and functional state updates. Handle dynamic updates (like scrolling height changes during streaming) in a separate `useEffect`.
