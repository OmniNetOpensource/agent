# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-05 - Scroll Listener Thrashing in Streaming Lists
**Learning:** Attaching native `scroll` event listeners inside a `useEffect` that depends on frequently updating state (like a streaming `messages` array) causes the listener to be destroyed and re-created constantly, causing layout thrashing and UI jank.
**Action:** Bind scroll listeners exactly once using an empty dependency array `[]`. Use functional state updates (`setState(prev => ...)`) to avoid needing state variables in the dependency array. Handle state-driven position checks (like checking if we're still at the bottom when a new message arrives) in a separate, lightweight `useEffect` that depends only on `messages.length`.
