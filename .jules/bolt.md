# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.
## 2026-03-02 - React Hooks Event Listener Thrashing
**Learning:** Binding event listeners inside `useEffect` with rapidly changing dependencies (like a `messages` array during streaming or a boolean tracking scroll position) causes the browser to constantly tear down and rebuild the event listeners, leading to performance degradation and stuttering UI.
**Action:** Always bind event listeners (like scroll or resize) once with an empty dependency array `[]`. If the handler needs to update state based on its execution, use functional state updates (e.g. `setState(prev => ...)`). Handle reactive synchronizations (like updating position status when new elements are appended) in a separate `useEffect` observing the dynamic data.
