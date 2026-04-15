# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2024-05-18 - [Optimizing MessageList with useMemo and separated side effects]
**Learning:** Even with React Compiler enabled, functions that compute new array references (like `computeMessagesFromPath`) will defeat memoization and cause downstream render thrashing if not explicitly memoized with `useMemo`. Also, complex component interactions like scrolling and streaming responses can lead to constant event listener unbinding/rebinding if state (like `messages` or `isAtBottom`) is included in the dependency array.
**Action:** Use functional state updates to remove boolean flags from dependency arrays, bind native event listeners exactly once (`[]`), add `{ passive: true }` for smoothness, and move position checks driven by dynamic variables (like the `messages` array length/content) into separate, targeted `useEffect` blocks.
