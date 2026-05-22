# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-05 - Event Listener Thrashing in Continuous Rendering
**Learning:** Attaching native DOM event listeners (like 'scroll') inside a `useEffect` that depends on frequently updating state (like `messages` or derived objects during SSE streaming) causes significant main thread overhead by constantly removing and re-attaching the listener. Furthermore, passing an un-memoized derived array reference (like `computeMessagesFromPath` results) directly into dependency arrays or child components defeats React.memo optimizations.
**Action:** Always wrap derived objects/arrays that are recomputed on every render in `useMemo`. For native event listeners, use an empty dependency array `[]` where possible by utilizing functional state updates (`setState(prev => ...)`) to access current state safely without creating closures that require frequent updates. Also always utilize `{ passive: true }` for scroll events.
