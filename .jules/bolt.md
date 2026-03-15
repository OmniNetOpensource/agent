# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-02-24 - Scroll Listener Thrashing & Computed Array References in React
**Learning:** Returning un-memoized derived arrays (like `computeMessagesFromPath`) in components causes cascading re-renders across child components. Additionally, using volatile state (like `isAtBottom` and un-memoized `messages`) in `useEffect` dependency arrays for DOM events (e.g., scroll listeners) results in expensive listener thrashing during high-frequency events like streaming.
**Action:** Always wrap expensive or derived array computations in `useMemo`. For scroll tracking, bind the event listener exactly once (`useEffect(..., [])`) with `{ passive: true }` and use functional state updates (`setState(prev => ...)`) to avoid needing state dependencies. Move length-based checks into separate, isolated effects.
