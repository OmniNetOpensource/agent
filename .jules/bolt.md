# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.
## 2026-03-04 - Effect Thrashing due to missing useMemo
**Learning:** Helper functions (like computeMessagesFromPath) that return new array/object references on every call must be memoized when used as dependencies in hooks or passed to memoized child components, otherwise they cause severe downstream effect thrashing and unnecessary re-renders.
**Action:** Wrap such helper function calls in `useMemo` and track their inputs in the dependency array.
## 2026-03-04 - Scroll Listener Optimization
**Learning:** Re-binding native event listeners (like scroll) frequently (e.g., when messages array length changes) causes performance degradation.
**Action:** Bind native scroll event listeners exactly once using an empty dependency array `[]`, use functional state updates to prevent stale closures, and use `{ passive: true }` for better scrolling performance. Handle scroll re-calculation triggered by content changes in a separate useEffect.
