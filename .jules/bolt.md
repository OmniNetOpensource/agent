# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.
## 2024-05-18 - Prevent React effect thrashing for fast-updating native scroll listeners
**Learning:** Next.js (React Compiler) cannot automatically optimize functions returning new array references (like `computeMessagesFromPath`). If passed unwrapped into a `useEffect` dependency array, they cause aggressive thrashing of DOM event listeners like `scroll` during frequent updates (e.g., SSE streaming), causing performance degradation and jank.
**Action:** When a hook dependency inherently returns new array references, explicitly wrap it in `useMemo`. When dealing with native DOM scroll events that observe state, separate the one-time event binding (using an empty `[]` dependency array and `{ passive: true }`) from the state-synchronization logic (checking scroll height against the memoized dependency array), utilizing functional state updates (`setX(prev => ...)`) to eliminate stale closures.
