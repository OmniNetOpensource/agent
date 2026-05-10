# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.
## 2026-03-10 - Unnecessary Scroll Listener Re-binding in MessageLists
**Learning:** Re-evaluating lists via functions like `computeMessagesFromPath` on every render creates a new array reference. If this array is used in the dependency array of a `useEffect` that attaches a scroll listener, the listener is pointlessly torn down and re-attached on every unrelated state change (e.g. `setIsAtBottom`).
**Action:** Memoize array-returning calculations with `useMemo`. When tracking scroll state, bind the event listener exactly once in a `useEffect` with an empty dependency array `[]`. Use a separate effect to react to array reference changes, and use functional state updates `setX(prev => ...)` inside listeners to avoid stale closures and dependency churn.
