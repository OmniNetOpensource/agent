# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-02-24 - Streaming Render Optimization via ID Arrays
**Learning:** When displaying dynamic lists (e.g., chat streaming) selecting the full array of complex objects into a parent component forces it (and potentially all its children) to re-render on every update. By instead selecting only an array of IDs in the parent, and letting individual child "container" components select their own specific data by ID, we reduce the complexity of frequent re-renders from O(N) to O(1).
**Action:** To optimize large lists, map over an array of IDs in the parent component and create a container component (like `MessageItemContainer`) to handle data retrieval locally and memoize primitive state dependencies (via `useShallow`).
