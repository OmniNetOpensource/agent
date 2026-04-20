# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2026-01-29 - Zustand Selector Optimization in Message Lists
**Learning:** Selecting the entire state object (or large sub-objects) in list items causes all items to re-render when that state changes, even if the item doesn't care about the new value.
**Action:** Always use granular selectors (returning primitives like booleans) in list items to leverage Zustand's strict equality checks and prevent unnecessary re-renders.

## 2026-02-24 - Derived Object Props Breaking Memoization
**Learning:** Calculating derived objects (like `branchInfo`) inside a parent's render loop (e.g., `MessageList`) creates new references on every render. This defeats `React.memo`'s default shallow comparison in child components, causing unnecessary re-renders of the entire list during frequent updates (like streaming).
**Action:** Implement a custom equality function for `React.memo` in list item components to deeply compare derived objects, or memoize the derived object calculation itself.

## 2025-02-24 - React Compiler Unstable Return Values
**Learning:** Even with React Compiler enabled, functions that compute arrays from external state (like `computeMessagesFromPath` in `MessageList.tsx`) return a new reference on every render. If these results are passed to components or used in `useEffect` dependency arrays, they cause effect thrashing and cascade rendering.
**Action:** Explicitly memoize (via `useMemo` or `useShallow`) derived data computations that return arrays/objects before passing them to effects or child components, even if React Compiler is active.

## 2025-02-24 - Scroll Listener Thrashing
**Learning:** Binding scroll listeners in a `useEffect` that depends on frequently updating state (like `messages` or `isAtBottom` during message streaming) causes severe performance issues because the native listener is constantly unmounted and remounted.
**Action:** Separate listener binding from state updates. Bind the native scroll listener exactly once (`useEffect(..., [])`) with `{ passive: true }`, use functional state updates (`setState(prev => ...)`), and handle state-driven checks (like keeping scroll bottom during streaming) in a completely separate effect.
