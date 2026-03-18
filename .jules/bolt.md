# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-18 - Scroll Event Listener and Derived State Optimization
**Learning:** Binding scroll event listeners directly inside a `useEffect` that depends on frequently changing state (like `messages` or `isAtBottom`) causes severe listener thrashing, tearing down and recreating the listener on every update (e.g., during message streaming). Also, calculating derived state like `computeMessagesFromPath` directly in the render body creates a new array reference on every render, triggering unnecessary downstream re-renders and effect executions.
**Action:**
1. Always bind native scroll event listeners exactly once using an empty dependency array `[]`. Use `{ passive: true }` for smooth scrolling.
2. Use functional state updates (e.g., `setState(prev => ...)`) inside event listeners to avoid needing state variables in the dependency array.
3. Wrap expensive derived state calculations that return new objects/arrays in `useMemo` to preserve reference equality across renders unless inputs change.
