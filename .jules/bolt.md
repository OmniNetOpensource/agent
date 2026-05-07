# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.
## 2026-05-07 - MessageList Scroll Tracking Effect Separation
**Learning:** Bloated `useEffect` hooks that combine event listener binding with state updates and complex dependencies (like `messages`) cause thrashing. Binding the scroll event listener inside an effect that depends on `messages` forces the browser to unbind and re-bind the listener on every single token streamed, causing layout jank.
**Action:** Separate side effects by responsibility. Use one `useEffect` with an empty dependency array `[]` and `{ passive: true }` to bind the listener once. Use conditional functional updates (`setState(prev => prev !== new ? new : prev)`) to break closure dependencies. Use a separate `useEffect` bound to `[messages]` strictly for layout checks when new data arrives.
