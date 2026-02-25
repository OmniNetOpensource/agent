# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-02-28 - Optimizing Large Lists with Shallow Selectors
**Learning:** Subscribing to a large array (like `messages`) in a list component (like `MessageList`) causes re-renders on *any* change, even if the change is irrelevant to the current view (e.g., in a different branch).
**Action:** Use `useShallow` with a selector that computes the specific subset of data needed for rendering. This ensures the component only re-renders when the *computed* result changes, not when the source data changes.
