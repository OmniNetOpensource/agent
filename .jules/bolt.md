# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-02-25 - Prevent Effect Thrashing and Cascading Re-renders from Unmemoized Array Derivations
**Learning:** Functions that compute derived arrays based on state (like `computeMessagesFromPath`) return a new reference on every call. If used directly in components (e.g. `MessageList`), this defeats memoization and causes effect thrashing for dependencies like `[messages, isAtBottom]`. When scroll listeners depend on both, they get needlessly unbound and rebound on every message update or stream tick, causing performance issues.
**Action:** Wrap derived array computations in `useMemo` and use functional state updates (e.g., `setState(prev => ...)`) to remove state dependencies from event listeners. Bind scroll listeners once with `[]` and `{ passive: true }`. Separate position checks triggered by data updates into distinct effects dependent only on the data itself.
