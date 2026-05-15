# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-05 - Effect Thrashing due to Missing Memoization & State Dependencies
**Learning:** Functions that generate new arrays (like `computeMessagesFromPath`) must be memoized when used as dependencies in `useEffect`. Furthermore, combining scroll listener binding with state variables (like `isAtBottom`) in a single `useEffect` causes continuous bind/unbind thrashing during scroll events.
**Action:** When tracking list scroll position: 1) Memoize arrays returned by computational functions; 2) Bind the native scroll listener exactly once with an empty dependency array `[]` and `{ passive: true }`; 3) Use functional state updates (`setState(prev => ...)`) to avoid dependency inclusion; 4) Check scroll state on prop updates in a separate, isolated `useEffect`.
