# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-04 - ResizeObserver for Reliable Scroll Tracking During Streaming
**Learning:** Native `scroll` events do not fire when an element's content grows downwards (e.g. streaming chat messages) without the user actually scrolling. If a `useEffect` tracking scroll position depends on the changing content (like the `messages` array), it causes constant unbinding and rebinding of event listeners on every frame, leading to CPU thrashing.
**Action:** Use a `ResizeObserver` on the content container alongside the scroll listener, and use an empty dependency array `[]` for the `useEffect`. Use functional state updates (`set(prev => ...)`) to avoid needing state variables in the dependency array.
