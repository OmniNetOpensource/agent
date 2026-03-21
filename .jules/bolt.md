# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2025-02-28 - Memoization & Scroll Event Thrashing in MessageLists
**Learning:** `computeMessagesFromPath` returns a new array reference on every call. Using it directly inside a component causes unnecessary re-renders downstream, particularly when it's passed as a dependency array in `useEffect`. Furthermore, attaching scroll listeners in `useEffect` without an empty dependency array (or relying on state closures) creates severe event listener thrashing during frequent updates like message streaming.
**Action:** Wrap derived arrays like `messages` with `useMemo` when the generation function returns new references. For scroll tracking, bind `addEventListener('scroll', ...)` exactly once with an empty dependency array `[]` and `{ passive: true }`. Manage scroll state (like `isAtBottom`) using functional state updates (`setState(prev => ...)`) to avoid needing state variables in the listener's closure.
