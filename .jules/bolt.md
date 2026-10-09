# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-01 - Scroll Listener Thrashing from Streaming Data
**Learning:** In streaming chat interfaces, adding frequently changing data (like the `messages` array) to a scroll listener's `useEffect` dependency list causes the listener to be constantly removed and re-added. This thrashing blocks the main thread and ruins scroll performance during response generation.
**Action:** Isolate scroll listeners in an empty dependency array (`[]`) with `{ passive: true }`. Use functional state updates (e.g., `setState(prev => ...)`) to avoid needing the state in the dependency array, and use a separate `useEffect` observing `[messages.length]` for layout changes that occur without scrolling.
