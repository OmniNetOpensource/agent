# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.
## 2026-05-04 - Effect Thrashing from Unmemoized Array References
**Learning:** `computeMessagesFromPath` returns a new array reference on every render, which in `MessageList` caused unnecessary downstream effect triggers (like scroll listener detach/attach) and re-renders when local state changed (e.g., text selection or scroll position).
**Action:** Always wrap function calls that return new arrays from pure state in `useMemo` when their results are used in components with rapidly changing local state or passed as props/dependencies.
