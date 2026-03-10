# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-10 - Unnecessary Array Generation and Scroll Listener Thrashing
**Learning:** `computeMessagesFromPath` returns a new array reference on every call. Using it directly in list component bodies creates new array references on every re-render (e.g., from `isAtBottom` state changes), bypassing child memoization and triggering effect hooks repeatedly. Additionally, reading closure variables (like `isAtBottom` and `messages`) in scroll event listeners requires `useEffect` to unbind and rebind on every update, causing thrashing during scrolling and fast message streaming.
**Action:** Always wrap `computeMessagesFromPath` in a `useMemo` with minimal dependencies (`allMessages`, `currentPath`). For list scroll tracking, use functional state updates (e.g., `setIsAtBottom(prev => prev !== atBottom ? atBottom : prev)`) and bind scroll listeners exactly once with an empty dependency array `[]`.
