# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2025-05-18 - Scroll Event Listener Re-binding in React
**Learning:** Using states like `isAtBottom` or derived derived arrays like `messages` in a `useEffect` dependency array that binds a `scroll` event listener causes the listener to be removed and re-added on almost every scroll tick or message update, leading to significant performance overhead and potential jank.
**Action:** Always separate the `scroll` event listener binding (using an empty dependency array `[]` and functional state updates `setState(prev => ...)`) from the logic that needs to run when dependencies (like `messages`) change.
