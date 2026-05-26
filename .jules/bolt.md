# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2026-03-02 - React Effect Listener Thrashing & Missing Memoization
**Learning:** `useEffect` hooks tracking scroll position in lists can severely thrash if they depend on fast-changing data (like `messages` during streaming), causing listeners to unbind/rebind 100+ times per second. Additionally, derived list generation functions (like `computeMessagesFromPath`) return new array references every render, breaking downstream component memoization if not explicitly wrapped in `useMemo`, even with React Compiler enabled.
**Action:** Always bind list scroll listeners with an empty dependency array `[]` using functional state updates. Keep a separate, lightweight `useEffect` for syncing position when data changes. Always `useMemo` array derivatives generated outside of Zustand selectors.
