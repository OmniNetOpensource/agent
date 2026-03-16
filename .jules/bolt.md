# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-05 - Event Listener Thrashing in Streaming Lists
**Learning:** Binding scroll event listeners directly to arrays that change frequently (like `messages` during SSE streaming) causes the browser to constantly remove and re-add the listener. This leads to severe performance degradation and UI thrashing. Furthermore, generating new array references on every render (e.g., via `computeMessagesFromPath`) triggers unnecessary effects downstream.
**Action:** Always wrap derived list computations in `useMemo`. When tracking scroll position, use an empty dependency array `[]` for the event listener to bind it exactly once. Use functional state updates (e.g., `setState(prev => ...)` ) to prevent trapping stale state inside the listener closure.
