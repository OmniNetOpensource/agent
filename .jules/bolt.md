# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-02-25 - Scroll Listener Thrashing & Passive Listeners
**Learning:** Attaching scroll listeners inside a `useEffect` that depends on frequently updating state (like `messages` during SSE streaming) causes the listener to be constantly detached and re-attached (thrashing). This severely impacts UI performance during streaming. Furthermore, missing the `{ passive: true }` option on native scroll event listeners forces the browser's scrolling thread to wait for JS execution.
**Action:** Bind native scroll listeners exactly once using an empty dependency array `[]` and `passive: true`. Use functional state updates (`setState(prev => ...)`) to access the latest state without adding it to the dependency array, and handle position synchronization related to content height changes in a separate `useEffect`.
